# DMS — Engineering & Product Review
*Staff Software Engineer / Product Manager / Software Architect Assessment*

---

## Part 1 — Application Assessment

### What Problem It Solves
Die Management System (DMS) replaces unstructured Excel-based tracking of precision extrusion dies on factory shop floors. Dies are high-value manufacturing tools that degrade over time; their physical dimensions must be measured, logged, and acted upon. DMS provides a centralized, auditable, searchable record of every die's location, assignment, dimensions, and operational history.

### Target Users
- **Regular Operators**: Read-only inventory lookups and blueprint inspection on the shop floor.
- **Admin Users**: Die management, relocation, set/machine CRUD, and spreadsheet imports.
- **Root Superusers**: System administration, user management, database backup/restore.
- **Secondary**: Production managers and quality engineers who interpret wear trends.

### Business Value
- Eliminates manual errors from spreadsheet-based die tracking.
- Provides a full audit trail for every dimensional change and relocation — critical for quality certifications (ISO, IATF 16949).
- Reduces die downtime by making location and status searchable in real time.
- Reduces new-hire ramp-up time for floor operators through visual rack maps.
- Enables proactive maintenance decisions by surfacing wear data.

### Product Type
Internal B2B industrial operations tool — a domain-specific inventory and audit platform for discrete manufacturing environments.

### Current Maturity Level
**Production** — the architecture is clearly past MVP. It has a two-language backend split (Django + Go), real-time sync via SSE/PostgreSQL LISTEN/NOTIFY, role-based access control, automated backups, Playwright E2E tests, Traefik routing with rate limiting, and a zero-downtime search index swap command. However, several technical debt items (Vite dev server in production, no Go test coverage, manual wear alerting) indicate it has not yet reached Enterprise maturity.

### Biggest Strengths
1. **Architecture sophistication**: The hybrid Django + Go approach is genuinely well-reasoned — CRUD in Django, high-throughput reads in Go. Not cargo-culted; each service has a clear lane.
2. **Real-time event loop**: The `pg_notify → Go listener → SSE → React invalidate` chain is elegant and avoids polling.
3. **Audit trail design**: Field-level history with IP address, user, timestamp, old/new values is production-grade and auditable.
4. **Search quality**: The dual-buffer (Meilisearch fuzzy + PostgreSQL dimension range filters) with a hand-tuned scoring algorithm is unusually thoughtful for an internal tool.
5. **Bulk import resilience**: Per-row nested savepoints that skip bad rows without aborting the whole import is exactly correct transactional behavior.
6. **Performance engineering**: Custom fast serializer (10–15× speedup), Redis batch cache invalidation, list virtualization, and GIN trigram indexes show performance was considered throughout.
7. **Security model**: SHA-256 token hashing against DB session records, dual timeouts, automatic eviction on password change — well above average for internal tools.
8. **Developer experience**: Seed command, one-command setup script, OpenAPI schema via `drf-spectacular`, and a full onboarding guide are all present.

### Biggest Weaknesses
1. **Vite dev server runs in production** — single most impactful operational risk identified.
2. **No Go service test coverage** — the highest-traffic code path has zero tests.
3. **Manual wear alerting** — the core business value (knowing when a die needs maintenance) requires human initiative. No automation exists.
4. **Single-session constraint** — `OneToOneField` prevents multi-device use on the shop floor, a real operational limitation.
5. **Location as free-text string** — `Rack A - Shelf 3` is parsed by regex. Any typo silently makes a die "unassigned."
6. **No LDAP/SSO** — every factory likely has Active Directory; manual user management is friction in industrial settings.
7. **No mobile/tablet-optimized UI** — shop floor operators often use tablets. The current SPA is not described as responsive.
8. **No wear trend visualization** — history is logged but there are no charts, trend lines, or predictive signals surfaced to users.

---

## Part 2 — Feature Analysis

