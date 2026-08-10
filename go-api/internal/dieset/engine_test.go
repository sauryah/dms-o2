package dieset

import (
	"strings"
	"testing"
)

func TestNormalizeDieSize(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    int64
		wantErr bool
	}{
		{name: "three decimals", raw: "0.620", want: 62000},
		{name: "leading dot", raw: ".620", want: 62000},
		{name: "extra precision", raw: "0.6200", want: 62000},
		{name: "trailing spaces", raw: "  0.620  ", want: 62000},
		{name: "integer", raw: "620", want: 62000000},
		{name: "single decimal", raw: "1.5", want: 150000},
		{name: "fine wire 4 decimals", raw: "0.0625", want: 6250},
		{name: "unit suffix mm", raw: "0.620mm", want: 62000},
		{name: "unit suffix inch", raw: "0.620 in", want: 1574800},
		{name: "unit suffix quote", raw: "0.620\"", want: 1574800},
		{name: "fine wire inch", raw: "0.024 in", want: 60960},
		{name: "european comma decimal", raw: "0,620", want: 62000},
		{name: "empty", raw: "", wantErr: true},
		{name: "non numeric", raw: "abc", wantErr: true},
		{name: "zero", raw: "0", wantErr: true},
		{name: "negative", raw: "-0.5", wantErr: true},
		{name: "mixed junk", raw: "0.62x", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizeDieSize(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error, got %d", got)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("NormalizeDieSize(%q) = %d, want %d", tt.raw, got, tt.want)
			}
		})
	}
}

