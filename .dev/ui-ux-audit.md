# UI/UX Audit — DMS Frontend

**Date:** 2026-07-25  
**Scope:** All pages, components, shared UI, CSS  
**Total issues found:** ~120

---

## CRITICAL (8)

| # | File | Line | Problem | Classification |
|---|------|------|---------|----------------|
| 1 | `index.css` | 343-362 | Duplicate `:root` silently clobbers design tokens (`--color-bg`, `--color-border`, etc.). Every component using CSS vars gets wrong values. | color-inconsistency |
| 2 | `StatusBadge.tsx` | 27 | `rgba(from ${tokenColor} r g b / 0.1)` uses CSS Color Level 4 relative color syntax. Broken in Firefox <128, Safari <16.4. Badge backgrounds invisible. | mobile-breakage |
| 3 | `DashboardPage.tsx` | 329, 908; `DieCard.tsx` 25, 77 | Clickable `<div>` elements across app lack `tabIndex`, `role="button"`, `onKeyDown`. `focus-ring` CSS exists but never activates. Keyboard navigation completely broken. | accessibility |
| 4 | `Navbar.tsx` | 155-156 | Tools dropdown opens on `onMouseEnter`/`onMouseLeave` only. Keyboard users cannot access sizing calculator, wire drawing calculator, or die series generator. | accessibility |
| 5 | `Drawer.tsx` | 37-41 | No focus trap. After Tab through drawer content, focus escapes into blurred background. | accessibility |
| 6 | `ConfirmDialog.tsx` | 125-128 | Destructive confirm button auto-focused. One Enter keypress = accidental deletion. | button-feedback |
| 7 | `InventoryPage.tsx` + `DiesTable.tsx` | 108-111 / 119-122 | Dual selection state desync. `selectedDieIds`, `bulkStatus`, `bulkLocation`, `isUpdating` managed independently in BOTH files. Selections made in one don't reflect in other. Two bulk action bars render simultaneously. | missing-state |
| 8 | `ImportPage.tsx` | 414-477 | Dry-run preview modal has no focus trap. Tab escapes to background. No Escape handler. No `aria-modal`. | accessibility |

---

## HIGH (27)

