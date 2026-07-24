# React Frontend SPA (frontend.md)

## Purpose
User dashboard, CAD vector blueprints renderer, 3D von Mises stress heatmap, theory deformation simulator, visual grid relocation layout, Wire Drawing Elongation Calculator, and spreadsheet import interfaces.

## Key Components & Architecture
- **State Management**: `useInventoryState.ts` for inventory selection, tree navigation, search filters; `@tanstack/react-query` for API query caching.
- **Resilience**: `lazyWithRetry.ts` for dynamic chunk recovery on new deployments; `ErrorBoundary.tsx` update fallback.
- **3D Heatmap**: `StressHeatmap3D.tsx` (WebGL von Mises stress visualization, particle flow streams, cutaway slice plane, 3D chevron defect overlay).
- **Theory Workbench**: `TheoryPanel.tsx` (CAD die inspector SVG, math deformation simulator, force equations).
- **Permissions**: `UserManager.tsx` (indented sub-feature permissions tree) & `AuthContext.tsx` (live background permission auto-sync).

## Important Files
- [App.tsx](file:///frontend/src/App.tsx): Main application router and shell layout.
- [useInventoryState.ts](file:///frontend/src/features/inventory/hooks/useInventoryState.ts): Central inventory state management hook.
- [StressHeatmap3D.tsx](file:///frontend/src/features/calculator/components/StressHeatmap3D.tsx): 3D WebGL stress visualizer.
- [TheoryPanel.tsx](file:///frontend/src/features/calculator/components/TheoryPanel.tsx): CAD die inspector & live simulator.
- [lazyWithRetry.ts](file:///frontend/src/utils/lazyWithRetry.ts): Dynamic import chunk recovery utility.

