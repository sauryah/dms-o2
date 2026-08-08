// Package dieset implements the business logic for the Die Set Planner tool.
//
// A die series is a list of die sizes; every occurrence of a size represents one
// die required for ONE complete set. Given the current die inventory, the engine
// computes how many complete sets can be assembled, which dies are bottlenecks,
// how much inventory remains after production, and which inventory is unused.
//
// All comparisons happen against a normalized integer key measured in
// thousandths of a millimetre (e.g. "0.620", ".620" and "0.6200" all map to 620)
// so unsafe floating-point equality is never used for die sizes.
package dieset

import (
	"fmt"
	"math"
	"sort"
	"strconv"
	"strings"
)

// InventoryItem is a single inventory row: a die size plus the stored quantity.
type InventoryItem struct {
	DieSize  string `json:"die_size"`
	Quantity int64  `json:"quantity"`
}

// sanitizeDieSizeString cleans raw input by stripping trailing punctuation,
// unit labels ("mm", "in", "inch", "inches", '"'), and converting European decimal commas.
func sanitizeDieSizeString(raw string) string {
	val := strings.TrimSpace(raw)
	val = strings.TrimSuffix(val, ";")
	val = strings.TrimSuffix(val, ",")

	lower := strings.ToLower(val)
	unitSuffixes := []string{"mm", "in", "inch", "inches", "\""}
	for _, u := range unitSuffixes {
		if strings.HasSuffix(lower, u) {
			val = strings.TrimSpace(val[:len(val)-len(u)])
			break
		}
	}

	if strings.Contains(val, ",") && !strings.Contains(val, ".") {
		val = strings.ReplaceAll(val, ",", ".")
	}

	if strings.HasPrefix(val, ".") {
		val = "0" + val
	}
	return val
}

// NormalizeDieSize converts a die size string into a hundred-thousandths integer key.
// "0.620", ".620", "0.6200", "620", "0.620mm", "0,620" all normalize to 62000.
// Fine wire sizes up to 5 decimal places (e.g. 0.0625) are preserved exactly as 6250.
func NormalizeDieSize(raw string) (int64, error) {
	val := sanitizeDieSizeString(raw)
	if val == "" {
		return 0, fmt.Errorf("die size is empty")
	}

	num, err := strconv.ParseFloat(val, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid die size %q: must be a positive number", strings.TrimSpace(raw))
	}
	if num <= 0 {
		return 0, fmt.Errorf("invalid die size %q: must be greater than zero", strings.TrimSpace(raw))
	}
	if math.IsNaN(num) || math.IsInf(num, 0) {
		return 0, fmt.Errorf("invalid die size %q: not a finite number", strings.TrimSpace(raw))
	}

	return int64(math.Round(num * 100000.0)), nil
}

// FormatDieSize renders a hundred-thousandths key back into its canonical display string.
func FormatDieSize(hundredThousands int64) string {
	val := float64(hundredThousands) / 100000.0
	formatted := fmt.Sprintf("%.5f", val)
	formatted = strings.TrimRight(formatted, "0")
	parts := strings.Split(formatted, ".")
	if len(parts) == 2 {
		for len(parts[1]) < 3 {
			parts[1] += "0"
		}
		return parts[0] + "." + parts[1]
	}
	return formatted + ".000"
}

// Requirement is the per-die detail row returned in the result table.
type Requirement struct {
	DieSize        string `json:"die_size"`
	RequiredPerSet int64  `json:"required_per_set"`
	Available      int64  `json:"available"`
	PossibleSets   int64  `json:"possible_sets"`
	Used           int64  `json:"used"`
	Remaining      int64  `json:"remaining"`
	IsBottleneck   bool   `json:"is_bottleneck"`
	IsMissing      bool   `json:"is_missing"`
}

// Bottleneck describes one die that limits the total number of complete sets.
type Bottleneck struct {
	DieSize        string `json:"die_size"`
	RequiredPerSet int64  `json:"required_per_set"`
	Available      int64  `json:"available"`
	PossibleSets   int64  `json:"possible_sets"`
}

// InventoryLine is an inventory entry for reporting (missing or unused dies).
type InventoryLine struct {
	DieSize  string `json:"die_size"`
	Quantity int64  `json:"quantity"`
}