func TestFormatDieSize(t *testing.T) {
	tests := []struct {
		in   int64
		want string
	}{
		{62000, "0.620"},
		{62500, "0.625"},
		{6250, "0.0625"},
		{62000000, "620.000"},
		{150000, "1.500"},
	}
	for _, tt := range tests {
		if got := FormatDieSize(tt.in); got != tt.want {
			t.Fatalf("FormatDieSize(%d) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestCalculateSeriesCapacity(t *testing.T) {
	tests := []struct {
		name       string
		inventory  []InventoryItem
		series     []string
		wantSets   int64
		wantReq    map[string]Requirement // keyed by die size
		wantBottle []string
		wantMissing []string
		wantUnused []string
		wantErr    string
	}{
		{
			name: "basic single die",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: 10}},
			series:    []string{"0.620", "0.620"},
			wantSets:  5,
			wantReq: map[string]Requirement{
				"0.620": {DieSize: "0.620", RequiredPerSet: 2, Available: 10, PossibleSets: 5, Used: 10, Remaining: 0, IsBottleneck: true},
			},
			wantBottle: []string{"0.620"},
		},
		{
			name: "multiple dies with one bottleneck",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: 10}, {DieSize: "0.625", Quantity: 6}},
			series:    []string{"0.620", "0.620", "0.625"},
			wantSets:  5,
			wantReq: map[string]Requirement{
				"0.620": {DieSize: "0.620", RequiredPerSet: 2, Available: 10, PossibleSets: 5, Used: 10, Remaining: 0, IsBottleneck: true},
				"0.625": {DieSize: "0.625", RequiredPerSet: 1, Available: 6, PossibleSets: 6, Used: 5, Remaining: 1, IsBottleneck: false},
			},
			wantBottle: []string{"0.620"},
		},
		{
			name:       "missing die yields zero sets",
			inventory:  []InventoryItem{{DieSize: "0.620", Quantity: 10}},
			series:     []string{"0.620", "0.625"},
			wantSets:   0,
wantReq: map[string]Requirement{
				"0.620": {DieSize: "0.620", RequiredPerSet: 1, Available: 10, PossibleSets: 10, Used: 0, Remaining: 10, IsBottleneck: false, IsMissing: false},
				"0.625": {DieSize: "0.625", RequiredPerSet: 1, Available: 0, PossibleSets: 0, Used: 0, Remaining: 0, IsBottleneck: true, IsMissing: true},
			},
			wantBottle: []string{"0.625"},
			wantMissing: []string{"0.625"},
		},
		{
			name: "zero quantity is missing",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: 0}},
			series:    []string{"0.620"},
			wantSets:  0,
			wantReq: map[string]Requirement{
				"0.620": {DieSize: "0.620", RequiredPerSet: 1, Available: 0, PossibleSets: 0, Used: 0, Remaining: 0, IsBottleneck: true, IsMissing: true},
			},
			wantBottle: []string{"0.620"},
			wantMissing: []string{"0.620"},
		},
		{
			name: "duplicate inventory rows aggregated",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: 4}, {DieSize: "0.620", Quantity: 6}},
			series:    []string{"0.620", "0.620"},
			wantSets:  5,
		},
		{
			name: "multiple bottlenecks identified",
			inventory: []InventoryItem{
				{DieSize: "0.620", Quantity: 6}, {DieSize: "0.625", Quantity: 6},
				{DieSize: "0.630", Quantity: 6}, {DieSize: "0.635", Quantity: 6},
			},
			series: []string{"0.620", "0.625", "0.625", "0.630", "0.630", "0.635", "0.635"},
			wantSets: 3,
			wantBottle: []string{"0.625", "0.630", "0.635"},
		},
		{
			name: "decimal normalization matches variants",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: 6}, {DieSize: ".620", Quantity: 2}},
			series:    []string{"0.6200", "0.620"},
			wantSets:  4,
		},
		{
			name: "unused inventory reported separately",
			inventory: []InventoryItem{{DieSize: "0.600", Quantity: 10}, {DieSize: "0.605", Quantity: 6}, {DieSize: "0.620", Quantity: 10}},
			series:    []string{"0.620"},
			wantSets:  10,
			wantUnused: []string{"0.600", "0.605"},
		},
		{
			name: "negative quantity rejected",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: -1}},
			series:    []string{"0.620"},
			wantErr:   "quantity cannot be negative",
		},
		{
			name: "invalid die size rejected",
			inventory: []InventoryItem{{DieSize: "0.62x", Quantity: 1}},
			series:    []string{"0.620"},
			wantErr:   "invalid die size",
		},
		{
			name: "invalid series die rejected",
			inventory: []InventoryItem{{DieSize: "0.620", Quantity: 1}},
			series:    []string{"0.620", "junk"},
			wantErr:   "invalid die size",
		},
		{
			name:    "empty series rejected",
			series:  []string{},
			wantErr: "series is empty",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := CalculateSeriesCapacity(tt.inventory, tt.series)
			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("expected error containing %q, got nil", tt.wantErr)
				}
				if !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("error = %q, want containing %q", err.Error(), tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if res.MaximumSets != tt.wantSets {
				t.Fatalf("MaximumSets = %d, want %d", res.MaximumSets, tt.wantSets)
			}

			if tt.wantReq != nil {
				for size, want := range tt.wantReq {
					var found *Requirement
					for i := range res.Requirements {
						if res.Requirements[i].DieSize == size {
							found = &res.Requirements[i]
							break
						}
					}
					if found == nil {
						t.Fatalf("requirement for %s not found", size)
					}
					if *found != want {
						t.Fatalf("requirement for %s = %+v, want %+v", size, *found, want)
					}
				}
			}

			if tt.wantBottle != nil {
				if len(res.Bottlenecks) != len(tt.wantBottle) {
					t.Fatalf("bottlenecks = %v, want %v", bottleneckSizes(res.Bottlenecks), tt.wantBottle)
				}
				got := bottleneckSizes(res.Bottlenecks)
				for i := range got {
					if got[i] != tt.wantBottle[i] {
						t.Fatalf("bottlenecks = %v, want %v", got, tt.wantBottle)
					}
				}
			}

			if tt.wantMissing != nil {
				got := inventoryLineSizes(res.Missing)
				if len(got) != len(tt.wantMissing) {
					t.Fatalf("missing = %v, want %v", got, tt.wantMissing)
				}
				for i := range got {
					if got[i] != tt.wantMissing[i] {
						t.Fatalf("missing = %v, want %v", got, tt.wantMissing)
					}
				}
			}

			if tt.wantUnused != nil {
				got := inventoryLineSizes(res.UnusedInventory)
				if len(got) != len(tt.wantUnused) {
					t.Fatalf("unused = %v, want %v", got, tt.wantUnused)
				}
				for i := range got {
					if got[i] != tt.wantUnused[i] {
						t.Fatalf("unused = %v, want %v", got, tt.wantUnused)
					}
				}
			}
		})
	}
}

