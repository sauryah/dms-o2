// Client-side parsers for the Die Set Planner.
//
// These parse raw pasted text (spreadsheet-style, tabs, spaces, newlines) into
// structured domain objects. They exist for instant UX feedback; the backend Go
// engine is the authoritative validator and calculator.

export interface ParsedInventoryRow {
  dieSize: string
  quantity: number
}

export interface InventoryParseResult {
  rows: ParsedInventoryRow[]
  errors: string[]
  warnings: string[]
}

export interface SeriesParseResult {
  /** die sizes, one entry per die required (duplicates preserved) */
  sizes: string[]
  errors: string[]
}

export function sanitizeDieSizeString(raw: string): string {
  let val = raw.trim()
  val = val.replace(/[;,]$/, '')
  const lower = val.toLowerCase()
  const unitSuffixes = ['mm', 'in', 'inch', 'inches', '"']
  for (const u of unitSuffixes) {
    if (lower.endsWith(u)) {
      val = val.slice(0, val.length - u.length).trim()
      break
    }
  }
  if (val.includes(',') && !val.includes('.')) {
    val = val.replace(',', '.')
  }
  if (val.startsWith('.')) {
    val = `0${val}`
  }
  return val
}

export function isUnitToken(tok: string): boolean {
  const u = tok.trim().toLowerCase().replace(/[;,]$/, '')
  return u === 'mm' || u === 'in' || u === 'inch' || u === 'inches' || u === '"'
}

export function normalizeDieSize(raw: string): { hundredThousands: number | null; thousands: number | null; display: string } {
  let val = raw.trim()
  val = val.replace(/[;,]$/, '')
  const lower = val.toLowerCase()
  
  let isInch = false
  const inchSuffixes = ['in', 'inch', 'inches', '"']
  for (const u of inchSuffixes) {
    if (lower.endsWith(u)) {
      isInch = true
      val = val.slice(0, val.length - u.length).trim()
      break
    }
  }
  
  if (!isInch && lower.endsWith('mm')) {
    val = val.slice(0, val.length - 2).trim()
  }

  if (val.includes(',') && !val.includes('.')) {
    val = val.replace(',', '.')
  }
  if (val.startsWith('.')) {
    val = `0${val}`
  }

  if (!val) return { hundredThousands: null, thousands: null, display: '' }
  if (!/^\d+(\.\d+)?$/.test(val)) return { hundredThousands: null, thousands: null, display: raw }
  let num = Number.parseFloat(val)
  if (!Number.isFinite(num) || num <= 0) return { hundredThousands: null, thousands: null, display: raw }
  
  if (isInch) {
    num = num * 25.4
  }

  const hundredThousands = Math.round(num * 100000)
  return { 
    hundredThousands, 
    thousands: Math.round(num * 1000), 
    display: formatDieSize(hundredThousands) 
  }
}

export function formatDieSize(hundredThousands: number): string {
  const val = hundredThousands / 100000
  const formatted = val.toFixed(5).replace(/0+$/, '')
  const parts = formatted.split('.')
  if (parts.length === 2) {
    while (parts[1].length < 3) {
      parts[1] += '0'
    }
    return `${parts[0]}.${parts[1]}`
  }
  return `${formatted}.000`
}

function tokenize(text: string): Array<{ token: string; line: number }> {
  const tokens: Array<{ token: string; line: number }> = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, idx) => {
    for (const token of line.trim().split(/\s+/)) {
      if (token) tokens.push({ token, line: idx + 1 })
    }
  })
  return tokens
}

export function isValidDieSize(raw: string): boolean {
  const { hundredThousands } = normalizeDieSize(raw)
  return hundredThousands !== null
}

