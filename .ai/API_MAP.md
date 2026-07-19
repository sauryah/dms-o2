# API Interfaces Map (API_MAP.md)

DMS-O2 routes endpoints to Gunicorn/Django (port 8000) or Go API (port 8080) based on URL path matches.

---

## 1. Django REST API Matrix (`/api/v1/` and `/admin/`)

All state-mutating requests (POST, PATCH, DELETE) using cookies must include the header `X-Requested-With: XMLHttpRequest` to satisfy CSRF protection.

### 1.1 Authentication & Sessions
*   `POST /api/v1/auth/login/` (Public)
    *   *Payload*: `{"username": "...", "password": "..."}`
    *   *Response*: `{"token": "access_token", "role": "...", "authorized_tools": [...]}`
    *   *Side-Effect*: Sets `dms_access_token` and `dms_refresh_token` HTTPOnly cookies. Throttled to 5 attempts per minute per IP.
*   `POST /api/v1/auth/refresh/` (Public)
    *   *Payload*: `{"refresh": "..."}` (or falls back to cookie)
    *   *Response*: `{"access": "new_access_token"}` (refresh cookie is updated and popped from JSON response).
*   `POST /api/v1/auth/keep-alive/` (Authenticated)
    *   *Purpose*: Resets the session idleness timer.
*   `POST /api/v1/auth/sse-ticket/` (Authenticated)
    *   *Response*: `{"ticket": "UUID-ticket"}` (valid in Redis for 30s).
*   `POST /api/v1/auth/logout/` (Authenticated)
    *   *Side-Effect*: Deletes the database `UserSession` and clears HTTPOnly cookies.

### 1.2 Tooling Inventory CRUD
*   `GET /api/v1/dies/` (Public) - Lists all dies.
*   `POST /api/v1/dies/` (Admin/Root) - Registers a new die.
*   `GET /api/v1/dies/{id}/` (Public) - Detail view of a single die.
*   `PATCH /api/v1/dies/{id}/` (Operator/Admin/Root)
    *   *Operator Limit*: Allowed fields are strictly limited to `{'location', 'rack', 'shelf'}`.
*   `DELETE /api/v1/dies/{id}/` (Admin/Root) - Deletes die.
*   `POST /api/v1/dies/{id}/recut/` (Admin/Root) - Triggers re-boring/recut process resizing.
*   `GET /api/v1/categories/` | `POST /api/v1/categories/` - Machine category CRUD.
*   `GET /api/v1/machines/` | `POST /api/v1/machines/` - Machine CRUD.
*   `GET /api/v1/sets/` | `POST /api/v1/sets/` - Tool set CRUD.
*   `GET /api/v1/racks/` (Authenticated) - Lists all configured racks.
*   `POST /api/v1/racks/` | `PATCH /api/v1/racks/{id}/` | `DELETE /api/v1/racks/{id}/` (Admin/Root) - Racks config CRUD.

### 1.3 Users & Backups Management (Root Only)
*   `GET /api/v1/users/` | `POST /api/v1/users/` | `DELETE /api/v1/users/{id}/` - User administration CRUD.
*   `GET /api/v1/backups/` - Lists backups.
*   `POST /api/v1/backups/` - Creates instant database dump.
*   `POST /api/v1/backups/restore/` - Restores database (accepts JSON `{"filename": "..."}`).
*   `DELETE /api/v1/backups/delete_backup/` - Deletes dump file.
*   `GET /api/v1/backups/download_backup/?filename=...` - Streams binary dump file.
*   `POST /api/v1/backups/upload_backup/` - Uploads a `.dump` file.

### 1.4 Import Service (Admin/Root)
*   `POST /api/v1/import/` - Uploads spreadsheet for indexing (accepts query `?dry_run=true`).
*   `GET /api/v1/import/template/` - Downloads the standardized openpyxl excel template sheet.
*   `GET /api/v1/import/logs/` - Lists history logs of imports.

### 1.5 Audit Trail (Admin/Root)
*   `GET /api/v1/history/` - Lists Die history changes.
*   `GET /api/v1/history/machines/` - Lists Set/Machine/Category history logs.
*   `GET /api/v1/history/dashboard/` (Authenticated) - Strips sensitive details, cached for 60s.

---

## 2. Go API Matrix (`/api/go/` and `/api/events/`)

Authorized requests to `/api/go/` require providing a valid JWT access token.

*   `GET /api/go/health` (Public)
    *   *Response*: `{"status":{"postgres":"up","meilisearch":"up"},"reconciliation":{"postgres_count":X,"meili_count":Y}}`.
*   `GET /api/go/index-status` (Authenticated)
    *   *Response*: Progress details of atomic swap reindexing cached at `search_index_status` in Redis.
*   `GET /api/go/search` (Authenticated)
    *   *Parameters*: `q` (fuzzy query string), `die_type` (ROUND/FLAT), `status` (AVAILABLE, etc.), `location`, `casing`, size ranges (`size_min`/`size_max` etc.), `machine_id`, `set_id`, `unassigned` (true), `limit` (default 150), `offset` (default 0).
*   `GET /api/events/` (Authenticated via SSE UUID ticket)
    *   *Parameters*: `?ticket=<ticket_uuid>&last_event_id=<id>`
    *   *Headers*: `Last-Event-ID` header is checked on reconnect to backfill missed notifications.
    *   *Response*: Establishes text/event-stream connection. Heartbeats are sent as `: keepalive` every 15s.

---

## 3. Go-to-Django Verification Endpoint

*   `POST /internal/verify-token/` (Internal Network Only)
    *   *Headers*: Requires `X-Internal-Key` matching `INTERNAL_API_SECRET` and `Authorization: Bearer <token>`.
    *   *Response (200 OK)*:
        ```json
        {
          "valid": true,
          "user_id": 1,
          "role": "ADMIN",
          "is_authorized_for_tools": true,
          "authorized_tools": ["sizing-calculator"]
        }
        ```