| Feature | Purpose | Rating | Problems | Suggested Improvements | Priority |
|---|---|---|---|---|---|
| **Relational CRUD & Asset Hierarchy** | Categories → Machines → Sets → Dies grouping with PROTECT constraints | 8/10 | No bulk machine/set creation; no category-level operations; PROTECT constraints could silently block UI deletions with no clear error messaging | Add bulk import for machines/sets; surface PROTECT errors as user-friendly dialogs instead of 500s; add drag-to-reassign set UI | High |
| **Fuzzy + Dimensional Search** | Dual-buffer search (Meilisearch + PostgreSQL) with custom relevance scoring | 9/10 | No saved searches; no search history; 10-second Redis TTL means rapid edits may show stale results briefly; digit-based fuzzy discard may frustrate users searching partial IDs with mixed input | Add saved/pinned searches; expose TTL as a configurable env var; add "search within results" refinement; show "X results from cache" indicator | High |
| **Visual Rack Layout Grid** | Drag-and-drop die nodes across physical racks with optimistic mutations | 8/10 | Location is free-text regex-parsed — any non-standard string breaks rack display; no validation on location string format at save time; no configurable rack topology (fixed grid) | Replace free-text location with a structured `rack + shelf` integer pair; make rack grid dimensions configurable per-deployment; add invalid-location warnings | High |
| **CAD Renderer & Tooltip Highlights** | Bidirectional hover sync between dimension table rows and SVG blueprint | 9/10 | Tolerance limits are hardcoded in `CadRenderer.tsx` (`±0.05 mm`); no way to configure tolerances per die family or customer spec; no print/export of blueprint | Move tolerance config to database; add per-die-type tolerance overrides; add SVG export and print view | Medium |
| **Bulk Spreadsheet Import** | Upload CSV/XLSX to create or update dies; row-level error isolation | 8/10 | No import template download; no dry-run/preview mode before commit; error report is a JSON array (not user-friendly); no import history log | Add "Download Import Template" button; add dry-run mode that returns a diff preview; render import errors as a styled table in the UI; persist import logs | High |
| **Automated & Manual Backup/Restore** | Daily cron backup + manual trigger; pg_dump/pg_restore with session management | 8/10 | Restore stops multiple services (django, worker, go-api) with no UI progress indicator; backup files stored on host filesystem only (no off-site); no backup integrity test automation; restore purges all sessions (good security, but no forewarning) | Add restore progress SSE stream; add backup checksum verification on list view; warn users pre-restore that all sessions will be invalidated; add optional remote backup destination (S3/SFTP) | Medium |
| **Real-Time SSE Sync** | pg_notify → Go → SSE → React query invalidation across all clients | 9/10 | SSE token is passed as URL query parameter (`?token=...`) which exposes JWT in server access logs; no reconnection backoff on client; no visibility into number of connected clients | Move SSE auth to a short-lived ticket token (exchange via POST, then use ticket in query string); add exponential backoff reconnect; add admin visibility into active SSE connections | High |
| **Authentication & Session Management** | JWT with SHA-256 DB validation, dual timeouts, single-session enforcement | 8/10 | Token in SSE URL (as noted); single-session blocks multi-device shop floor use; no refresh token flow (12h absolute limit means hard logouts mid-shift); no login attempt rate limiting documented | Add refresh token endpoint; allow configurable session policy (single vs multi); add brute-force lockout on login endpoint; add "remember this device" option for trusted devices | High |
| **RBAC Authorization** | Three-tier role model (Regular/Admin/Root) with matrix-based access | 7/10 | No granular permissions (e.g. an Admin who can import but not delete); no permission delegation; Regular users can't even relocate dies, which may be too restrictive for floor operators | Add a fourth "Operator" role that can relocate but not CRUD; consider attribute-based policies for finer control in the future | Medium |
| **Audit History (DieHistory)** | Field-level change log with IP, user, timestamp, old/new values | 8/10 | History is stored but there's no UI to browse, filter, or export it; no history for machine/set changes (only dies); no summary view of "what changed today" | Build a History page with date-range filter, user filter, and field filter; add machine/set change history; add CSV export of history; add "Activity Feed" dashboard widget | High |
| **User Management** | Root-only CRUD of admin/regular users | 6/10 | No bulk user import; no user deactivation with scheduled re-activation; no last-login visibility in UI; no LDAP/SSO integration | Add last-login and last-IP columns to user table; add bulk user CSV import; add user deactivation with optional expiry; add LDAP/AD integration | Medium |
| **Dashboard Stats** | Progress circles and status summary of die counts by status | 6/10 | Stats are counts only — no trends, no charts, no alerts; no machine-level utilization view; no "dies due for maintenance" surface | Add trend sparklines (7-day / 30-day); add machine utilization heatmap; add a "Maintenance Due" queue widget; make dashboard widgets configurable | High |
| **Excel Export** | Three export modes: all dies, machine-wise, set-wise | 7/10 | Not documented in the handbook how this is triggered or what the schema of the output file is; no PDF export; no scheduled/automated export delivery | Document export API endpoint; add PDF export; add scheduled email delivery of exports; add custom column selection | Medium |

---

## Part 3 — Missing Features

### Essential

