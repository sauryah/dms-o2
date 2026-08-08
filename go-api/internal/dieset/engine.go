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

// NormalizeDieSize converts a die size string into a thousandths integer key.
// "0.620", ".620", "0.6200", "620" all normalize to 620. Returns an error when
// the value is not a parseable positive decimal.
func NormalizeDieSize(raw string) (int64, error) {
	val := strings.TrimSpace(raw)
	if val == "" {
		return 0, fmt.Errorf("die size is empty")
	}

	if strings.HasPrefix(val, ".") {
		val = "0" + val
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

	return int64(math.Round(num * 1000)), nil
}

// FormatDieSize renders a thousandths key back into its canonical display string.
func FormatDieSize(thousands int64) string {
	return fmt.Sprintf("%.3f", float64(thousands)/1000.0)
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

// Result is the structured, deterministic outcome of a capacity calculation.
type Result struct {
	MaximumSets     int64          `json:"maximum_sets"`
	TotalDiesPerSet int64          `json:"total_dies_per_set"`
	Requirements    []Requirement  `json:"requirements"`
	Bottlenecks     []Bottleneck   `json:"bottlenecks"`
	Missing         []InventoryLine `json:"missing_dies"`
	UnusedInventory []InventoryLine `json:"unused_inventory"`
	Warnings        []string       `json:"warnings"`
}

// CalculateSeriesCapacity computes how many complete sets the given inventory
// can produce for the supplied series.
//
// inventory: repeatable rows of (die size -> available quantity); duplicate
// sizes are aggregated.
// series: every occurrence of a die size equals one die required per set.
func CalculateSeriesCapacity(inventory []InventoryItem, series []string) (*Result, error) {
	if len(series) == 0 {
		return nil, fmt.Errorf("series is empty: paste at least one die size")
	}

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

	requiredCounts := make(map[int64]int64, len(series))
	for _, raw := range series {
		key, err := NormalizeDieSize(raw)
		if err != nil {
			return nil, err
		}
		requiredCounts[key]++
	}

	requiredKeys := make([]int64, 0, len(requiredCounts))
	for key := range requiredCounts {
		requiredKeys = append(requiredKeys, key)
	}
	// Deterministic ordering: sort required dies by size ascending.
	sort.Slice(requiredKeys, func(i, j int) bool { return requiredKeys[i] < requiredKeys[j] })

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

	if len(missing) > 0 {
		res.Warnings = append(res.Warnings, fmt.Sprintf(
			"%d required %s missing from inventory; production is blocked until they are stocked",
			len(missing), pluralize("die", len(missing)),
		))
	}

	return res, nil
}

func pluralize(word string, n int) string {
	if n == 1 {
		return word
	}
	return word + "s"
}