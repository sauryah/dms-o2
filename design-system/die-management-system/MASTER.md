# Die Management System — Design System Specification

This specification governs the UI components, color systems, typography tokens, layouts, and accessibility standards for the Die Management System (DMS).

---

## 📖 Table of Contents
1. [Core Design Logic](#1-core-design-logic)
2. [Global Style Tokens](#2-global-style-tokens)
   - [Color Palette](#color-palette)
   - [Typography specs](#typography-specs)
   - [Spacing Variables](#spacing-variables)
   - [Shadow Depths](#shadow-depths)
3. [CSS Component Specifications](#3-css-component-specifications)
   - [Buttons](#buttons)
   - [Cards](#cards)
   - [Inputs](#inputs)
   - [Modals](#modals)
4. [Page Design Guidelines](#4-page-design-guidelines)
5. [Anti-Patterns & Accessibility Checks](#5-anti-patterns--accessibility-checks)
6. [See Also](#see-also)

---

## 1. Core Design Logic

> [!NOTE]
> When building or refactoring a specific interface route, check for a matching page-specific document under `design-system/pages/[page-name].md`. If present, those rules **override** this master spec. Otherwise, strictly follow the global rules listed below.

*   **Design Paradigm**: Industrial OLED Dark Mode (high-contrast, minimal glow, power efficient).
*   **Target Device Environment**: Shop floor desktop screens, rugged operator tablets, and LAN administrative interfaces.

---

## 2. Global Style Tokens

### Color Palette

| Role | Color Value (Hex) | CSS Variable | Purpose |
| :--- | :--- | :--- | :--- |
| **Primary** | `#0F172A` | `--color-primary` | Main surface panels and container fills |
| **Secondary**| `#1E293B` | `--color-secondary`| Borders, table lines, dividing indicators |
| **Accent/CTA**| `#22C55E` | `--color-cta` | Primary actions, success indicators, valid alerts |
| **Background**| `#020617` | `--color-background`| Main app shell page background |
| **Text** | `#F8FAFC` | `--color-text` | Primary body and heading content text |

---

### Typography specs

*   **Heading Font**: `Fira Code` (for codes, numeric sizes, and parameters)
*   **Body Font**: `Fira Sans` (for remarks, labels, and text descriptions)
*   **Design Mood**: Data-dense, analytical, precise, technical
*   **Google Fonts Link**: [Fira Code & Fira Sans Family Selection](https://fonts.google.com/share?selection.family=Fira+Code:wght@400;500;600;700%7CFira+Sans:wght@300;400;500;600;700)

#### Stylesheet Import
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

---

### Spacing Variables

Use these predefined tokens to maintain layout consistency:

| Token | Pixel Value | Rem Equiv | Standard Application |
| :--- | :--- | :--- | :--- |
| `--space-xs` | `4px` | `0.25rem` | Inner element gaps, detail labels |
| `--space-sm` | `8px` | `0.5rem` | Inline icon gaps, small button padding |
| `--space-md` | `16px` | `1.0rem` | Grid card padding, table column cell gaps |
| `--space-lg` | `24px` | `1.5rem` | Main container padding, section margins |
| `--space-xl` | `32px` | `2.0rem` | Modal margins, title block offsets |

---

### Shadow Depths

All card layouts and panels must use standardized box-shadow styles:

| Token Name | Box Shadow Rule | Application |
| :--- | :--- | :--- |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Micro elements, tabs |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Surface grids and inventory lists |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Dropdown selections, hovering filters |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Central pop-up modals, confirmation boxes |

---

## 3. CSS Component Specifications

### Buttons

```css
/* Primary Green Accent Button */
.btn-primary {
  background: #22C55E;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease-out;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button Outline */
.btn-secondary {
  background: transparent;
  color: #0F172A;
  border: 2px solid #0F172A;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease-out;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #020617;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #0F172A;
  outline: none;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal {
  background: #0f172a;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

### Visual Storage Rack Grid & Drag-Drop Map
*   **Grid Containers**: Renders dynamic grid cells aligned under Rack columns and Shelf rows.
*   **Hover/Drag States**: Drag-over target cells must highlight with a glowing blue border and blue shadow depth (`bg-blue-600/10 border-blue-500/80 shadow-[0_0_12px_rgba(59,130,246,0.25)]`).
*   **Draggable Nodes**: Hovering over draggable die badges should display a detailed floating card/tooltip.

### Bidirectional Hover Highlighting
*   **Vector Blueprint Highlights**: SVG dimension lines and text trigger highlights with stroke glows.
*   **Specification Table Row Highlights**: Hovering over specification rows applies a blue backdrop glow and transitions text colors using `cubic-bezier` timing curves (`transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`).

---

## 4. Page Design Guidelines

### Layout Pattern: Bento Grid Showcase
Designed to display status distribution charts, CAD drawings, and quick metrics lists simultaneously.

#### Structural Order:
1.  **Header Title Block**: Page title, scale settings, local time, and current active operators list.
2.  **Bento Grid Matrix**:
    *   *Grid Card A*: CAD Vector Simulation (MM format).
    *   *Grid Card B*: Real-time Status Donut chart.
    *   *Grid Card C*: Parameter Filter controls.
3.  **Detail Data Panel**: Double-buffered tables showing die metrics.

---

## 5. Anti-Patterns & Accessibility Checks

### ⚠️ Forbidden Patterns (Do NOT Use)
*   ❌ **Defaulting to Light Mode**: DMS is strictly dark-mode first for high visibility in low-light industrial environments.
*   ❌ **Using Emojis as Interface Icons**: Always use standardized vector icons from `Lucide React` or `Heroicons`.
*   ❌ **Oversized Layout-Shifting Hovers**: Do not use massive scales or transforms that force adjacent text elements to warp.
*   ❌ **Low Contrast Indicators**: All status alerts (e.g. Scrapped, Missing) must maintain a minimum contrast ratio of 4.5:1.
*   ❌ **Hidden Keyboard Focus**: Focus states (`:focus-visible`) must highlight clearly for tablet/keyboard operators.

---

### 📋 Pre-Delivery UI Checklist
- [ ] Icons are completely consistent, using vector SVG representations.
- [ ] `cursor-pointer` is applied to all clickable elements.
- [ ] Hover and click transitions are defined within 150-300ms windows.
- [ ] Focus outlines are visible when navigating using the Tab key.
- [ ] Layout shifts are blocked during asynchronous loads.
- [ ] Media queries are defined for tablets (768px), laptops (1024px), and desktops (1440px).

---

## 6. See Also

*   [README.md](file:///home/sahil/Projects/dms-o2/README.md) - System environment initialization and run instructions.
*   [ARCHITECTURE.md](file:///home/sahil/Projects/dms-o2/docs/ARCHITECTURE.md) - Database connection specifications and search route logic.
 horizontal scroll on mobile
