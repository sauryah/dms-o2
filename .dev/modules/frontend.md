# React Frontend SPA (frontend.md)

## Purpose
High-density manufacturing telemetry dashboard, CAD vector blueprint renderer, 3D von Mises stress heatmap, Sachs' slab theory deformation simulator, visual rack relocation grid, Wire Drawing Elongation Calculator, die series generator, pass optimizer, and spreadsheet import interfaces.

---

## Design System & Dual-Theme Architecture

### 1. Supported Themes
The application supports two global visual modes managed via `ThemeContext.tsx` and CSS root tokens:
- **Dark Terminal / Bloomberg-Tape** (`data-theme="terminal"`, default):
  - **Canvas & Surfaces**: `#0a0a0a` (canvas), `#0f0f0f` (surfaces/cards), `#141414` (elevated/sidebar/hover).
  - **Borders & Dividers**: 1px flat solid `#1a1a1a` (subtle) / `#2a2a2a` (visible active).
  - **Typography**: Pure monospace stack (`ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace`), uppercase section labels (`01`, `02`, `03...`), tabular numeric figures (`font-variant-numeric: tabular-nums`).
  - **Status Accents**: Emerald `#10b981` (Available/Up), Blue `#3b82f6` (Running/Info), Amber `#f59e0b` (Maintenance/Warning), Purple `#8b5cf6` (Polishing), Orange `#f97316` (Damaged), Red `#ef4444` (Scrapped/Down), Gray `#6b7280` (Missing/Muted).
- **Classic Slate / Industrial Modern** (`data-theme="classic"`):
  - **Canvas & Surfaces**: Deep navy `#0B1220` (canvas), `#0F172A` (surfaces/cards), `#1E293B` (elevated).
  - **Borders & Dividers**: `#1E293B` / `#334155`.
  - **Typography**: Sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`).
  - **Accents**: Cyan `#38BDF8`, Mint `#34D399`, Coral `#F87171`, Amber `#FBBF24`.

### 2. Access Control Rule: ROOT-Only Theme Switching
- **Security Constraint**: Only authenticated users with `role === 'ROOT'` have permission to alter the system-wide visual theme.
- **Enforcement**:
  - `ThemeContext.tsx` checks `role === 'ROOT'`.
  - Non-root users (`ADMIN`, `OPERATOR`, `AUDITOR`, `VIEWER`) have theme toggles hidden in the Navbar and receive a disabled read-only lock in `SettingsPage.tsx`.
  - The active theme is synchronized across browser tabs using `localStorage('dms_app_theme')`.

---

## Key Components & Architecture
- **Theme Management**: `ThemeContext.tsx` (`useTheme()`) providing `theme`, `setTheme`, `toggleTheme`, and `canChangeTheme`.
- **State Management**: `useInventoryState.ts` for inventory selection, tree navigation, search filters; `@tanstack/react-query` for API query caching.
- **Resilience**: `lazyWithRetry.ts` for dynamic chunk recovery on new deployments; `ErrorBoundary.tsx` update fallback.
- **3D Heatmap**: `StressHeatmap3D.tsx` (WebGL von Mises stress visualization, particle flow streams, cutaway slice plane, 3D chevron defect overlay).
- **Theory Workbench**: `TheoryPanel.tsx` (CAD die inspector SVG, math deformation simulator force equations).
- **Die Set Planner**: `DieSetPlannerPage.tsx` (paste inventory + series, call go-api `/api/go/tools/calculate/die-set`, render set count, bottleneck/minimum-variants, remaining inventory).
- **Permissions**: `UserManager.tsx` (indented sub-feature permissions tree) & `AuthContext.tsx` (live background permission auto-sync).

---

## Important Files
- [App.tsx](file:///frontend/src/App.tsx): Application router and shell layout with provider hierarchy (`AuthProvider` ➔ `ThemeProvider` ➔ `ToastProvider` ➔ `NotificationProvider` ➔ `AnnouncementProvider`).
- [ThemeContext.tsx](file:///frontend/src/contexts/ThemeContext.tsx): Dual-theme state, persistence, and ROOT access control.
- [index.css](file:///frontend/src/index.css): Theme design tokens, CSS variables, CAD blueprint filters, and `.theme-classic` overrides.
- [Navbar.tsx](file:///frontend/src/components/Navbar.tsx): Top header with ROOT quick-toggle theme switcher.
- [SettingsPage.tsx](file:///frontend/src/pages/SettingsPage.tsx): System Appearance settings tab with live preview cards.
- [CommandPalette.tsx](file:///frontend/src/components/CommandPalette.tsx): Global `Ctrl+K` command palette with ROOT theme actions.
- [useInventoryState.ts](file:///frontend/src/features/inventory/hooks/useInventoryState.ts): Central inventory state management hook.
- [lazyWithRetry.ts](file:///frontend/src/utils/lazyWithRetry.ts): Dynamic import chunk recovery utility.
