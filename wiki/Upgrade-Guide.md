# Upgrade Guide — DMS v1.4.0

This guide outlines the step-by-step instructions for upgrading the Die Management System (DMS) deployment to **v1.4.0**.

> [!IMPORTANT]
> This release includes a database schema migration affecting `UserSession` models. Ensure you backup your database before proceeding.

---

## 1. Pull Latest Release
Navigate to the root of your workspace and pull the release tags/commits:
```bash
git fetch --tags
git checkout tags/v1.4.0
```

## 2. Apply Database Migrations
Run Django database migrations to update the session models (altering token hash and related indexes):
```bash
docker-compose exec backend python manage.py migrate
```

## 3. Rebuild and Restart Services
Rebuild the container configurations to incorporate frontend package updates, HTTPOnly cookie authentication setups, and the internal key secret checks:
```bash
docker-compose down
docker-compose up -d --build
```

## 4. Post-Deployment Verification
Verify that both unit and E2E test suites are passing perfectly in the upgraded environment:

### Django Backend Tests
```bash
docker-compose exec backend python manage.py test
```

### Go Search API Tests
```bash
cd go-api && go test ./...
```

### React Frontend Tests
```bash
cd frontend && npm run test
```
