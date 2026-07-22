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

## Orchestration Layout (Docker Compose)
- **Monolith Container (`app`)**: Exposes port `80:8080`.
- **Database Container (`db`)**: Running PostgreSQL 18.
- **Cache Container (`redis`)**: Cache manager with AOF persistence.
- **Search Container (`meilisearch`)**: Index engine.