// ProcurementItem is a die that must be purchased to reach a target number of
// sets that exceeds the current producible maximum.
type ProcurementItem struct {
	DieSize     string `json:"die_size"`
	RequiredPerSet int64  `json:"required_per_set"`
	TargetReach int64  `json:"target_need"`
	Available   int64  `json:"available"`
	Procure     int64  `json:"procure"`
}

// Result is the structured, deterministic outcome of a capacity calculation.
type Result struct {
	MaximumSets     int64          `json:"maximum_sets"`
	TotalDiesPerSet int64          `json:"total_dies_per_set"`
	Requirements    []Requirement  `json:"requirements"`
	Bottlenecks     []Bottleneck   `json:"bottlenecks"`
	Missing         []InventoryLine `json:"missing_dies"`
	UnusedInventory []InventoryLine `json:"unused_inventory"`
	Procurement     []ProcurementItem `json:"procurement,omitempty"`
	TargetSets      int64          `json:"target_sets,omitempty"`
	Warnings        []string       `json:"warnings"`
}

// normalizeInventoryToMap validates and aggregates inventory rows into a
// thousandths-keyed availability map.
func normalizeInventoryToMap(inventory []InventoryItem) (map[int64]int64, error) {
	invMap := make(map[int64]int64, len(inventory))
	for _, it := range inventory {
		if it.Quantity < 0 {
			return nil, fmt.Errorf("invalid quantity %d for die %q: quantity cannot be negative", it.Quantity, it.DieSize)
		}
		key, err := NormalizeDieSize(it.DieSize)
		if err != nil {
			return nil, err
		}
		invMap[key] += it.Quantity
	}
	return invMap, nil
}

// requiredCountsByKey tallies how many dies of each size one complete set needs.
func requiredCountsByKey(series []string) (map[int64]int64, error) {
	requiredCounts := make(map[int64]int64, len(series))
	for _, raw := range series {
		key, err := NormalizeDieSize(raw)
		if err != nil {
			return nil, err
		}
		requiredCounts[key]++
	}
	return requiredCounts, nil
}

// sortedKeys returns the thousandths keys in ascending size order.
func sortedKeys(m map[int64]int64) []int64 {
	keys := make([]int64, 0, len(m))
	for key := range m {
		keys = append(keys, key)
	}
	sort.Slice(keys, func(i, j int) bool { return keys[i] < keys[j] })
	return keys
}

// CalculateSeriesCapacity computes how many complete sets the given inventory
// can produce for the supplied series.
//
// inventory: repeatable rows of (die size -> available quantity); duplicate
// sizes are aggregated.
// series: every occurrence of a die size equals one die required per set.
func CalculateSeriesCapacity(inventory []InventoryItem, series []string) (*Result, error) {
	return calculateCapacity(inventory, series, 0)
}

// CalculateSeriesCapacityForTarget computes the capacity plus a procurement
// plan for a target beyond current capacity: same as CalculateSeriesCapacity
// when targetSets <= 0.
func CalculateSeriesCapacityForTarget(inventory []InventoryItem, series []string, targetSets int64) (*Result, error) {
	if targetSets < 0 {
		return nil, fmt.Errorf("target sets cannot be negative")
	}
	if targetSets > 1000000000 {
		return nil, fmt.Errorf("target sets exceeds maximum limit of 1,000,000,000")
	}
	return calculateCapacity(inventory, series, targetSets)
}