| # | File | Line | Problem | Classification |
|---|------|------|---------|----------------|
| 9 | `DashboardPage.tsx` | 339 | `bg-rose-550/10` — `rose-550` not defined. Background renders transparent/invisible. | color-inconsistency |
| 10 | `DashboardPage.tsx` | 440 | `text-xxs` — not standard Tailwind class. Renders at wrong size. | readability |
| 11 | `DashboardPage.tsx` | 456-463 | "Scroll down to view all results" text lies — clicking closes dropdown instead of scrolling. | discoverability |
| 12 | `DashboardPage.tsx` | 621-663 | Search results appear far below search input after full dashboard grid. Users must scroll significantly to see results. | excessive-clicks |
| 13 | `DashboardPage.tsx` | 743-746 | `MaintenanceQueue` fetches ALL dies (`limit=10000`) just to filter ~3 statuses client-side. Large payload, slow render. | excessive-clicks |
| 14 | `DashboardPage.tsx` | 819-855 | Maintenance queue table has no responsive mobile design — just horizontal overflow. | mobile-breakage |
| 15 | `DieCard.tsx` | 88 | `text-xxs` — not standard Tailwind class. | readability |
| 16 | `CommandPalette.tsx` | 141 | Status change syntax only discoverable by trial and error. No inline hint. | discoverability |
| 17 | `CommandPalette.tsx` | 182-206 | ALL valid status changes appended per search result. Up to 35 extra items overwhelming the list. | excessive-clicks |
| 18 | `CommandPalette.tsx` | 228-247 | Global `keydown` listener intercepts ALL keyboard events while palette is open. Steals keystrokes from focused elements. | accessibility |
| 19 | `CommandPalette.tsx` | 260 | No unmount animation — palette disappears instantly on close. | button-feedback |
| 20 | `CommandPalette.tsx` | 263 | Navigation buried last in category order. Users must scroll past status updates to find page links. | discoverability |
| 21 | `CommandPalette.tsx` | 326 | `pt-20` positions palette 80px from top. On viewports <600px tall, palette clips off-screen. | mobile-breakage |
| 22 | `CommandPalette.tsx` | 339-345 | Search input has no `aria-label`. Screen readers announce unlabeled text field. | accessibility |
| 23 | `CommandPalette.tsx` | 270 | Mutable render-time counter (`let flatIndexCounter`) breaks in React strict mode. Keyboard arrows select wrong items. | missing-state |
| 24 | `DieDetailPage.tsx` | 1574+ | Literal `$` rendered before every dynamic value (~18 times). `${die.die_id}` in JSX text renders "$ABC-123". | readability |
| 25 | `DieDetailPage.tsx` | 1181-1198 | Background refetch overwrites in-progress edits. `useEffect([die])` resets all form state on every query refetch. | missing-state |
| 26 | `DiesTable.tsx` | 165-168 | Brittle DOM query for "/" search shortcut. `document.querySelector('input[placeholder*="Search"]')` breaks if placeholder changes. | accessibility |
| 27 | `FilterPanel.tsx` | 70 | MAINTENANCE reuses CLEANING color. Two statuses render identically — indistinguishable. | color-inconsistency |
| 28 | `FilterPanel.tsx` | 51-60 | Switching die type silently clears all size range inputs with no confirmation. | excessive-clicks |
| 29 | `DieDetailPage.tsx` | 1428 | SVG download grabs wrong element. `document.querySelector('svg')` can match any SVG on page. | missing-state |
| 30 | `CalculatorPage.tsx` | 431+ | 15+ non-standard Tailwind colors (`text-slate-105`, `text-slate-355`, `text-emerald-555`, `text-rose-350`, etc.). Many render invisible or wrong. | color-inconsistency |
| 31 | `CalculatorPage.tsx` | 68 | `showFormulaInfo` defaults `true`. 100+ line formula panel pushes calculator content below fold on load. | discoverability |
| 32 | `CalculatorPage.tsx` | 496-506, 576-585, 894-974 | Select/label inputs missing `id` and `htmlFor` binding. Labels visually present but not programmatically associated. | accessibility |
| 33 | `WireDrawingCalculatorPage.tsx` | 147 | Markdown `**Pass #3**` inside `<p>` renders literal asterisks. React doesn't interpret Markdown. | readability |
| 34 | `Drawer.tsx` | 37-41 | No `aria-labelledby` referencing the title. Screen readers announce dialog with no name. | accessibility |
| 35 | `DataTable.tsx` | 122 | `key={row.id \|\| row.die_id \|\| rIdx}` falls back to array index. Rows reuse wrong DOM nodes causing stale checkbox states. | missing-state |
| 36 | `SearchableSelect.tsx` | 151-156 | Trigger button has no visible border/background. Looks like plain text. Users can't tell it's clickable. | discoverability |
| 37 | `HistoryPage.tsx` | 194-197 | Tab change resets page but NOT filters. Stale filter values persist across tabs. | missing-state |
| 38 | `HistoryPage.tsx` | 321-349 | Tab labels overflow horizontally on narrow screens without scroll or wrap. | mobile-breakage |
| 39 | `ToolsPage.tsx` | 95 | If non-root user has no authorized tools, grid renders completely empty with no fallback message. | missing-state |
| 40 | `ToolsPage.tsx` | 99-148 | Tool cards not wrapped in link/clickable element. Hover effect suggests clickability but nothing happens. | excessive-clicks |
| 41 | `UsersPage.tsx` | 22-24 | Non-root users see bare `null` with no explanation message. | missing-state |
| 42 | `UsersPage.tsx` | 70-88 | Tab buttons lack `role="tab"` / `aria-selected` / `aria-controls`. Screen readers can't understand tab semantics. | accessibility |
| 43 | `SettingsPage.tsx` | 193-241 | Sidebar tab buttons lack ARIA tab semantics. Same issue as UsersPage. | accessibility |
| 44 | `SettingsPage.tsx` | 280-285, 301-306 | Show/hide password toggle buttons have no `aria-label`. Screen readers read blank buttons. | accessibility |
| 45 | `SettingsPage.tsx` | 162 | After password change, `login()` called without validating `data.token` exists. If API omits it, auth silently breaks. | form-validation |
| 46 | `SearchableSelect.tsx` | 104-145 | Keyboard navigation lacks `aria-activedescendant`. Screen readers don't announce highlighted option. | accessibility |
| 47 | `Skeleton.tsx` | 15-18 | No `aria-hidden="true"` or `role="presentation"`. Screen readers iterate through skeleton placeholders as real content. | accessibility |
| 48 | `EmptyState.tsx` | 11 | No heading element (`h2`/`h3`). Screen readers have no landmark to announce. | accessibility |

