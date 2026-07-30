# Production Runbook

## Purpose
Operational procedures for production environment.
**Why:** Enable consistent, reliable operations.
**Read by:** AI agents, operations team.
**Updated:** When procedures change.

## Deployment

### Standard Deployment (Source Build)
```bash
# 1. Pull latest changes
git pull origin main

# 2. Run database migrations
docker compose run --rm django python manage.py migrate

# 3. Rebuild and restart
docker compose up -d --build

# 4. Verify health
docker compose ps
curl -f https://localhost/api/v1/health/ || exit 1
```

### Pre-Built Image Deployment (No Source)
```bash
# 1. Pull pre-built images
docker compose -f docker-compose.ghcr.yml pull

# 2. Start services
docker compose -f docker-compose.ghcr.yml up -d

# 3. Verify health
docker compose -f docker-compose.ghcr.yml ps
curl -f https://localhost/api/v1/health/
```

### Rollback Procedure
```bash
# 1. Identify previous version
git log --oneline -5

# 2. Checkout previous version
git checkout <previous-commit>

# 3. Rebuild and deploy
docker compose up -d --build

# 4. Verify rollback
docker compose ps
curl -f https://localhost/api/v1/health/ || exit 1
```

## Monitoring

### Health Checks
```bash
# Django API health
curl -f https://localhost/api/v1/health/

# Go API health
curl -f https://localhost/api/go/health

# Database connectivity
docker compose exec db pg_isready -U dms_user -d dms

# Redis connectivity
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping
```

### Log Monitoring
```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f django
docker compose logs -f go-api
docker compose logs -f redis

# View errors only
docker compose logs -f | findstr /i error   # Windows
docker compose logs -f | grep -i error      # Linux/macOS
```

### Performance Monitoring
```bash
# Container resource usage
docker stats

# Database queries
docker compose exec django python manage.py shell -c "
from django.db import connection
print(f'Queries: {len(connection.queries)}')
"

# Redis memory usage
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" info memory
```

## Incident Response

### Severity Levels
- **P1:** Service down, data loss risk
- **P2:** Major feature broken, no data loss
- **P3:** Minor feature broken, workaround exists
- **P4:** Cosmetic issue, no impact

### Response Procedure
1. **Detect:** Identify issue via monitoring/alerts
2. **Assess:** Determine severity level
3. **Respond:** Execute appropriate runbook
4. **Resolve:** Fix underlying issue
5. **Review:** Post-incident review

### Common Issues

#### Service Won't Start
```bash
# Check logs
docker compose logs django

# Check disk space
df -h         # Linux/macOS

# Restart service
docker compose restart django
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker compose ps db

# Check connectivity
docker compose exec db pg_isready -U dms_user -d dms

# Restart database
docker compose restart db
```

#### Redis Connection Issues
```bash
# Check Redis status
docker compose ps redis

# Check Redis logs
docker compose logs redis

# Test connectivity
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" ping

# Restart Redis
docker compose restart redis
```

## Backup & Recovery

### Manual Backup
```bash
# Using the backup script
./dms-backup.sh backup

# List backups
./dms-backup.sh list

# Restore from backup
./dms-backup.sh restore <backup_filename.dump>
```

### Scheduled Backups
Automatic backups run via Celery Beat daily at 2:00 AM (configured in `CELERY_BEAT_SCHEDULE`). Backups are stored in `./backups/` with 14-day retention.

### Remote Backup (Optional)
If `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are configured in `.env`, backups are also streamed to S3-compatible storage (S3/MinIO) automatically.

## Scaling

### Horizontal Scaling
```bash
# Scale Go API (stateless read service)
docker compose up -d --scale go-api=2

# Scale Celery workers
docker compose up -d --scale worker=3
```

Note: Django Gunicorn scaling within a single compose stack is limited because sessions reference in-memory state. For multi-instance Django, use the unified monolith deployment with a load balancer.

### Vertical Scaling
Update `docker-compose.yml` resource limits:
```yaml
services:
  django:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
```

## Security

### Security Patches
```bash
# Rebuild images with security updates
git pull origin main
docker compose up -d --build
```

### Access Management
```bash
# List users
docker compose exec django python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
for u in User.objects.all():
    print(f'{u.username}: {u.role}')
"

# Reset root password
docker compose exec django python manage.py changepassword root
```

## Maintenance

### Database Maintenance
```bash
# Vacuum analyze
docker compose exec db psql -U dms_user -d dms -c "VACUUM ANALYZE;"

# Check table size
docker compose exec db psql -U dms_user -d dms -c "SELECT pg_size_pretty(pg_total_relation_size('dies_die'));"
```

### Log Rotation
Docker log rotation is pre-configured in docker-compose.yml with `max-size: 10m` and `max-file: 3` for traefik, django, and go-api services.

### Cache Management
```bash
# Clear Redis cache
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" FLUSHALL

# Verify cache cleared
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" DBSIZE
```