| Feature | Why It Matters | User Benefit | Business Benefit | Complexity | Effort | Priority |
|---|---|---|---|---|---|---|
| **Wear Alert Engine** | Dies degrade to tolerance limits; currently requires manual monitoring | Operators get notified before a die fails in production | Reduces scrap rates, prevents costly production halts | Medium | 2–3 weeks | P0 |
| **History UI (Browse/Filter/Export)** | History is collected but invisible to users | Admins can audit who changed what and when | Required for quality audits (ISO, IATF) | Low | 1 week | P0 |
| **Import Template Download** | Users must reverse-engineer the expected CSV format | Reduces import errors to near zero | Reduces support burden | Low | 2 days | P0 |
| **Dry-Run Import Mode** | No way to preview what an import will do before committing | Safe trial run before mass data changes | Prevents accidental bulk overwrites | Medium | 1 week | P1 |
| **Structured Location Field** | Free-text rack location parsed by regex is fragile | Dies never silently disappear from the rack map | Data integrity in physical tracking | Medium | 1–2 weeks | P1 |
| **Operator Role (4th Tier)** | Regular users can't relocate dies; Admin is too broad | Floor operators can move dies without full admin rights | Safer delegation of common tasks | Low | 3 days | P1 |

### Nice to Have

| Feature | Why It Matters | User Benefit | Business Benefit | Complexity | Effort | Priority |
|---|---|---|---|---|---|---|
| **Wear Trend Charts** | History data is collected but never visualized | Engineers can see wear rates per die visually | Informs reorder and maintenance schedules | Medium | 1–2 weeks | P1 |
| **Dashboard Maintenance Queue** | No proactive surface for "what needs attention" | Shifts users from reactive to proactive | Reduces unplanned downtime | Low | 1 week | P2 |
| **Multi-Device Session Support** | Single-session blocks tablets + desktop simultaneously | Floor operators can use a tablet while a PC is logged in | Better adoption across the shop floor | Low | 3 days | P2 |
| **Activity Feed Widget** | No "what happened recently" view on dashboard | Quick situational awareness at shift start | Improves shift handover | Low | 1 week | P2 |
| **Saved / Pinned Searches** | Power users repeat the same searches constantly | One-click access to frequent queries | Faster daily workflows | Low | 3 days | P2 |
| **Machine/Set Change History** | Only die changes are audited; set/machine changes are not | Complete audit trail | Required for full ISO compliance | Medium | 1 week | P2 |
| **Print / PDF Blueprint View** | CAD SVG can't currently be printed or shared | Physical reference on the shop floor | Reduces dependency on digital terminals | Low | 1 week | P2 |

### Advanced

| Feature | Why It Matters | User Benefit | Business Benefit | Complexity | Effort | Priority |
|---|---|---|---|---|---|---|
| **LDAP / Active Directory SSO** | Factory IT manages users via AD; duplicate credential management is a security risk | Single sign-on across all factory systems | Reduces IT overhead and credential sprawl | High | 3–4 weeks | P2 |
| **Scheduled Reports via Email** | Managers want periodic inventory summaries without logging in | Passive awareness without tool dependency | Keeps stakeholders informed | Medium | 2 weeks | P3 |
| **Configurable Tolerance Limits** | Tolerances are hardcoded; different customers or die families have different specs | Accurate quality checks per die type | Supports multi-customer manufacturing | Medium | 2 weeks | P2 |
| **Barcode / QR Scan Integration** | Physical dies have IDs; manual lookup is slow | Scan a QR code to instantly pull a die's record | Faster operator workflows | Medium | 2–3 weeks | P3 |
| **Maintenance Log per Die** | DieHistory tracks dimension changes but not free-form maintenance events | Technicians can log "polished, noted scratch on edge" | Richer maintenance records | Low | 1 week | P2 |

### Enterprise

| Feature | Why It Matters | User Benefit | Business Benefit | Complexity | Effort | Priority |
|---|---|---|---|---|---|---|
| **Multi-Factory / Multi-Tenant Support** | Enterprises run multiple plants; today's schema is single-tenant | One login to manage dies across plants | Platform scalability and upsell potential | Very High | 6–10 weeks | P4 |
| **REST API for 3rd Party ERP Integration** | Factories use SAP, Oracle, or custom MES systems | DMS data flows into ERP automatically | Removes duplicate data entry | High | 4–6 weeks | P3 |
| **Role-Based Report Access Controls** | Executives should see summary reports; engineers see detail | Right information to the right person | Tighter access governance | Medium | 2 weeks | P3 |
| **Remote Backup Destination (S3/SFTP)** | Local backup is a single point of failure | Off-site backup for disaster recovery | Business continuity | Medium | 1–2 weeks | P2 |

---

## Part 4 — Product Roadmap

### Phase 1 — Quick Wins (0–4 weeks, High ROI)
*Focus: Fix critical gaps that immediately improve daily usability and data safety.*

1. **Replace Vite dev server with Nginx in production** — Ops risk, zero user-facing effort.
2. **Import template download** — 2-day effort, eliminates the #1 import support question.
3. **Dry-run import preview** — Prevents bulk data accidents; high trust-builder.
4. **SSE token via ticket exchange** — Security fix; stops JWT appearing in access logs.
5. **History UI: browse, filter, export** — Unlocks value already collected; required for audits.
6. **Operator role (4th RBAC tier)** — Enables floor operators to use the system safely.
7. **Structured Rack Location Field** — Eliminates regex fragility; fixes silent data loss on typos.
8. **Go service unit tests** — Highest-traffic path has zero tests; unacceptable risk.