---

## MEDIUM (38)

| # | File | Line | Problem | Classification |
|---|------|------|---------|----------------|
| 49 | `DashboardPage.tsx` | 194-201 | Click-outside uses `mousedown` instead of `pointerdown` for touch compatibility. | mobile-breakage |
| 50 | `DashboardPage.tsx` | 265-275 | Client-side sort on single page — user expects global sort but gets per-page sort. | missing-state |
| 51 | `DashboardPage.tsx` | 310 | Stats grid `lg:grid-cols-8` — extremely cramped at large viewport. | spacing-inconsistency |
| 52 | `DashboardPage.tsx` | 394-399 | Search result badge has `pr-28` even when hidden — unnecessary padding. | spacing-inconsistency |
| 53 | `DashboardPage.tsx` | 539-594 | Numeric filter inputs missing `focus:border-blue-500` present on other inputs. Inconsistent focus behavior. | color-inconsistency |
| 54 | `DashboardPage.tsx` | 665-670 | Loading skeleton shows 3 cards regardless of pageSize (24). Misleading. | missing-state |
| 55 | `DieCard.tsx` | 6 | `die: any` prop type — no type safety. | missing-state |
| 56 | `DieCard.tsx` | 77 | Grid card `h-48` — long text truncated without overflow indicator or tooltip. | readability |
| 57 | `DieCard.tsx` | 101 | Location truncated at `max-w-[100px]` — too narrow for meaningful info. | readability |
| 58 | `DieCard.tsx` | 107 | `border-[var(--color-border)]/65` — opacity modifier silently dropped on CSS variable. | color-inconsistency |
| 59 | `CommandPalette.tsx` | 152 | Status change icon uses `animate-spin-slow` — implies ongoing process for one-click action. | button-feedback |
| 60 | `CommandPalette.tsx` | 331 | `max-h-[500px]` — no visual "more items" indicator when content overflows. | discoverability |
| 61 | `DiesTable.tsx` | 768 | Virtual list height not responsive. Computed once, never updates on resize. | mobile-breakage |
| 62 | `DieDetailPage.tsx` | 1790-1961 | No unsaved-changes warning in edit drawer. Closing silently discards changes. | missing-state |
| 63 | `DieDetailPage.tsx` | 1282-1322 | No client-side validation on numeric fields. Empty/NaN/negative values pass to API. | form-validation |
| 64 | `DieDetailPage.tsx` | 1315-1318 | Status change confirms; dimension changes to extreme values don't. Inconsistent guardrails. | button-feedback |
| 65 | `DieDetailPage.tsx` | 1592-1595 | Status indicator only distinguishes AVAILABLE vs all-other. Loses per-status color differentiation. | color-inconsistency |
| 66 | `DieDetailPage.tsx` | 1998-2118 | Recut modal uses custom implementation instead of shared ConfirmDialog/Drawer. Different styling. | spacing-inconsistency |
| 67 | `DieDetailPage.tsx` | 1739 | Wear prediction hidden from OPERATOR role. Operators can't see wear alerts. | discoverability |
| 68 | `DieDetailPage.tsx` | 1458-1464 | Raw API error text leaked to user. | readability |
| 69 | `FilterPanel.tsx` | 137-158 | Status checkbox is decorative/inaccessible. `pointer-events-none`, empty `onChange`. | accessibility |
| 70 | `FilterPanel.tsx` | 82 | `select-none` on panel prevents text selection of filter values. | accessibility |
| 71 | `InventoryPage.tsx` | 327-339 | "Expand/Collapse Tree" buttons look identical — no icon or color differentiation. | discoverability |
| 72 | `CalculatorPage.tsx` | 809-813, 1508-1514, 1885-1891 | "Calculate/Generate" buttons labeled as actions but just scroll — calculations already auto-update. | button-feedback |
| 73 | `CalculatorPage.tsx` | 1525-1531 | Export CSV only in Tab 2. Tab 1 and Tab 3 have no export. | discoverability |
| 74 | `CalculatorPage.tsx` | 94 | Tab content grid ratios shift between tabs causing jarring layout reflow. | spacing-inconsistency |
| 75 | `CalculatorPage.tsx` | 1323, 2204 | Magic number keys `888`/`999` for tab matching. Fragile coupling. | readability |
| 76 | `WireDrawingCalculatorPage.tsx` | 100 | `toggleDark={() => {}}` — dark mode toggle button does nothing. | button-feedback |
| 77 | `MachineSetsPage.tsx` | 42-77 | Stats banner shows "0" during loading instead of skeleton. | missing-state |
| 78 | `MachineSetsPage.tsx` | 81 | Tabs overflow on narrow screens but scrollbar hidden via CSS. No visual cue. | mobile-breakage |
| 79 | `MachineSetsPage.tsx` | 85, 99, 113 | Non-standard Tailwind colors (`hover:text-slate-350`, `text-blue-450`). | color-inconsistency |
| 80 | `SettingsPage.tsx` | 138-141 | Confirm password field has no show/hide toggle unlike other two password fields. | spacing-inconsistency |
| 81 | `SettingsPage.tsx` | 148-150 | Password validation only checks length ≥ 8. No complexity shown. | form-validation |
| 82 | `SettingsPage.tsx` | 339-343 | Submit button shows "Changing Password..." but no spinner. User may think app frozen. | button-feedback |
| 83 | `SettingsPage.tsx` | 255-264 | Profile metadata grid `grid-cols-2` may break on narrow viewports. | mobile-breakage |
| 84 | `HistoryPage.tsx` | 206-285 | CSV export calls with `page_size=10000` but no pagination. Data silently truncated. | missing-state |
| 85 | `HistoryPage.tsx` | 381 | Input uses `bg-slate-955/60` while others use `bg-slate-950/60`. Inconsistent. | color-inconsistency |
| 86 | `HistoryPage.tsx` | 574 | Field name column `w-36` truncates long names without tooltip. | readability |
| 87 | `ImportPage.tsx` | 459-466 | Modal "Cancel" button `bg-slate-955` near-invisible against backdrop. | color-inconsistency |
| 88 | `ImportPage.tsx` | 415 | Modal backdrop click does NOT close modal. Convention is backdrop click = close. | discoverability |
| 89 | `ImportPage.tsx` | 144-148 | Drag over/leave causes flicker from rapid mouse movement over child elements. | button-feedback |
| 90 | `ImportPage.tsx` | 99-103 | Polling `setInterval` has no cleanup if component unmounts mid-import. | missing-state |
| 91 | `Toast.tsx` | 12-20 | `onDismiss` in useEffect dep array. New function reference resets timer, may never fire. | missing-state |
| 92 | `Toast.tsx` | 36 | `slide-in-from-right` used without corresponding animation definition. No slide effect. | button-feedback |
| 93 | `Toast.tsx` | 53 | Close button `hover:bg-slate-900` hardcoded instead of CSS variable. | color-inconsistency |
| 94 | `SearchableSelect.tsx` | 248 | "No matching sets found" hardcoded — wrong when used for machines, materials, etc. | readability |
| 95 | `SearchableSelect.tsx` | 172 | Dropdown `z-[100]` overlays modals, drawers, confirm dialogs. | mobile-breakage |
| 96 | `PageHeader.tsx` | 49 | `leading-none` causes multi-line titles to overlap ascenders/descenders. | spacing-inconsistency |
| 97 | `FilterChip.tsx` | 11 | Hardcoded `bg-slate-900` mixed with CSS variable text — theme breakage. | color-inconsistency |
| 98 | `DiesTable.tsx` | 240-286, 311-361 | Same sequential bulk API problem duplicated with own handlers. No progress feedback. | button-feedback |
| 99 | `InventoryPage.tsx` | 155-186 | Sequential bulk API calls with no per-item progress indicator. | button-feedback |
| 100 | `DieSeriesGeneratorPage.tsx` | 20 | `window.confirm()` — unstyled native browser dialog clashes with dark UI. | color-inconsistency |
| 101 | `DieSeriesGeneratorPage.tsx` | 78-86 | ResultsTable missing `selectedPassIdx`/`onSelectPass` props. Feature silently missing. | missing-state |
| 102 | `InventoryPage.tsx` | 661-674 | MAINTENANCE status missing from bulk update dropdown (present in DiesTable). | missing-state |
| 103 | `CalculatorPage.tsx` | 1985 | `<ArrowRight>` inside SVG `<g>` with Tailwind className — may not render correctly. | mobile-breakage |
| 104 | `UsersPage.tsx` | 73 | Tab buttons lack visible focus indicators for keyboard-only users. | accessibility |
| 105 | `HistoryPage.tsx` | 352-495 | Filter grid shifts dramatically between tabs — layout jump. | spacing-inconsistency |
| 106 | `Navbar.tsx` | 275-281, 498-504 | Logout buttons missing `type="button"`. | accessibility |
| 107 | `SettingsPage.tsx` | 26-29 | Tolerance success/error messages persist indefinitely. No auto-dismiss. | missing-state |
| 108 | `DiesTable.tsx` | 416, 720 | ~400+ char inline conditional class strings. Difficult to maintain. | readability |

