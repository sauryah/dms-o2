# Production Runbook

## Purpose
Operational procedures for production environment.
**Why:** Enable consistent, reliable operations.
**Read by:** AI agents, operations team.
**Updated:** When procedures change.

## Deployment

### Standard Deployment
```bash
# 1. Pull latest changes
git pull origin main

# 2. Build containers
docker-compose build

# 3. Run database migrations
docker-compose run --rm backend python manage.py migrate

# 4. Restart services
docker-compose up -d

# 5. Verify health
docker-compose ps
curl -f http://localhost:8000/health/ || exit 1
```

### Zero-Downtime Deployment
```bash
# 1. Build new image
docker-compose build --build-arg VERSION=$(git rev-parse --short HEAD)

# 2. Scale up new version
docker-compose up -d --no-deps --scale backend=2 backend

# 3. Wait for new container healthy
sleep 30

# 4. Scale down old version
docker-compose up -d --no-deps --scale backend=1 backend
```

### Rollback Procedure
```bash
# 1. Identify previous version
git log --oneline -5

# 2. Checkout previous version
git checkout <previous-commit>

# 3. Rebuild and deploy
docker-compose build
docker-compose up -d

# 4. Verify rollback
docker-compose ps
curl -f http://localhost:8000/health/ || exit 1
```

## Monitoring

### Health Checks
```bash
# Backend health
curl -f http://localhost:8000/health/

# Go API health
curl -f http://localhost:8080/health/

# Database connectivity
docker-compose run --rm backend python manage.py dbshell -c "SELECT 1;"

# Redis connectivity
docker-compose run --rm redis redis-cli ping
```

### Log Monitoring
```bash
# View all logs
docker-compose logs -f

# View specific service
docker-compose logs -f backend
docker-compose logs -f go-api
docker-compose logs -f redis

# View errors only
docker-compose logs -f | grep -i error
```

### Performance Monitoring
```bash
# Container resource usage
docker stats

# Database performance
docker-compose run --rm backend python manage.py shell -c "
from django.db import connection
print(f'Queries: {len(connection.queries)}')
"

# Redis memory usage
docker-compose run --rm redis redis-cli info memory
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
docker-compose logs backend

# Check disk space
df -h

# Check memory
free -m

# Restart service
docker-compose restart backend
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose ps postgres

# Check connections
docker-compose run --rm backend python manage.py shell -c "
from django.db import connections
print(connections['default'].queries_count)
"

# Restart database
docker-compose restart postgres
```

#### Redis Connection Issues
```bash
# Check Redis status
docker-compose ps redis

# Check Redis logs
docker-compose logs redis

# Test connectivity
docker-compose run --rm redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

## Backup & Recovery

### Backup Procedure
```bash
# Full backup
docker-compose run --rm backend python manage.py createbackup --type=full

# Incremental backup
docker-compose run --rm backend python manage.py createbackup --type=incremental

# Verify backup
docker-compose run --rm backend python manage.py verifybackup --latest
```

### Recovery Procedure
```bash
# List backups
docker-compose run --rm backend python manage.py listbackups

# Restore from backup
docker-compose run --rm backend python manage.py restorebackup --backup-id=<id>

# Verify recovery
docker-compose run --rm backend python manage.py check
```

## Scaling

### Horizontal Scaling
```bash
# Scale backend
docker-compose up -d --scale backend=3

# Scale Go API
docker-compose up -d --scale go-api=2
```

### Vertical Scaling
Update `docker-compose.yml` resource limits:
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

## Security

### Security Patches
```bash
# Update base images
docker-compose build --no-cache

# Scan for vulnerabilities
docker scan dms-o2-backend

# Apply patches
git pull origin main
docker-compose build
docker-compose up -d
```

### Access Management
```bash
# List users
docker-compose run --rm backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
for u in User.objects.all():
    print(f'{u.username}: {u.role}')
"

# Reset password
docker-compose run --rm backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
u = User.objects.get(username='admin')
u.set_password('newpassword')
u.save()
"
```

## Maintenance

### Database Maintenance
```bash
# Vacuum analyze
docker-compose run --rm backend python manage.py shell -c "
from django.db import connection
cursor = connection.cursor()
cursor.execute('VACUUM ANALYZE')
"

# Check bloat
docker-compose run --rm backend python manage.py shell -c "
from django.db import connection
cursor = connection.cursor()
cursor.execute('SELECT pg_size_pretty(pg_total_relation_size(\'die\'))')
print(cursor.fetchone()[0])
"
```

### Log Rotation
```bash
# Clear old logs
docker-compose logs --tail=0 -f &

# Rotate Docker logs
sudo truncate -s 0 /var/lib/docker/containers/*/\*-json.log
```

### Cache Management
```bash
# Clear Redis cache
docker-compose run --rm redis redis-cli FLUSHALL

# Verify cache cleared
docker-compose run --rm redis redis-cli DBSIZE
```