### Phase 2 — Important Improvements (1–3 months)
*Focus: Core operational features and dashboard intelligence.*

9. **Wear Alert Engine** — Define tolerance thresholds per die type; alert when `current_size < threshold`.
10. **Dashboard Maintenance Queue** — Surface dies due for cleaning/polishing/replacement.
11. **Wear Trend Charts** — Time-series visualization of dimension changes per die.
12. **Multi-device session support** — Refactor `OneToOneField` → `ForeignKey` with configurable limit.
13. **Machine/Set Audit History** — Extend change logging to all entities.
14. **Configurable Tolerance Limits** — Move hardcoded ±0.05mm to database-configurable per die type.
15. **Remote Backup Destination** — Add S3/SFTP option; cron job deposits backup off-site nightly.
16. **Restore progress SSE stream** — Replace blind service restarts with observable progress.

### Phase 3 — Major Features (3–6 months)
*Focus: Integration, mobile, and advanced UX.*

17. **LDAP / Active Directory SSO** — Integrate with factory identity provider.
18. **Barcode/QR Scan Integration** — Mobile-friendly lookup by scanning a die tag.
19. **Maintenance Log (free-form per die)** — Technician notes separate from dimension changes.
20. **Scheduled Report Delivery** — Email CSV/PDF summaries on a schedule.
21. **ERP Integration API** — Webhook + pull API for SAP/Oracle/MES integration.
22. **Mobile-optimized UI** — Tablet-first layout for shop floor use.

### Phase 4 — Long-Term Vision (6–18 months)
*Focus: Platform expansion and AI-assisted intelligence.*

23. **AI Wear Prediction** — Train a model on DieHistory to predict time-to-failure per die.
24. **Multi-Factory / Multi-Tenant Architecture** — Plant-scoped data model for enterprise deployment.
25. **White-Label Packaging** — Configurable branding, custom logo, client-specific tolerance profiles.

---

## Part 5 — Technical Improvements

### Architecture

**Issue**: Single `docker-compose.yml` manages all services including production frontend as a dev server.  
**Solution**: Add a multi-stage Dockerfile for the frontend: `npm run build` in a Node stage, serve `/dist` via Nginx in the final stage.  
**Impact**: Eliminates HMR overhead, removes Node.js from production runtime, reduces container memory ~60%.  
**Effort**: 1 day.

**Issue**: Location stored as a free-text `VARCHAR(200)` parsed by regex in the frontend.  
**Solution**: Add `rack_id` (FK → new `Rack` table) and `shelf_number` (integer) columns to the `Die` model. Keep `location` as a computed property for display/search backward compatibility.  
**Impact**: Eliminates the largest data integrity risk in the system; enables proper rack topology configuration.  
**Effort**: 1–2 weeks (migration + frontend update).

**Issue**: The Go service reads directly from `users_usersession` tables — tight coupling to Django's internal schema.  
**Solution**: Create a dedicated `sessions` schema view or an internal `/internal/verify-token/` Django endpoint that the Go service calls. This decouples the Go service from Django's ORM layer.  
**Impact**: Django schema changes won't silently break Go authentication.  
**Effort**: 3–4 days.

### Performance

**Issue**: 10-second Redis TTL for search cache is a fixed magic number in code.  
**Solution**: Expose as `SEARCH_CACHE_TTL_SECONDS` environment variable; default to 10.  
**Impact**: Allows tuning per deployment without code changes.  
**Effort**: 1 hour.

**Issue**: `DieHistory` table will grow unboundedly; no documented archiving strategy.  
**Solution**: Add a `HISTORY_RETENTION_DAYS` setting; implement a management command + cron job that archives old history rows to a `history_archive` table or deletes them.  
**Impact**: Prevents query degradation over years of operation.  
**Effort**: 2–3 days.

**Issue**: Celery `rebuild_search_index_task` after restore has no progress visibility.  
**Solution**: Write task progress to a Redis key; expose it via a `/api/go/index-status` endpoint; poll from the frontend.  
**Impact**: Operators know when the system is ready after a restore.  
**Effort**: 2 days.

### Security

**Issue**: SSE endpoint authenticates via JWT in the URL query string (`?token=...`), which exposes the token in Traefik/Nginx access logs, browser history, and proxy cache keys.  
**Solution**: Implement a short-lived SSE ticket: client POSTs to `/api/auth/sse-ticket/` with its Bearer token, receives a single-use UUID ticket (30s TTL in Redis), then connects to `/api/events/?ticket=<uuid>`. Go service validates the ticket and discards it.  
**Impact**: JWT never appears in server logs or browser URL history.  
**Effort**: 3–4 days.

