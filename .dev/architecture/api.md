# API Specification & Endpoints Map

## Purpose
Complete catalog of all API endpoints across Django and Go services.
**Why:** Reference for understanding API surface and implementing new features.
**Read by:** AI agents, engineers.
**Updated:** When endpoints change.

## Primary Routes (v1 API Prefix: `/api/v1/` & `/api/`)

### Authentication & User Management (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login/` | Public | Validates credentials, sets HTTPOnly cookies, logs session |
| `POST` | `/api/v1/auth/logout/` | Authenticated | Evicts session record, invalidates Redis cache, clears cookies |
| `GET` | `/api/v1/auth/me/` | Authenticated | Retrieves current user profile, role, and authorized tool permissions |
| `POST` | `/api/v1/auth/change-password/` | Authenticated | Updates password with standard validation rules |
| `POST` | `/api/v1/auth/keep-alive/` | Authenticated | Touches and extends current session activity timestamp |
| `POST` | `/api/v1/auth/refresh/` | Authenticated | Issues updated access token using HTTPOnly refresh cookie |
| `POST` | `/api/v1/auth/sse-ticket/` | Authenticated | Exchanges active JWT for single-use ticket to establish SSE stream |

### User Administration & Permissions (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/api/v1/users/` | Root | List/create user accounts |
| `GET/PATCH/DELETE` | `/api/v1/users/{id}/` | Root | Read/update/deactivate user account |
| `GET` | `/api/v1/users/{id}/tools_permissions/` | Root | Fetch tool permission hierarchy tree for user |
| `POST` | `/api/v1/users/{id}/toggle_permission/` | Root | Toggle specific sub-feature tool key (`3d-stress-heatmap`, `engineering-theory`, `die-wear`, etc.) |
| `GET` | `/api/v1/active-sessions/` | Root | View active user sessions and devices |
| `GET` | `/api/v1/activity-logs/` | Root | View user audit log history (login, failed login, logout, eviction) |

### Dies & Inventory Management (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dies/` | Authenticated | Paginated list of dies with type and dimensions |
| `POST` | `/api/v1/dies/` | Admin / Root | Register a new Round or Flat die |
| `GET/PATCH/DELETE` | `/api/v1/dies/{id}/` | Authenticated/Admin | Details, partial update (Operator: rack/shelf; Admin: full), delete |
| `POST` | `/api/v1/dies/{id}/recut/` | Admin / Root | Recut die (updates current size/width/thickness and logs measurement) |
| `GET` | `/api/v1/dies/{id}/wear_prediction/` | Tool Authorized | Calculate linear wear prediction forecast for die |
| `GET/POST` | `/api/v1/dies/{id}/maintenance_logs/` | Authenticated | List or append maintenance service records |
| `GET` | `/api/v1/dies/{id}/history/` | Authenticated | View audit history logs for a single die |

### Physical Layout & Storage Grid (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/api/v1/categories/` | Public / Admin | List or create machine categories |
| `GET/POST` | `/api/v1/machines/` | Public / Admin | List or create machines |
| `GET/POST` | `/api/v1/sets/` | Public / Admin | List or create tool sets |
| `GET/POST/PATCH/DELETE` | `/api/v1/racks/` | Authenticated / Admin | Manage physical storage racks (grid rows x columns) |

### Wear Tolerances & Alerts (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `GET/POST/PATCH` | `/api/v1/tolerances/` | Admin / Root | Configure maximum wear tolerances and alert percentages per die type |
| `GET/PATCH` | `/api/v1/wear-alerts/` | Authenticated / Admin | List active wear alerts and mark alerts resolved |

### Spreadsheet Imports & Data Tools (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/import/` | Admin / Root | Upload CSV/Excel spreadsheet for idempotent die import |
| `GET` | `/api/v1/import/template/` | Admin / Root | Download standard Excel template for bulk imports |
| `GET` | `/api/v1/import/logs/` | Admin / Root | View past bulk import execution logs and row validation errors |

### Audit History & Monitoring (Django Gunicorn)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/history/` | Authenticated | List die history audit logs |
| `GET` | `/api/v1/history/machines/` | Authenticated | List machine/set/category/rack change logs |
| `GET` | `/api/v1/history/dashboard/` | Authenticated | Dashboard recent history feed |
| `GET` | `/api/v1/history/unified/` | Authenticated | Chronological unified timeline combining die and machine edits with diffs |
| `GET` | `/api/v1/health/` | Public | System health check (database, redis, meilisearch status) |
| `GET` | `/api/v1/server-info/` | Public | System hostname and detected LAN IP |
| `GET/POST` | `/api/v1/backups/` | Root | List backups or trigger manual database backup dump |
| `GET` | `/metrics` | Public / Monitor | Prometheus metrics export endpoint |
| `POST` | `/internal/verify-token/` | Internal Secret | Go ↔ Django internal JWT verification endpoint |

## High-Performance Read API (Go Microservice)

| Method | Route | Access | Purpose / Details |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/go/health` | Public | Go microservice health check endpoint |
| `GET` | `/api/go/search` | Authenticated | Sub-millisecond fuzzy search with Redis cache and Meilisearch query proxy |
| `GET` | `/api/go/stats` | Authenticated | Real-time aggregate count metrics (total dies, available, running, scrapped) |
| `GET` | `/api/events/` | Ticket Authorized | Server-Sent Events (SSE) stream for real-time inventory updates |
| `GET` | `/api/go/index-status` | Authenticated | Meilisearch indexing status and document count |
| `GET` | `/api/go/import-status` | Authenticated | Real-time status of ongoing bulk import tasks |

## Authentication Flow
1. Client sends credentials to `/api/v1/auth/login/`
2. Django validates credentials and sets HTTPOnly access and refresh cookies
3. Client includes cookies in subsequent requests (or Bearer token for API tools)
4. Go API validates JWT access tokens via Redis cache or `/internal/verify-token/`
5. Concurrent logins evict older active sessions and emit eviction events

