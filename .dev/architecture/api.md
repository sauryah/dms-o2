# API Specification & Endpoints Map

## Purpose
Complete catalog of all API endpoints across Django and Go services.
**Why:** Reference for understanding API surface and implementing new features.
**Read by:** AI agents, engineers.
**Updated:** When endpoints change.

## Authentication API (Django Gunicorn)

### Login
- **Endpoint:** `POST /api/auth/login/`
- **Purpose:** Validates credentials, issues JWT tokens inside HTTPOnly cookies, logs session
- **Request:** `{"username": "...", "password": "..."}`
- **Response:** `{"access": "...", "refresh": "..."}`
- **Security:** Rate limited, audit logged

### Logout
- **Endpoint:** `POST /api/auth/logout/`
- **Purpose:** Evicts DB sessions and invalidates the Go cache
- **Request:** Cookie-based authentication
- **Response:** `{"detail": "Successfully logged out."}`
- **Security:** Requires `X-Requested-With: XMLHttpRequest`

### Token Refresh
- **Endpoint:** `POST /api/auth/token/refresh/`
- **Purpose:** Requests access token updates via refresh keys
- **Request:** `{"refresh": "..."}`
- **Response:** `{"access": "..."}`

## Tooling CRUD API (Django Gunicorn)

### List Dies
- **Endpoint:** `GET /api/dies/`
- **Purpose:** Retrieve relational die details (admins/superusers)
- **Query Params:** `?page=1&search=...&category=...`
- **Response:** Paginated list of die objects
- **Permissions:** Admin/Superuser only

### Recut Die
- **Endpoint:** `POST /api/dies/{id}/recut/`
- **Purpose:** Resets die size parameters and registers a measurement event
- **Request:** `{"new_diameter": ..., "new_length": ...}`
- **Response:** Updated die object
- **Security:** Atomic transaction, audit logged

### Create Backup
- **Endpoint:** `POST /api/backups/`
- **Purpose:** Trigger backup file generation
- **Request:** `{"backup_type": "full|incremental"}`
- **Response:** `{"backup_id": "...", "status": "queued"}`
- **Permissions:** Admin only

## High-Performance API (Go Service)

### Search
- **Endpoint:** `GET /api/go/search`
- **Purpose:** High-speed text-based search queries using Meilisearch
- **Query Params:** `?q=...&type=dies|machines|sets&limit=20`
- **Response:** Search results with highlighting
- **Security:** Input sanitized via `escapeMeiliFilterValue`

### Server-Sent Events
- **Endpoint:** `GET /api/events/`
- **Purpose:** Open real-time SSE event connection
- **Authentication:** Verified via short-lived UUID tickets
- **Security:** Tickets prevent token exposure in access logs
- **Events:** `die.updated`, `machine.created`, `set.modified`

## Webhook API (Django Background Tasks)

### Outbox Processing
- **Endpoint:** Internal only (not exposed)
- **Purpose:** Process outbox tasks for async operations
- **Security:** HMAC-SHA256 payload signatures
- **Retry:** Exponential backoff with dead-letter queue

## API Response Format

### Success
```json
{
  "status": "success",
  "data": {...},
  "meta": {
    "page": 1,
    "total": 100,
    "per_page": 20
  }
}
```

### Error
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {...}
  }
}
```

## Rate Limiting
- Login: 5 attempts per minute per IP
- API: 100 requests per minute per user
- Search: 60 requests per minute per user

## Authentication Flow
1. Client sends credentials to `/api/auth/login/`
2. Server validates and issues JWT in HTTPOnly cookie
3. Client includes cookie in subsequent requests
4. Server validates JWT on each request
5. Refresh token used to get new access tokens
6. Logout invalidates all tokens and clears cache
