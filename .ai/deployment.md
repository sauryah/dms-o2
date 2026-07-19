# Deployment & DevOps Specifications (deployment.md)

## Container Isolation & Security
All app services run inside containers using a dedicated non-root user:
- **User Settings**: `USER dmsuser` (UID 1000 / GID 1000).
- **Internal Ports**: Binds exclusively to user-space ports (Nginx `8080`, Go API `8080`, Gunicorn `8000`).
- **Temporary Paths**: Logs and PID locks are redirected to `/tmp/` and writable directories.

## Orchestration Layout (Docker Compose)
- **Monolith Container (`app`)**: Exposes port `80:8080`.
- **Database Container (`db`)**: Running PostgreSQL 18.
- **Cache Container (`redis`)**: Cache manager.
- **Search Container (`meilisearch`)**: Index engine.
