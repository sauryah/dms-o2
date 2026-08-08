package dieset

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseInventoryText parses spreadsheet-style pasted inventory. Parsing is
// line-based so a die documented without a quantity never steals the quantity
// or size of the following row. Each line is interpreted as:
//   - one pair per line          "0.620    4"
//   - multiple pairs per line    "0.620  4  0.625  6"   (copied cells)
//   - a lone die size            "0.200"  -> stock 0 with a warning
//   - a header row               "Die Size  Qty"        (skipped)
//
// Duplicate sizes are aggregated. Returns the parsed rows plus friendly
// per-line errors and aggregate warnings.
func ParseInventoryText(raw string) ([]InventoryItem, []string, []string) {
	var rows []InventoryItem
	var errors, warnings []string

	var missingQty, merged int
	keyIndex := make(map[int64]int) // thousandths key -> position in rows

	addRow := func(thousands, qty int64) {
		if idx, ok := keyIndex[thousands]; ok {
			rows[idx].Quantity += qty
			merged++
			return
		}
		keyIndex[thousands] = len(rows)
		rows = append(rows, InventoryItem{DieSize: FormatDieSize(thousands), Quantity: qty})
	}

	lines := strings.Split(raw, "\n")
	anyLine := false
	for _, l := range lines {
		if strings.TrimSpace(l) != "" {
			anyLine = true
			break
		}
	}
	if !anyLine {
		errors = append(errors, "Inventory is empty. Paste die size and quantity rows.")
		return rows, errors, warnings
	}

	for ln, rawLine := range lines {
		trimmed := strings.TrimSpace(rawLine)
		if trimmed == "" {
			continue
		}
		tokens := strings.Fields(trimmed)

		isHeader := true
		for _, t := range tokens {
			if isQuantity(t) || NormalizeDieSizeOrNil(t) != nil {
				isHeader = false
				break
			}
		}
		if isHeader {
			continue
		}

		// A die-only line: a single die token, or every token carries a decimal
		// point ("0.200 0.205 0.210"). Pure integers are treated as quantities,
		// so a line like "0.620 4" takes the pair path below.
		diesOnly := len(tokens) == 1 && NormalizeDieSizeOrNil(tokens[0]) != nil
		if !diesOnly && len(tokens) > 1 {
			all := true
			for _, t := range tokens {
				if !strings.Contains(t, ".") || NormalizeDieSizeOrNil(t) == nil {
					all = false
					break
				}
			}
			diesOnly = all
		}
		if diesOnly {
			for _, t := range tokens {
				if th, err := NormalizeDieSize(t); err == nil {
					missingQty++
					addRow(th, 0)
				}
			}
			continue
		}

		// Otherwise walk the line as (size, quantity) pairs.
		for i := 0; i < len(tokens); i += 2 {
			sizeTok := tokens[i]
			th, err := NormalizeDieSize(sizeTok)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Line %d: invalid die size %q. Must be a positive number like 0.620.", ln+1, sizeTok))
				continue
			}
			if i+1 >= len(tokens) {
				missingQty++
				addRow(th, 0)
				continue
			}
			qtyTok := tokens[i+1]
			qty, ok := parseQuantity(qtyTok)
			if !ok {
				errors = append(errors, fmt.Sprintf("Line %d: invalid quantity %q. Quantity must be a non-negative number.", ln+1, qtyTok))
				continue
			}
			addRow(th, qty)
		}
	}

	if missingQty > 0 {
		warnings = append(warnings, fmt.Sprintf(
			"%d %s listed without a quantity; treated as 0 in stock. Add quantities for full accuracy.",
			missingQty, pluralize("die", missingQty),
		))
	}
	if merged > 0 {
		warnings = append(warnings, fmt.Sprintf(
			"%d duplicate die %s found in the inventory; quantities aggregated.",
			merged, pluralize("size", merged),
		))
	}
	if len(rows) == 0 && len(errors) == 0 {
		errors = append(errors, "No valid inventory rows parsed. Each line should look like: 0.620    4")
	}

	return rows, errors, warnings
}

// ParseSeriesText treats every whitespace-separated token as one die occurrence
// (vertical, horizontal or spreadsheet layouts). Duplicates are preserved per
// occurrence — never rejected.
func ParseSeriesText(raw string) ([]string, []string) {
	var sizes []string
	var errors []string
	lines := strings.Split(raw, "\n")
	anyLine := false
	for _, l := range lines {
		if strings.TrimSpace(l) != "" {
			anyLine = true
			break
		}
	}
	if !anyLine {
		return sizes, []string{"Series is empty. Paste at least one die size."}
	}
	for ln, line := range lines {
		for _, tok := range strings.Fields(line) {
			th, err := NormalizeDieSize(tok)
			if err != nil {
				errors = append(errors, fmt.Sprintf("Line %d: invalid die size %q. Must be a positive number such as 0.625.", ln+1, tok))
				continue
			}
			sizes = append(sizes, FormatDieSize(th))
		}
	}
	if len(sizes) == 0 && len(errors) == 0 {
		errors = append(errors, "No valid die sizes parsed.")
	}
	return sizes, errors
}

// NormalizeDieSizeOrNil returns the thousandths key or nil when the token is
// not a valid die size (used for parsing decisions without error strings).
func NormalizeDieSizeOrNil(raw string) *int64 {
	th, err := NormalizeDieSize(raw)
	if err != nil {
		return nil
	}
	return &th
}

// isQuantity reports whether a token is a whole non-negative integer quantity.
func isQuantity(tok string) bool {
	_, ok := parseQuantity(tok)
	return ok
}

// parseQuantity parses a whole non-negative integer quantity token.
func parseQuantity(tok string) (int64, bool) {
	if tok == "" || strings.HasPrefix(tok, "+") || strings.HasPrefix(tok, "-") {
		return 0, false
	}
	for _, r := range tok {
		if r < '0' || r > '9' {
			return 0, false
		}
	}
	qty, err := strconv.ParseInt(tok, 10, 64)
	if err != nil {
		return 0, false
	}
	return qty, true
}