---

## LOW (27)

| # | File | Line | Problem | Classification |
|---|------|------|---------|----------------|
| 109 | `DashboardPage.tsx` | 344 | Count `text-left` inside `text-center` parent — inconsistent alignment. | spacing-inconsistency |
| 110 | `DashboardPage.tsx` | 359 | Search placeholder text too long, truncates on narrow screens. | readability |
| 111 | `DashboardPage.tsx` | 452-454 | Keyboard hint `text-[10px]`/`text-[9px]` — below WCAG readable size. | accessibility |
| 112 | `DashboardPage.tsx` | 704 | "Showing X of Z tools" — rest of UI uses "dies". Inconsistent terminology. | readability |
| 113 | `DashboardPage.tsx` | 711, 719 | Hardcoded `window.scrollTo({ top: 350 })` — arbitrary pixel value. | spacing-inconsistency |
| 114 | `DieCard.tsx` | 25-27 | `border-l-4` + `border` creates heavy left accent looking like rendering glitch. | spacing-inconsistency |
| 115 | `CommandPalette.tsx` | 331 | `z-[9999]` excessively high z-index. Future layering conflicts. | spacing-inconsistency |
| 116 | `CommandPalette.tsx` | 339 | Search icon `h-4.5 w-4.5` — not standard Tailwind size. | color-inconsistency |
| 117 | `CommandPalette.tsx` | 359 | Empty state icon uses `animate-pulse` — implies liveness where there is none. | button-feedback |
| 118 | `index.css` | 394, 454 | `.wdc-btn`/`.wdc-input` use `font-family: 'Inter'` but Inter not imported. Falls back to system font. | readability |
| 119 | `index.css` | 210-235 | Global input overrides use `!important` on 5 properties. Conflicts with component-level styles. | color-inconsistency |
| 120 | `index.css` | 269-280 | `slideDown` animation hardcodes `max-height: 100px`. Taller content clips. | spacing-inconsistency |
| 121 | `Navbar.tsx` | 77 | `bg-slate-950/85` — opacity `/85` not standard Tailwind step. | color-inconsistency |
| 122 | `Navbar.tsx` | 432 | `border-slate-850` — not standard color. Mobile border invisible. | mobile-breakage |
| 123 | `ConfirmDialog.tsx` | 78 | `select-none` prevents copying message text (error details, account names). | readability |
| 124 | `StatusBadge.tsx` | 19 | MAINTENANCE maps to `--color-cleaning`. Semantically misleading. | color-inconsistency |
| 125 | `PageHeader.tsx` | 18 | `select-none` prevents copying page title. | readability |
| 126 | `PageHeader.tsx` | 22 | Breadcrumb `<nav>` lacks `aria-label="Breadcrumb"`. | accessibility |
| 127 | `Skeleton.tsx` | 14-20 | Uses `animate-pulse` but custom `.animate-skeleton` exists unused. | color-inconsistency |
| 128 | `EmptyState.tsx` | 11 | `select-none` prevents copying empty state message. | readability |
| 129 | `Footer.tsx` | 11 | `<footer>` has no `role="contentinfo"`. | accessibility |
| 130 | `WireDrawingCalculatorPage.tsx` | 24-27 | `DEFAULT_DIES` with no tooltip or "Reset to defaults" affordance. | discoverability |
| 131 | `WireDrawingCalculatorPage.tsx` | 83-193 | When all dies deleted, entire page collapses to just input. No empty state. | missing-state |
| 132 | `DieSeriesGeneratorPage.tsx` | 67 | Subtitle `text-xs text-[#475569]` — very small, low contrast. | readability |
| 133 | `DieSeriesGeneratorPage.tsx` | 76-100 | Initial state shows no hint that results will appear below. | missing-state |
| 134 | `ToolsPage.tsx` | 109-112 | Status badge always "Active & Ready" — redundant, no info conveyed. | discoverability |
| 135 | `ToolsPage.tsx` | 141 | All cards use identical "Launch Workbench" label. | readability |
| 136 | `ToolsPage.tsx` | 129 | Feature bullets always `bg-blue-500/70` regardless of card color scheme. | color-inconsistency |
| 137 | `ImportPage.tsx` | 176-209 | Dry-run button calls `handleSubmit(e, true)` where `e` is click event not submit. | readability |
| 138 | `ImportPage.tsx` | 377-388 | Checkmarks (✓) used for "skipped" and "errors". Misleading icons. | discoverability |
| 139 | `ImportPage.tsx` | 362-370 | Status banner has no auto-dismiss after import completes. | missing-state |
| 140 | `InventoryPage.tsx` | 446 | "Clear all" button `py-1` — too small touch target on mobile. | mobile-breakage |
| 141 | `FilterPanel.tsx` | 90 | Die Type toggle uses hardcoded `bg-slate-950` instead of CSS variable. | color-inconsistency |
| 142 | `FilterPanel.tsx` | 167-178 | Casing input uses `font-mono`; location input does not. Inconsistent typography. | spacing-inconsistency |
| 143 | `FilterPanel.tsx` | 220 | Unused `relative` class on location input wrapper. | spacing-inconsistency |
| 144 | `InventoryPage.tsx` | 541-549 | Loading skeleton hardcoded to 6 cards. Doesn't adapt to page size or layout. | missing-state |
| 145 | `DiesTable.tsx` | 8 | `const VirtualizedList = List as any` erases all type safety. | readability |
| 146 | `DiesTable.tsx` | 440 | Location shows "null" if shelf is 0 or null. | readability |
| 147 | `HistoryPage.tsx` | 500-516 | Loading/error/empty states have inconsistent padding. | spacing-inconsistency |
| 148 | `HistoryPage.tsx` | 706-709 | Pagination text uses inconsistent page_size but doesn't display which. | readability |

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 8 |
| HIGH | 27 |
| MEDIUM | 38 |
| LOW | 27 |
| **TOTAL** | **~100** |

