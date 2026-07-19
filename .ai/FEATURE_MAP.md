# System Features Map (FEATURE_MAP.md)

This document maps the user-facing capabilities of DMS-O2 to their frontend source files and backend business logics.

---

## 1. Inventory Explorer Sidebar & Grouping Tree
*   **Purpose**: Provides hierarchical tree navigation (Category → Machine → Set → Die) alongside text fuzzy search and filtering controls.
*   **Client Grouping Engine**: Fetches data from the Go Search API using a high limit (`limit=100000`) defined in [useInventoryState.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/features/inventory/hooks/useInventoryState.ts) and groups results in memory.
*   **Virtualization**: Renders long lists in the grid layout using `react-window` to optimize DOM nodes.
*   **Optimistic Mutations**: Moving a die to a new set immediately updates the client cache before confirmation from the backend.
*   **Routing Guard**: Private routes are protected by a `<ProtectedRoute>` wrapper that prevents split-second unauthenticated flashes of page data.

---

## 2. Interactive Storage Grid (Rack Grid Layout)
*   **Purpose**: Renders physical racks as visual coordinate tables where operators drag and drop dies to update storage shelves and rows.
*   **Coordinate Synchronization**: In Django's `pre_save` signal:
    *   If `rack` (ForeignKey) and `shelf` (PositiveSmallInteger) are explicitly updated, `location` is set to `f"{rack.name} - Shelf {shelf}"`.
    *   If `location` is edited as a raw string (e.g., `"Rack B - Shelf 5"`), regex parses the string, retrieves the matching `Rack` instance, and updates the `rack` and `shelf` attributes.
*   **Restrictions**: Operators can only modify coordinates. The `IsAdminOrRootOrOperatorRelocate` permission block prevents operators from editing other fields (like status, serials, casing attributes).

---

## 3. Bidirectional CAD SVG Blueprint & Spec Hover
*   **Purpose**: Syncs visual highlighting between detail tables and CAD blueprints.
*   **SVG Bidirectional Highlighting**: Hovering over blueprint parameters (like diameter size lines, width, or fillet radius vectors) highlights the corresponding record in the database specification tables.
*   **Accessibility**: Virtualized table rows are equipped with standard `aria-` attributes for accessibility screen readers.

---

## 4. Engineering Workbench Tools

### 4.1 Wire Drawing Elongation Calculator
*   **Math calculations**: Calculates pass drafts, area reductions, elongation ratios, and drafting sequences.
*   **State History**: Supports multi-step Undo/Redo commands for pass adjustments.
*   **Consistency Dashboard**: Analyzes reductions against warning thresholds, rendering stars ratings.
*   **Document Exports**: Exports results to Excel (using `xlsx`), CSV, and PDF (using `jspdf` and `jspdf-autotable`).

### 4.2 Interactive Theory & Fundamentals Panel
*   **Purpose**: Displays educational resources on wire drawing mechanics directly inside the engineering workbench.

---

## 5. Wear Prediction & Tolerances Dashboard
*   **Wear Prediction Engine**: Fetches historical dimension edits from `DieHistory` and evaluates wear rate gradients.
*   **Dimension Wear Chart**: Renders an SVG-based timeline line graph showing wear trends against configured tolerance limits.
*   **Database Tolerances**: Supports user-configurable wear limits per die type via the `DieTolerance` and `WearAlert` models.
*   **Access Control**: Frontend elements (like `WearPredictionSection` inside `DieDetailPage`) and backend calculations are restricted to `ROOT` users or accounts with the `die-wear` tool permission.
