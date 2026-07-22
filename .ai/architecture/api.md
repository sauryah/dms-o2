# API Specification & Endpoints Map (api.md)

## Authentication API (Django Gunicorn)
- `POST /api/auth/login/`: Validates credentials, issues JWT tokens inside HTTPOnly cookies, logs session.
- `POST /api/auth/logout/`: Evicts DB sessions and invalidates the Go cache.
- `POST /api/auth/token/refresh/`: Requests access token updates via refresh keys.

## Tooling CRUD API (Django Gunicorn)
- `GET /api/dies/`: Retrieve relational die details (admins/superusers).
- `POST /api/dies/{id}/recut/`: Resets die size parameters and registers a measurement event.
- `POST /api/backups/`: Trigger backup file generation.

## High-Performance API (Go Service)
- `GET /api/go/search`: High-speed text-based search queries using Meilisearch.
- `GET /api/events/`: Open real-time SSE event connection.
  *Authentication*: Verified via short-lived UUID tickets to prevent token exposure in access logs.