**Issue**: No documented rate limiting on the `/api/auth/login/` endpoint (only the general `/api` limit of 100 req/s is documented).  
**Solution**: Add a Traefik or Django middleware rate limiter specifically on the login route: max 5 attempts per minute per IP, with exponential backoff.  
**Impact**: Prevents brute-force credential attacks.  
**Effort**: 1 day.

**Issue**: Production startup check validates `DJANGO_SECRET_KEY` is not the default, but there's no documented check for weak `POSTGRES_PASSWORD` or `MEILI_MASTER_KEY`.  
**Solution**: Extend the startup validation to check entropy of all secret values.  
**Impact**: Prevents accidental deployment with weak credentials.  
**Effort**: Half a day.

### Database

**Issue**: No index on `DieHistory.changed_by_id` — user-filtered history queries (e.g. "show all changes by operator X") will do a full table scan as the table grows.  
**Solution**: Add `db_index=True` to `changed_by_id` field.  
**Impact**: Sub-millisecond user-filtered history queries instead of full scans.  
**Effort**: 1 migration, 30 minutes.

**Issue**: `Die.status` has two values that appear redundant: both `SCRAPPED` and `SCRAP` exist in the schema. This is likely a data inconsistency bug.  
**Solution**: Consolidate to a single `SCRAPPED` status; write a data migration to normalize existing records.  
**Impact**: Eliminates split stats and confusing search results.  
**Effort**: Half a day.

**Issue**: No index on `DieHistory.timestamp` alone (only the composite `(die_id, timestamp DESC)` exists), making date-range queries across all dies slow.  
**Solution**: Add a standalone index on `timestamp` for dashboard/audit queries that don't filter by a specific die.  
**Impact**: Fast "what changed today" queries.  
**Effort**: 1 migration, 30 minutes.

### API

**Issue**: The backup download endpoint (`GET /api/backups/download_backup/`) is not paginated or streamed — large backup files may time out or exhaust memory.  
**Solution**: Stream the response using Django's `StreamingHttpResponse` with file chunking.  
**Impact**: Reliable large file downloads; no memory spike.  
**Effort**: 1 day.

**Issue**: The Go search service has no documented pagination beyond a `limit` parameter — there's no `offset` or cursor, making it impossible to browse beyond the first page.  
**Solution**: Add `offset` parameter to `/api/go/search`; document max `limit` ceiling.  
**Impact**: Enables full inventory browsing via API clients.  
**Effort**: 1 day.

**Issue**: `drf-spectacular` is installed but there's no mention of a `/api/schema/` or Swagger UI endpoint being enabled or protected.  
**Solution**: Enable the schema at `/api/docs/` behind Root authentication in production.  
**Impact**: Self-documenting API for future integrators.  
**Effort**: Half a day.

### UI

**Issue**: Import errors are returned as a raw JSON array with no UI rendering described.  
**Solution**: Build an import results modal that renders a styled table of errors with row number, field name, and error message; allow download of error report as CSV.  
**Impact**: Dramatically improves import usability for non-technical admins.  
**Effort**: 2–3 days.

**Issue**: No empty state components described for the rack grid when a die's location string doesn't match the regex.  
**Solution**: Add an "Unassigned Dies" sidebar panel in the rack grid that lists dies with unrecognized locations, with a one-click prompt to set a valid rack/shelf.  
**Impact**: No die is silently invisible.  
**Effort**: 1–2 days.

### Testing

**Issue**: Go search service has zero test coverage. This is the highest-traffic, most performance-critical service.  
**Solution**: Add Go table-driven unit tests for: `scoreDie` algorithm, cache key construction, JWT validation logic, SQL query builders, and SSE broadcast logic. Target 70% coverage.  
**Impact**: Prevents regressions in search scoring and auth.  
**Effort**: 1–2 weeks.

**Issue**: No mention of load or stress testing — the system claims to handle 10,000+ dies but there's no evidence of benchmarking.  
**Solution**: Add `k6` or `hey` load tests targeting `/api/go/search` with 100 concurrent users; run in CI against a seeded database.  
**Impact**: Validates performance claims; catches regressions.  
**Effort**: 1 week.

### DevOps

**Issue**: Vite dev server in production.  
**Solution**: Multi-stage Dockerfile (Node build → Nginx static serve). See Architecture section above.  
**Impact**: Eliminates the single biggest operational risk in the project.  
**Effort**: 1 day.

**Issue**: Backup files stored only in the host `./backups` directory — single point of failure.  
**Solution**: Add a post-backup hook in `backup_db.sh` that optionally syncs to an S3 bucket or SFTP target if `BACKUP_REMOTE_DEST` is configured.  
**Impact**: Business continuity; off-site recovery capability.  
**Effort**: 1–2 days.

