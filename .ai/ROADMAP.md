# System Development Roadmap (ROADMAP.md)

DMS-O2 development follows structured engineering phases. This document tracks the completed phases and outlines future plans.

---

## 1. Development Timeline Diagram

```mermaid
gantt
    title DMS-O2 Phased Development Status
    dateFormat  YYYY-MM-DD
    section Core Base
    Phase 0: Project Scaffold       :done, 2026-06-01, 5d
    Phase 1: Database Schemas       :done, 2026-06-05, 5d
    Phase 2: Audit Trail Signals    :done, 2026-06-10, 3d
    Phase 3: Django Admin Console   :done, 2026-06-12, 3d
    section Microservice Read-path
    Phase 4: Go Search API          :done, 2026-06-15, 7d
    Phase 5: Deploy Automation      :done, 2026-06-20, 3d
    section User Interfaces
    Phase 6: React Frontend SPA     :done, 2026-06-24, 7d
    Phase 7: Spreadsheet Import     :done, 2026-06-30, 4d
    Phase 8: JWT Session Pruning    :done, 2026-07-03, 3d
    section Advanced Modules
    Phase 12: CAD SVG blue-charts   :done, 2026-07-08, 4d
    Phase 13: Elongation Calculator :done, 2026-07-12, 4d
    Phase 15: Monolith Docker image :done, 2026-07-16, 3d
    section Future Work
    SSO / LDAP Auth                 :active, 2026-07-20, 15d
    Multi-tenant lockouts           :2026-08-05, 10d
    Wear rate prediction learning   :2026-08-15, 20d
```

---

## 2. Chronological Milestones Log

### 2.1 Core Backend & Auditing (Phases 0 - 3)
*   **Deliverables**: Database migrations, model structures (Dies, Categories, Sets, Machines), and pre_save signals for automatic field auditing inside `DieHistory`.

### 2.2 Go Search API & Event Listener (Phases 4 - 5)
*   **Deliverables**: Created Go service, integration with Meilisearch, cache invalidations using `pq.NewListener` on PG NOTIFY channel `dms_events`.

### 2.3 React UI & Spreadsheet Imports (Phases 6 - 8)
*   **Deliverables**: Developed the Vite frontend, Virtualized lists, drag-and-drop allocations, CSRF cookies check, and dry-run transactional spreadsheet import parser.

### 2.4 Security & Session Eviction Hardening (v1.7.0 - v1.7.6)
*   **Deliverables**: IP brute force throttler (5/minute), startup credential verification rules, JWT cookie storage, internal keys Timing-safe HMAC, custom SVG CAD wear-highlight charts, and the engineering Elongation Calculator.

---

## 3. Future Roadmap Path

1.  **Enterprise SSO & LDAP Integration**:
    *   *Details*: Permit authentication integration with directory services.
2.  **Multi-tenant lockouts**:
    *   *Details*: Tenant namespace segregation and resource isolation.
3.  **Machine Learning Wear Rate Model**:
    *   *Details*: Replaces linear wear prediction formulas with predictive algorithms trained on historical tool degradation.