// calculateCapacity is the shared engine core. When targetSets > 0 it also
// emits the procurement list: how many of each die size must be purchased to
// reach the target number of complete sets.
func calculateCapacity(inventory []InventoryItem, series []string, targetSets int64) (*Result, error) {
	if len(series) == 0 {
		return nil, fmt.Errorf("series is empty: paste at least one die size")
	}

	invMap, err := normalizeInventoryToMap(inventory)
	if err != nil {
		return nil, err
	}
	requiredCounts, err := requiredCountsByKey(series)
	if err != nil {
		return nil, err
	}

	requiredKeys := sortedKeys(requiredCounts)

	// First pass: compute possible sets per required die using integer floor
	// division and the global minimum.
	var maxSets int64 = -1
	possible := make(map[int64]int64, len(requiredKeys))
	for _, key := range requiredKeys {
		p := invMap[key] / requiredCounts[key] // integer floor
		possible[key] = p
		if p < maxSets || maxSets < 0 {
			maxSets = p
		}
	}
	if maxSets < 0 {
		maxSets = 0
	}

	requirements := make([]Requirement, 0, len(requiredKeys))
	bottlenecks := make([]Bottleneck, 0, len(requiredKeys))
	missing := make([]InventoryLine, 0, len(requiredKeys))
	for _, key := range requiredKeys {
		req := requiredCounts[key]
		avail := invMap[key]
		p := possible[key]
		used := maxSets * req
		remaining := avail - used
		row := Requirement{
			DieSize:        FormatDieSize(key),
			RequiredPerSet: req,
			Available:      avail,
			PossibleSets:   p,
			Used:           used,
			Remaining:      remaining,
			IsBottleneck:   p == maxSets,
			IsMissing:      avail == 0,
		}
		requirements = append(requirements, row)

		if row.IsBottleneck {
			bottlenecks = append(bottlenecks, Bottleneck{
				DieSize:        row.DieSize,
				RequiredPerSet: req,
				Available:      avail,
				PossibleSets:   p,
			})
		}
		if avail == 0 {
			missing = append(missing, InventoryLine{DieSize: row.DieSize, Quantity: req})
		}
	}

	// Unused inventory: sizes present but never required by the series.
	unused := make([]InventoryLine, 0, len(invMap))
	for key, qty := range invMap {
		if _, ok := requiredCounts[key]; !ok {
			unused = append(unused, InventoryLine{DieSize: FormatDieSize(key), Quantity: qty})
		}
	}
	sort.Slice(unused, func(i, j int) bool { return unused[i].DieSize < unused[j].DieSize })

	res := &Result{
		MaximumSets:     maxSets,
		TotalDiesPerSet: int64(len(series)),
		Requirements:    requirements,
		Bottlenecks:     bottlenecks,
		Missing:         missing,
		UnusedInventory: unused,
	}

	// Procurement plan: when a target number of sets is requested, compute how
	// many of each die size must be purchased to reach it. Only dies with a
	// shortfall are listed, ordered by size ascending.
	if targetSets > 0 {
		res.TargetSets = targetSets
		var procureTotal int64
		procure := make([]ProcurementItem, 0, len(requiredKeys))
		for _, key := range requiredKeys {
			need := targetSets * requiredCounts[key]
			shortfall := need - invMap[key]
			if shortfall <= 0 {
				continue
			}
			procureTotal += shortfall
			procure = append(procure, ProcurementItem{
				DieSize:     FormatDieSize(key),
				RequiredPerSet: requiredCounts[key],
				Available:   invMap[key],
				TargetReach: need,
				Procure:     shortfall,
			})
		}
		if len(procure) > 0 {
			res.Procurement = procure
			res.Warnings = append(res.Warnings, fmt.Sprintf(
				"To reach %d complete sets, procure %d %s: %s",
				targetSets,
				procureTotal,
				pluralize("die", int(procureTotal)),
				formatProcureSummary(procure),
			))
		} else {
			res.Warnings = append(res.Warnings, fmt.Sprintf(
				"Target of %d sets already achievable with current inventory (maximum is %d).",
				targetSets, maxSets,
			))
		}
	}

	if len(missing) > 0 {
		res.Warnings = append(res.Warnings, fmt.Sprintf(
			"%d required %s missing from inventory; production is blocked until they are stocked",
			len(missing), pluralize("die", len(missing)),
		))
	}

	return res, nil
}

// formatProcureSummary renders a compact human readable procurement summary,
// e.g. "0.620 ×3, 0.625 ×5".
func formatProcureSummary(items []ProcurementItem) string {
	parts := make([]string, len(items))
	for i, it := range items {
		parts[i] = fmt.Sprintf("%s ×%d", it.DieSize, it.Procure)
	}
	return strings.Join(parts, ", ")
}

func pluralize(word string, n int) string {
	if n == 1 {
		return word
	}
	return word + "s"
}