**Issue**: Docker Compose `restart: unless-stopped` policy (if applied) is not documented; the handbook mentions this was a noted audit finding.  
**Solution**: Document and enforce `restart: unless-stopped` on all stateful services (db, redis, meilisearch); use `restart: on-failure:3` on application services.  
**Impact**: Services recover automatically after host reboots.  
**Effort**: Half a day.

### Scalability

**Issue**: Current architecture is single-host Docker Compose — cannot scale horizontally without significant refactoring.  
**Solution**: Document a Kubernetes migration path as a future option; ensure all services are stateless (they appear to be, except for the local backup volume). Add health check endpoints on all services (only Go's `/api/go/health` is documented).  
**Impact**: Future-proofs the deployment model.  
**Effort**: Documentation: 1 day; Kubernetes migration: 4–6 weeks if needed.

---

## Part 6 — UX Review

### Simpler Workflows
- **Die Lookup**: Add a global keyboard shortcut (`/` or `Ctrl+K`) to focus the search bar from anywhere in the app — standard for tools used on the floor where mouse navigation is slow.
- **Status Update**: The most common admin action (changing a die status to RUNNING, CLEANING, etc.) likely requires navigating to a die detail page. Add an inline status toggle directly in the inventory table row via a dropdown, without opening the detail view.
- **Import Flow**: The current import flow (upload file → await JSON response) needs a 3-step wizard: Upload → Preview Diff → Confirm & Import.

### Better Navigation
- Add a breadcrumb trail on die detail pages: `Category > Machine > Set > Die ID`.
- Add a "Back to Set" quick link on the die detail view.
- Add keyboard navigation (arrow keys) in the inventory table for floor operators using ruggedized keyboards.

### Better Dashboard
The current dashboard shows static status counters and progress circles. It should become an operational intelligence surface:
- **Maintenance Queue**: A ranked list of dies closest to tolerance limits.
- **Recent Activity Feed**: Last 10 changes with who made them and when.
- **Machine Utilization Heatmap**: Which machines have the highest proportion of dies in non-available states.
- **7-Day Trend Sparklines**: Tiny trend lines next to each status count showing direction.

### Better Forms
- **Die Create/Edit Form**: Add real-time dimension validation with inline tolerance indicators (e.g. a green/yellow/red indicator showing how close `current_size` is to the minimum threshold).
- **Inline Edit in Table**: For `status` and `location`, allow double-click-to-edit directly in the table row.
- **Location Field**: Replace the free-text location input with a visual rack/shelf picker that renders a miniature rack grid.

### Better Reports
- Add a dedicated **Reports page** with pre-built templates: Status Summary, Wear Report by Die Type, Machine Utilization, Import History, User Activity.
- Each report should support date-range filtering and export to CSV and PDF.

### Better Notifications
- Add an in-app **Toast Notification Center** (a bell icon) that shows a history of recent SSE events (die updated, import completed, backup completed).
- Add **email notifications** for critical events: backup failure, die reaching critical wear threshold.
- When a restore completes, broadcast a prominent banner to all active sessions.

### Better Onboarding
- Add a **first-login guided tour** using a lightweight library: highlight the search bar, the rack grid, and the import button with tooltips.
- Add **contextual help tooltips** on technical fields (`die_id`, `casing`, `fillet radius`) explaining what they mean in manufacturing context.
- Add a **"Getting Started" checklist** on the dashboard for a new Root user: create machines → create sets → import dies.

### Accessibility
- Ensure all SVG elements in the CAD renderer have `aria-label` attributes describing the dimension being shown.
- Ensure drag-and-drop in the rack grid has a keyboard alternative (select die → press Enter → arrow-key to destination).
- Ensure color is not the only indicator of die status — add status icons/shapes alongside color coding.
- Add a high-contrast mode toggle, since factory environments often have bright lighting.

### Mobile Responsiveness
- The inventory table with virtualized rows is unlikely to be usable on a phone/tablet without specific responsive design.
- Add a **mobile card view** fallback for the inventory table: when viewport < 768px, switch from table rows to stacked die cards showing ID, status, and location.
- The rack grid drag-and-drop needs a touch-event implementation for tablet use.

---

## Part 7 — Competitive Analysis

Compared to modern industrial SaaS products (Infor CloudSuite, SAP PM, ToolsGroup, Limble CMMS, Fishbowl Inventory):

### Where DMS Falls Behind

| Area | Modern SaaS Standard | DMS Gap |
|---|---|---|
| **Predictive Maintenance** | ML-based time-to-failure predictions | No prediction; fully reactive |
| **Mobile First** | Native or PWA mobile apps | No documented mobile optimization |
| **Multi-Site** | Cross-plant inventory and reporting | Single deployment, single factory |
| **ERP Integration** | Native SAP/Oracle connectors | No integration API documented |
| **Work Order Management** | Maintenance work orders with assignment and completion tracking | No work order concept exists |
| **KPI Dashboards** | Configurable MTBF, OEE, die utilization metrics | Static counts only |
| **Supplier / Reorder Management** | Reorder triggers and supplier contact integration | Not present |
| **User Onboarding** | In-app tours and contextual help | Not present |
| **Offline Mode** | PWA offline caching for intermittent LAN connectivity | Not present |

### Feature Inspirations (Without Copying)

- **Limble CMMS**: "Upcoming Maintenance" queue sorted by urgency — adapt to "Dies Approaching Tolerance Limit" sorted by wear rate.
- **Fishbowl**: Audit trail visible inline in the item record — adapt to a timeline view on the die detail page.
- **Notion's database views**: Multiple view modes for the same data — adapt to offer Table / Card / Rack Grid as interchangeable views of the inventory.
- **Linear's keyboard-first UX**: Command palette for all actions — adapt to allow `Cmd+K` to open a global action palette for die lookup, status change, and navigation.

---

## Part 8 — AI Opportunities

Ranked by impact potential given this product's context:

### 1. Wear Prediction Model (Impact: Very High)
Use `DieHistory` time-series data (dimension values over time) to train a regression model predicting when each die will hit its minimum tolerance. Output: a "Predicted Days to Maintenance" column in the inventory table. This is the feature most likely to create genuine business value.

### 2. Smart Import Validation (Impact: High)
Use an LLM to interpret ambiguous import rows: column header aliasing ("Size" → `punched_size`), unit detection ("5mm" → `5.000`), and set name fuzzy matching ("Set A1" → "Set Alpha-1"). Reduce import errors without requiring perfectly formatted templates.

### 3. Natural Language Search (Impact: High)
Allow operators to type queries like "round dies over 10mm in Rack B that need polishing" and translate to structured API filter parameters. Particularly valuable for non-technical floor workers.

### 4. Anomaly Detection (Impact: Medium)
Flag unusual patterns in DieHistory: e.g. a die whose dimension shrank by more than the typical amount in a single update (likely a data entry error), or a die that has been in "CLEANING" status for longer than the historical average.

### 5. Auto-Categorize Import Errors (Impact: Medium)
Cluster import errors by type after a batch import and present grouped summaries ("12 rows had an unrecognized set name — did you mean 'Set Alpha'?") rather than a raw list of 12 separate error lines.

### 6. Maintenance Note Summarization (Impact: Medium)
If a free-form maintenance log is added (see Missing Features), use an LLM to generate a one-line summary of a die's maintenance history for the list view: "Polished 3× in last 6 months; last noted surface wear."

### 7. OCR for Physical Die Tags (Impact: Medium)
If dies have physical ID labels, allow mobile camera capture to OCR the die ID and instantly pull the record — eliminating manual typing on the shop floor.

### 8. Report Generation (Impact: Low-Medium)
Allow managers to describe a report in plain English ("Show me all dies from Machine 3 that were in MAINTENANCE status last month") and auto-generate the filtered export.

### 9. Chatbot Assistant (Impact: Low)
An in-app chat assistant that can answer "How many dies are available right now?" or "Where is die R-101?" by querying the Go API. Lower impact because the search UI already handles these well.

---

## Part 9 — Monetization

*Note: DMS is currently an internal tool. These suggestions apply if it is productized for external sale.*

### Subscription Tiers

| Tier | Price Signal | Features |
|---|---|---|
| **Starter** | Free / Low | Single factory, up to 500 dies, 2 admin users, basic CSV import, manual backups |
| **Professional** | Mid-tier SaaS | Up to 5,000 dies, unlimited users, wear alerts, scheduled reports, automated backups, history export |
| **Enterprise** | Per-seat or site license | Multi-factory, SSO/LDAP, ERP integration API, custom tolerance profiles, SLA support, white-label |

### Premium Features
- **AI Wear Prediction Module**: Available as an add-on or Professional+ feature.
- **Advanced Analytics Dashboard**: Configurable KPI widgets, trend exports, MTBF calculations.
- **Remote Backup Storage**: Managed S3 backup destination included in Professional.
- **Audit Compliance Package**: Tamper-evident history export, digital signatures on audit records, IATF 16949 report templates.

### Enterprise Features
- **Multi-Tenant Architecture**: Isolated databases per customer, shared infrastructure.
- **White-Label**: Custom domain, logo, and color scheme per customer.
- **ERP Connector**: Pre-built integration packages for SAP PM and Oracle Fusion.
- **On-Premise + Support SLA**: Packaged Docker Compose deployment with priority support.

### API Monetization
- Expose a public REST API for programmatic inventory access; tier by request volume.
- Webhook subscriptions for die status changes (ERP integration without polling).

---

## Part 10 — Final Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| **Architecture** | 8/10 | Hybrid Django/Go with pg_notify/SSE is well-designed; location-as-freetext and dev server in prod pull it down |
| **Security** | 7/10 | JWT token in SSE URL is a meaningful gap; otherwise above average for the category |
| **Performance** | 8/10 | Fast serializers, Redis caching, GIN indexes, list virtualization, Go search — clearly engineered |
| **Scalability** | 5/10 | Single-host Docker Compose; single-session constraint; no horizontal scaling path documented |
| **UI/UX** | 6/10 | CAD renderer and rack grid are impressive; dashboard is thin; no mobile; import UX is weak |
| **Maintainability** | 7/10 | Good structure, clear module separation, OpenAPI schema, onboarding guide; Go test gap is a risk |
| **Business Value** | 8/10 | Solves a real, documented operational problem; audit trail alone is worth significant value |
| **Feature Completeness** | 6/10 | Core tracking is solid; no wear alerts, no history UI, no mobile, no trend charts |
| **Documentation** | 9/10 | This handbook is detailed, honest about ambiguities, and includes diagrams, schemas, and journeys |
| **Developer Experience** | 8/10 | Seed command, one-script setup, full onboarding guide, OpenAPI, seeder, E2E tests |

**Overall Score: 7.2 / 10**

The DMS is a well-engineered internal tool with architectural decisions that punch well above its weight class. The engineering is notably thoughtful — the search service, event loop, and audit logging are all genuinely strong. The primary gaps are in product completeness (wear alerting, history UI, mobile) and a handful of ops/security issues that are well-understood and straightforward to fix.

---

## Top 25 Recommended Improvements (Highest to Lowest Priority)

| Rank | Improvement | Category | Why It's #N |
|---|---|---|---|
| 1 | Replace Vite dev server with Nginx multi-stage production build | DevOps | Highest operational risk; smallest effort to fix |
| 2 | Fix SSE JWT exposure — implement short-lived ticket exchange | Security | JWT in URL logs is an active security vulnerability |
| 3 | Add Go service unit tests (scoreDie, auth, cache, SQL builders) | Testing | Highest-traffic path with zero tests |
| 4 | Build History UI — browse, filter, export DieHistory | Feature | Data is collected; making it visible unlocks audit value immediately |
| 5 | Add Wear Alert Engine — threshold-based notifications per die type | Feature | The core business value of the system; currently entirely absent |
| 6 | Replace free-text location field with structured Rack/Shelf model | Architecture | Eliminates silent data loss from regex mismatch; enables rack configuration |
| 7 | Add Dry-Run Import Mode — preview diff before committing | Feature | Prevents bulk data accidents; highest risk user operation |
| 8 | Add Import Template Download button | Feature | 2-day fix that eliminates the top import support friction |
| 9 | Add Operator role (4th RBAC tier — can relocate but not CRUD) | Feature | Enables floor operators to use the system without Admin rights |
| 10 | Normalize duplicate die statuses (SCRAPPED vs SCRAP) | Database | Data integrity bug; splits stats and search results |
| 11 | Add index on DieHistory.changed_by_id and standalone timestamp index | Database | Required for performant history queries as the table grows |
| 12 | Add remote backup destination (S3/SFTP) option | DevOps | Local-only backup is a single point of failure |
| 13 | Add login rate limiting (5 attempts/minute/IP on /api/auth/login/) | Security | Brute-force protection on the only unauthenticated endpoint |
| 14 | Build Wear Trend Charts (time-series dimension visualization per die) | Feature | Makes DieHistory visible and actionable for engineers |
| 15 | Add Dashboard Maintenance Queue widget | Feature | Shifts users from reactive to proactive die management |
| 16 | Refactor OneToOneField → ForeignKey for multi-device session support | Architecture | Removes the biggest adoption barrier for floor operators |
| 17 | Add mobile card view fallback for inventory table (< 768px) | UI/UX | Shop floor tablets are the primary use case; tool must work on them |
| 18 | Add configurable tolerance limits per die type (move out of hardcode) | Feature | Different die families and customers have different tolerances |
| 19 | Stream backup downloads via StreamingHttpResponse | API | Prevents memory spikes and timeouts on large backup files |
| 20 | Add Machine/Set change history (extend audit logging to all entities) | Feature | Complete audit trail; required for full ISO compliance |
| 21 | Expose /api/docs/ (drf-spectacular) behind Root auth in production | API | Self-documenting API is already generated; just needs enabling |
| 22 | Add restore progress SSE stream and post-restore index-status endpoint | UX | Removes the "is the system ready?" uncertainty after a restore |
| 23 | Add startup entropy validation for all secret environment variables | Security | Prevents accidental weak-credential deployments |
| 24 | Add LDAP / Active Directory SSO integration | Feature | Factory IT standard; reduces credential sprawl and support overhead |
| 25 | Implement AI Wear Prediction using DieHistory time-series data | AI | Highest-impact AI feature; leverages already-collected history data |