func bottleneckSizes(b []Bottleneck) []string {
	out := make([]string, len(b))
	for i := range b {
		out[i] = b[i].DieSize
	}
	return out
}

func inventoryLineSizes(l []InventoryLine) []string {
	out := make([]string, len(l))
	for i := range l {
		out[i] = l[i].DieSize
	}
	return out
}

func TestTotalDiesPerSet(t *testing.T) {
	res, err := CalculateSeriesCapacity(
		[]InventoryItem{{DieSize: "0.620", Quantity: 100}, {DieSize: "0.625", Quantity: 100}},
		[]string{"0.620", "0.620", "0.625", "0.625", "0.630"},
	)
	if err != nil {
		t.Fatal(err)
	}
	if res.TotalDiesPerSet != 5 {
		t.Fatalf("TotalDiesPerSet = %d, want 5", res.TotalDiesPerSet)
	}
}

func TestProcurementPlan(t *testing.T) {
	inventory := []InventoryItem{
		{DieSize: "0.620", Quantity: 6},
		{DieSize: "0.625", Quantity: 2},
		{DieSize: "0.630", Quantity: 4},
	}
	series := []string{"0.620", "0.625", "0.625", "0.630", "0.630", "0.630"}

	t.Run("target beyond capacity lists shortfall per die", func(t *testing.T) {
		res, err := CalculateSeriesCapacityForTarget(inventory, series, 4)
		if err != nil {
			t.Fatal(err)
		}
		if res.TargetSets != 4 {
			t.Fatalf("TargetSets = %d, want 4", res.TargetSets)
		}
		// max possible: 0.620->6, 0.625->1, 0.630->1  => 1 set
		if res.MaximumSets != 1 {
			t.Fatalf("MaximumSets = %d, want 1", res.MaximumSets)
		}
		if len(res.Procurement) != 2 {
			t.Fatalf("Procurement len = %d, want 2 (%v)", len(res.Procurement), res.Procurement)
		}
		want := map[string]int64{
			"0.625": 6, // need 4*2=8 - avail 2
			"0.630": 8, // need 4*3=12 - avail 4
		}
		for _, p := range res.Procurement {
			if p.Procure != want[p.DieSize] {
				t.Errorf("procure %s = %d, want %d", p.DieSize, p.Procure, want[p.DieSize])
			}
		}
	})

	t.Run("target already achievable by current inventory", func(t *testing.T) {
		res, err := CalculateSeriesCapacityForTarget(inventory, series, 1)
		if err != nil {
			t.Fatal(err)
		}
		if len(res.Procurement) != 0 {
			t.Fatalf("Procurement = %v, want empty", res.Procurement)
		}
	})

	t.Run("target zero equals basic capacity", func(t *testing.T) {
		res, err := CalculateSeriesCapacityForTarget(inventory, series, 0)
		if err != nil {
			t.Fatal(err)
		}
		if res.MaximumSets != 1 || len(res.Procurement) != 0 {
			t.Fatalf("unexpected result: sets=%d proc=%v", res.MaximumSets, res.Procurement)
		}
	})

	t.Run("negative target rejected", func(t *testing.T) {
		if _, err := CalculateSeriesCapacityForTarget(inventory, series, -1); err == nil {
			t.Fatal("expected error for negative target sets")
		}
	})

	t.Run("excessive target rejected", func(t *testing.T) {
		if _, err := CalculateSeriesCapacityForTarget(inventory, series, 2000000000); err == nil {
			t.Fatal("expected error for target sets exceeding maximum limit")
		}
	})
}

