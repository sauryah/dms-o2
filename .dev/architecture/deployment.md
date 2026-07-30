# Deployment & DevOps Specifications (deployment.md)

## Container Isolation & Security
All app services run inside containers using a dedicated non-root user:
- **User Settings**: `USER dmsuser` (UID 1000 / GID 1000).
- **Internal Ports**: Binds exclusively to user-space ports (Nginx `8080`, Go API `8080`, Gunicorn `8000`).
- **Temporary Paths**: Logs and PID locks are redirected to `/tmp/` and writable directories.

## Container Resource Limits
All services enforce resource limits to prevent OOM kills and resource starvation:

| Service | Memory Limit | CPU Limit |
|---------|--------------|-----------|
| db (PostgreSQL) | 1GB | 2.0 cores |
| redis | 256MB | 0.5 cores |
| meilisearch | 256MB | 0.5 cores |
| django (Gunicorn) | 512MB | 1.0 core |
| go-api | 128MB | 0.5 cores |
| worker (Celery) | 256MB | 0.5 cores |
| heavy-worker (Celery) | 512MB | 1.0 core |

## Redis Persistence
Redis is configured with AOF (Append-Only File) persistence for data durability:
- **AOF Enabled**: `appendonly yes`
- **Sync Policy**: `appendfsync everysec` (balanced durability/performance)
- **Max Memory**: 256MB with LRU eviction policy
- **Volume**: Persistent data stored in `redis_data` Docker volume

## Orchestration Layouts (Docker Compose)

### Development Stack (docker-compose.yml)
- **traefik**: Ingress router, ports `80:80` and `443:443`.
- **frontend**: Vite dev server or Nginx static frontend.
- **django**: Gunicorn WSGI server, port `8000`.
- **go-api**: Go search microservice, port `8080`.
- **worker**: Celery worker (default queue), 4 concurrency.
- **heavy-worker**: Celery worker (heavy queue), 2 concurrency.
- **beat**: Celery beat scheduler.
- **db**: PostgreSQL 18.
- **redis**: Cache with AOF persistence.
- **meilisearch**: Search index engine v1.7.

### Unified Monolith Stack (docker-compose.unified.yml)
- **app**: Single container exposing port `80:8080` with Supervisord managing Gunicorn, Celery workers, Go API, and Nginx.
- **db**: PostgreSQL 18.
- **redis**: Cache manager with AOF persistence.
- **meilisearch**: Search index engine.
