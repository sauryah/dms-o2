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

// NormalizeDieSize returns the thousandths integer key plus the canonical
// formatted display string for a die size like "0.620", ".620" or "0.6200".
export function normalizeDieSize(raw: string): { thousands: number | null; display: string } {
  const val = raw.trim()
  const cleaned = val.startsWith('.') ? `0${val}` : val
  if (!cleaned) return { thousands: null, display: '' }
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { thousands: null, display: val }
  const num = Number.parseFloat(cleaned)
  if (!Number.isFinite(num) || num <= 0) return { thousands: null, display: val }
  return { thousands: Math.round(num * 1000), display: cleaned }
}

export function formatDieSize(thousands: number): string {
  return (thousands / 1000).toFixed(3)
}

// Split raw pasted text into whitespace-separated tokens (handles tabs, spaces,
// spreadsheet cell boundaries) while preserving line numbers for friendly errors.
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
  const { thousands } = normalizeDieSize(raw)
  return thousands !== null
}

// parseInventoryInput consumes spreadsheet-style "dieSize  quantity" rows.
//
// Parsing is line-based so a die documented without a quantity never steals the
// quantity or size of the following line. Each line is interpreted as:
//   - one pair per line          "0.620    4"
//   - multiple pairs per line    "0.620  4  0.625  6"   (copied cells)
//   - a lone die size            "0.200"  -> stock 0 with a warning
//   - a header row               "Die Size  Qty"        (skipped)
// Duplicate sizes are aggregated; the backend sums quantities authoritatively.
export function parseInventoryInput(rawText: string): InventoryParseResult {
  const lines = rawText.split(/\r?\n/)
  const rows: ParsedInventoryRow[] = []
  const errors: string[] = []
  const warnings: string[] = []
  let missingQtyCount = 0
  let mergedCount = 0

  // appendRow appends or merges a row by normalized die size (thousandths),
  // aggregating duplicate inventory entries.
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

    // Header row: every token is a non-numeric label (e.g. "Die Size", "Qty").
    const isHeaderRow =
      tokens.every((t) => !isQuantityToken(t) && normalizeDieSize(t).thousands === null)
    if (isHeaderRow) continue

    // A die-only line: a single token, or every token carries a decimal point
    // ("0.200 0.205 0.210"). Pure integers are treated as quantities, so a line
    // like "0.620 4" takes the pair path below. Each of these dies was
    // documented in the series/sheet without a recorded quantity.
    const looksLikeDiesOnly =
      (tokens.length === 1 && normalizeDieSize(tokens[0]).thousands !== null) ||
      (tokens.length > 1 &&
        tokens.every((t) => t.includes('.') && normalizeDieSize(t).thousands !== null))
    if (looksLikeDiesOnly) {
      for (const sizeTok of tokens) {
        const display = formatDieSize(normalizeDieSize(sizeTok).thousands!)
        missingQtyCount++
        appendRow(display, 0)
      }
      continue
    }

    // Otherwise walk the line as (size, quantity) pairs.
    for (let i = 0; i < tokens.length; i += 2) {
      const sizeTok = tokens[i]
      const qtyTok = tokens[i + 1]

      const info = normalizeDieSize(sizeTok)
      if (info.thousands === null) {
        errors.push(`Line ${ln + 1}: invalid die size "${sizeTok}". Must be a positive number like 0.620.`)
        continue
      }
      const display = formatDieSize(info.thousands)

      if (qtyTok === undefined) {
        missingQtyCount++
        appendRow(display, 0)
        continue
      }

      if (!isQuantityToken(qtyTok)) {
        errors.push(
          `Line ${ln + 1}: invalid quantity "${qtyTok}". Quantity must be a non-negative number.`,
        )
        continue
      }

      const qty = Number.parseInt(qtyTok, 10)
      if (Number.isNaN(qty) || qty < 0) {
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

// parseSeriesInput treats every token as one die occurrence (vertical, horizontal
// or spreadsheet layouts). Duplicates are counted per occurrence — never rejected.
export function parseSeriesInput(rawText: string): SeriesParseResult {
  const tokens = tokenize(rawText)
  const sizes: string[] = []
  const errors: string[] = []

  if (tokens.length === 0) {
    return { sizes: [], errors: ['Series is empty. Paste at least one die size.'] }
  }

  for (const { token, line } of tokens) {
    const { thousands } = normalizeDieSize(token)
    if (thousands === null) {
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
  return formatDieSize(normalizeDieSize(raw).thousands!)
}

function isQuantityToken(token: string): boolean {
  if (!/^[+-]?\d+$/.test(token)) return false
  const n = Number.parseInt(token, 10)
  return Number.isFinite(n)
}