func TestParseInventoryText(t *testing.T) {
	tests := []struct {
		name        string
		raw         string
		wantRows    []InventoryItem
		wantErrN    int
		wantWarn []string
	}{
		{
			name:     "pairs per line",
			raw:      "0.550\t4\n0.555  4\n0.560    4",
			wantRows: []InventoryItem{{DieSize: "0.550", Quantity: 4}, {DieSize: "0.555", Quantity: 4}, {DieSize: "0.560", Quantity: 4}},
		},
		{
			name:        "lone die treated as zero without stealing next row",
			raw:         "0.620  4\n0.625\n0.630\t2",
			wantRows:    []InventoryItem{{DieSize: "0.620", Quantity: 4}, {DieSize: "0.625", Quantity: 0}, {DieSize: "0.630", Quantity: 2}},
			wantWarn: []string{"without a quantity"},
		},
		{
			name:        "block of lone die sizes",
			raw:         "0.955\n0.965\n1.355\n1.795",
			wantRows:    []InventoryItem{{DieSize: "0.955", Quantity: 0}, {DieSize: "0.965", Quantity: 0}, {DieSize: "1.355", Quantity: 0}, {DieSize: "1.795", Quantity: 0}},
			wantWarn: []string{"without a quantity"},
		},
		{
			name:     "header row skipped",
			raw:      "Die Size\tQty\n0.620\t4\n0.625\t4",
			wantRows: []InventoryItem{{DieSize: "0.620", Quantity: 4}, {DieSize: "0.625", Quantity: 4}},
		},
		{
			name:     "float quantity from excel and unit suffix",
			raw:      "0.620mm 4.0\n0,625 in 6.00",
			wantRows: []InventoryItem{{DieSize: "0.620", Quantity: 4}, {DieSize: "15.875", Quantity: 6}},
		},
		{
			name:        "duplicates aggregated",
			raw:         "0.620 4\n0.620 2",
			wantRows:    []InventoryItem{{DieSize: "0.620", Quantity: 6}},
			wantWarn: []string{"duplicate"},
		},
		{
			name: "invalid quantity flagged with line number",
			raw:  "0.625 abc",
			wantErrN: 1,
		},
		{
			name:     "empty input",
			raw:      "   \n \n",
			wantErrN: 1,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rows, errs, warns := ParseInventoryText(tt.raw)
			if tt.wantErrN >= 0 {
				if len(errs) != tt.wantErrN {
					t.Fatalf("errors = %v, want %d", errs, tt.wantErrN)
				}
			}
			if len(rows) != len(tt.wantRows) {
				t.Fatalf("rows = %v, want %v", rows, tt.wantRows)
			}
			for i, want := range tt.wantRows {
				if rows[i] != want {
					t.Errorf("row[%d] = %+v, want %+v", i, rows[i], want)
				}
			}
			for _, frag := range tt.wantWarn {
				found := false
				for _, w := range warns {
					if strings.Contains(w, frag) {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("expected a warning containing %q, got %v", frag, warns)
				}
			}
		})
	}
}

func TestParseSeriesText(t *testing.T) {
	t.Run("counts duplicates and supports horizontal paste", func(t *testing.T) {
		sizes, errs := ParseSeriesText("0.620  0.625\t0.625 0.630")
		if len(errs) != 0 {
			t.Fatalf("errors = %v", errs)
		}
		want := []string{"0.620", "0.625", "0.625", "0.630"}
		if len(sizes) != len(want) {
			t.Fatalf("sizes = %v, want %v", sizes, want)
		}
		for i := range want {
			if sizes[i] != want[i] {
				t.Errorf("sizes[%d] = %q, want %q", i, sizes[i], want[i])
			}
		}
	})

	t.Run("rejects invalid values with line numbers", func(t *testing.T) {
		sizes, errs := ParseSeriesText("0.620\nnot-a-die\n0.630")
		if len(errs) != 1 {
			t.Fatalf("errors = %v", errs)
		}
		if len(sizes) != 2 {
			t.Fatalf("sizes = %v", sizes)
		}
	})

	t.Run("empty input", func(t *testing.T) {
		_, errs := ParseSeriesText("")
		if len(errs) != 1 {
			t.Fatalf("errors = %v", errs)
		}
	})
}