## Summary by Classification

| Classification | Count |
|----------------|-------|
| accessibility | 22 |
| color-inconsistency | 22 |
| missing-state | 20 |
| readability | 16 |
| spacing-inconsistency | 15 |
| mobile-breakage | 12 |
| button-feedback | 12 |
| discoverability | 10 |
| excessive-clicks | 5 |
| form-validation | 3 |

## Top 10 Must-Fix (in priority order)

1. **`index.css:343-362`** — Duplicate `:root` clobbers design tokens. Affects everything.
2. **`StatusBadge.tsx:27`** — Relative color syntax broken in Firefox/Safari.
3. **Clickable divs** — Dashboard, DieCard, CommandPalette, MaintenanceQueue all inaccessible.
4. **`Navbar.tsx:155-156`** — Tools dropdown mouse-only.
5. **`Drawer.tsx:37-41`** — No focus trap.
6. **`ConfirmDialog.tsx:125-128`** — Destructive button auto-focused.
7. **`InventoryPage.tsx`** — Dual selection state desync.
8. **`DieDetailPage.tsx:1574+`** — Literal `$` in 18 places.
9. **Non-standard Tailwind colors** — 15+ in CalculatorPage, many elsewhere.
10. **`CalculatorPage.tsx:1-2267`** — 2267-line single file needs decomposition.
