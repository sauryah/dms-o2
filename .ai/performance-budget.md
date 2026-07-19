# DMS-O2 Performance Budget

This document defines the strict performance budgets for the DMS-O2 platform. These budgets establish baseline limits to prevent latency regressions during future feature development and database scaling.

---

## ⏱️ Core Latency Budgets

| Metric | Target (p50) | Warning (p95) | Hard Limit (p99) | Measurement Tool / Method |
| :--- | :--- | :--- | :--- | :--- |
| **Go API Search** | < 30 ms | < 80 ms | < 150 ms | Go HTTP middleware logs / k6 |
| **Django Read API** | < 80 ms | < 150 ms | < 250 ms | Django middleware / Prometheus |
| **Django Write API** | < 120 ms | < 250 ms | < 400 ms | Django middleware / Prometheus |
| **SSE Ticket Generation**| < 20 ms | < 50 ms | < 100 ms | Go HTTP handler logs |
| **Database Query (SQL)** | < 10 ms | < 50 ms | < 100 ms | PostgreSQL `pg_stat_statements` |
| **Redis Cache Get/Set** | < 1 ms | < 3 ms | < 10 ms | Redis commands monitoring |
| **Celery Queue Delay** | < 50 ms | < 500 ms | < 2.0 s | Celery Flower / Prometheus metrics |

---

## 🖥️ Browser & Web Vitals Budgets (Desktop / Tablet)

Core Web Vitals targets are aligned with Google's strict production criteria, assuming network environments of 4G (LTE) or fast Wi-Fi:

*   **Largest Contentful Paint (LCP)**: **< 1.2 seconds** (Target), **< 2.5 seconds** (Hard Limit). Measures cold load visibility.
*   **Interaction to Next Paint (INP)**: **< 50 ms** (Target), **< 200 ms** (Hard Limit). Blocks typing/click delays on virtualized lists.
*   **Cumulative Layout Shift (CLS)**: **< 0.05** (Target), **< 0.1** (Hard Limit). Prevents layout jumping during dynamic CAD rendering.
*   **Total Blocking Time (TBT)**: **< 150 ms** (Target), **< 300 ms** (Hard Limit). Tracks main-thread blocking by JavaScript.

---

## 📦 Bundle Size & Asset Budgets

*   **Initial JavaScript Payload**: **< 250 KB** (compressed, Gzipped).
*   **Initial CSS Payload**: **< 50 KB** (compressed, Gzipped).
*   **Max Individual Code-Splitting Chunk**: **< 150 KB** (uncompressed).
*   **Static Images / SVGs**: **< 80 KB** per asset (compressed via SVGO or WebP).
*   **Font Files (WebP/WOFF2)**: **< 35 KB** per font family.

---

## 📈 System Performance Metrics

*   **Go Microservice Memory Footprint**: **< 45 MB** (RSS) under baseline load.
*   **Django Gunicorn Memory Footprint**: **< 180 MB** per worker process.
*   **Cache Hit Ratio (Search/Auth)**: **> 92%** (daily average).
*   **Celery Queue Backlog Size**: **< 5** pending messages (during non-bulk operations).

---

## 🛠️ Regressions Enforcement Plan

1.  **Lighthouse CI Audits**: Any pull request that reduces Lighthouse performance score below **90** on the Dashboard or Inventory page must fail the check.
2.  **Postgres Query Warnings**: Query executions exceeding **100 ms** must be logged as warnings inside Django logs. Queries exceeding **250 ms** must trigger alert notifications inside Sentry.
3.  **Bundle Budgets**: Vite build output triggers a build failure if the entrypoint chunk size exceeds **350 KB** uncompressed.