export function parseInventoryInput(rawText: string): InventoryParseResult {
  const lines = rawText.split(/\r?\n/)
  const rows: ParsedInventoryRow[] = []
  const errors: string[] = []
  const warnings: string[] = []
  let missingQtyCount = 0
  let mergedCount = 0

  const appendRow = (display: string, quantity: number) => {
    const existing = rows.find((r) => r.dieSize === display)
    if (existing) {
      existing.quantity += quantity
      mergedCount++
    } else {
      rows.push({ dieSize: display, quantity })
    }
  }

  const anyContent = lines.some((l) => l.trim() !== '')
  if (!anyContent) {
    return { rows: [], errors: ['Inventory is empty. Paste die size and quantity rows.'], warnings: [] }
  }

  for (let ln = 0; ln < lines.length; ln++) {
    const trimmed = lines[ln].trim()
    if (trimmed === '') continue
    const tokens = trimmed.split(/\s+/)

    const isHeaderRow =
      tokens.every((t) => !isQuantityToken(t) && normalizeDieSize(t).hundredThousands === null)
    if (isHeaderRow) continue

    const looksLikeDiesOnly =
      (tokens.length === 1 && normalizeDieSize(tokens[0]).hundredThousands !== null && !isQuantityToken(tokens[0])) ||
      (tokens.length > 1 &&
        tokens.every((t) => !isQuantityToken(t) && t.includes('.') && normalizeDieSize(t).hundredThousands !== null))
    if (looksLikeDiesOnly) {
      for (const sizeTok of tokens) {
        const display = formatDieSize(normalizeDieSize(sizeTok).hundredThousands!)
        missingQtyCount++
        appendRow(display, 0)
      }
      continue
    }

    for (let i = 0; i < tokens.length; ) {
      let sizeTok = tokens[i]
      i++
      if (i < tokens.length && isUnitToken(tokens[i])) {
        sizeTok += ` ${tokens[i]}`
        i++
      }

      const info = normalizeDieSize(sizeTok)
      if (info.hundredThousands === null) {
        errors.push(`Line ${ln + 1}: invalid die size "${sizeTok}". Must be a positive number like 0.620.`)
        continue
      }
      const display = formatDieSize(info.hundredThousands)

      if (i >= tokens.length) {
        missingQtyCount++
        appendRow(display, 0)
        break
      }

      const qtyTok = tokens[i]
      i++

      if (!isQuantityToken(qtyTok)) {
        errors.push(
          `Line ${ln + 1}: invalid quantity "${qtyTok}". Quantity must be a non-negative number.`,
        )
        continue
      }

      const qty = parseQuantityNumber(qtyTok)
      if (qty === null || qty < 0) {
        errors.push(`Line ${ln + 1}: invalid quantity "${qtyTok}". Quantity must be non-negative.`)
        continue
      }

      appendRow(display, qty)
    }
  }

  if (missingQtyCount > 0) {
    warnings.unshift(
      `${missingQtyCount} die${missingQtyCount === 1 ? '' : 's'} listed without a quantity; treated as 0 in stock. Add quantities for full accuracy.`,
    )
  }

  if (mergedCount > 0) {
    warnings.push(
      `${mergedCount} duplicate die size${mergedCount === 1 ? '' : 's'} found in the inventory; quantities aggregated.`,
    )
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push('No valid inventory rows parsed. Each line should look like: 0.620    4')
  }

  return { rows, errors, warnings }
}

export function parseSeriesInput(rawText: string): SeriesParseResult {
  const tokens = tokenize(rawText)
  const sizes: string[] = []
  const errors: string[] = []

  if (tokens.length === 0) {
    return { sizes: [], errors: ['Series is empty. Paste at least one die size.'] }
  }

  for (const { token, line } of tokens) {
    const { hundredThousands } = normalizeDieSize(token)
    if (hundredThousands === null) {
      errors.push(`Line ${line}: invalid die size "${token}". Must be a positive number such as 0.625.`)
      continue
    }
    sizes.push(normalizeDisplay(token))
  }

  if (sizes.length === 0 && errors.length === 0) {
    errors.push('No valid die sizes parsed.')
  }

  return { sizes, errors }
}

function normalizeDisplay(raw: string): string {
  return formatDieSize(normalizeDieSize(raw).hundredThousands!)
}

function parseQuantityNumber(token: string): number | null {
  let tok = token.trim().replace(/[;,]$/, '')
  if (tok.includes('.')) {
    const parts = tok.split('.')
    if (parts.length === 2 && /^0+$/.test(parts[1])) {
      tok = parts[0]
    }
  }
  if (!/^\d+$/.test(tok)) return null
  const n = Number.parseInt(tok, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function isQuantityToken(token: string): boolean {
  return parseQuantityNumber(token) !== null
}