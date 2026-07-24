# Upgrade Guide — DMS v1.9.2

This guide outlines the step-by-step instructions for upgrading your Die Management System (DMS) deployment to **v1.9.2**.

> [!IMPORTANT]
> **Backup Notice:** This release introduces 3D WebGL stress heatmap visualizer, CAD theory inspector, granular tool permissions tree, dynamic chunk import recovery, and location grid enhancements. Please back up your PostgreSQL database using the `./dms-backup.sh backup` tool before performing any upgrade tasks.

---

## Upgrade Method 1: Using Pre-Built Docker Images (Recommended)

Beginning with v1.6.0+, you no longer need to clone the source code on your production host. You can deploy and upgrade using pre-built images fetched directly from GitHub Container Registry (GHCR).

### 1. Download Configuration Files
Navigate to your deployment directory (e.g., `dms`) and download the updated compose file:
```bash
curl -LO https://raw.githubusercontent.com/sauryah/dms-o2/main/docker-compose.ghcr.yml
```

### 2. Update Environment Configuration
Ensure your `.env` contains all required variables defined in the latest `.env.example`.
To pin your deployment to v1.9.2, add the following line to your `.env` file:
```env
DMS_VERSION=1.9.2
```

### 3. Stop Legacy Containers
If you are running the source-built container stack, stop it first:
```bash
docker compose down
```

### 4. Deploy v1.9.2
Launch the new stack. Database migrations will run automatically on startup:
```bash
docker compose -f docker-compose.ghcr.yml up -d
```

---

## Upgrade Method 2: Building from Source (Standard Git Flow)

If your deployment relies on building images from source code, follow this standard Git-based workflow:

### 1. Pull the v1.9.2 Tag
```bash
git fetch --tags
git checkout tags/v1.9.2
```

### 2. Apply Database Migrations
Run the Django migrations to update database indices and cache schemas:
```bash
docker compose exec django python manage.py migrate
```

### 3. Rebuild and Restart Components
Rebuild the container configurations to incorporate frontend bundle updates and Go search API optimization:
```bash
docker compose down
docker compose up -d --build
```

---

## 5. Post-Deployment Verification

Verify that your upgraded container stack is fully operational:

### Check Service Health
```bash
docker compose -f docker-compose.ghcr.yml ps
```

### Force Sync Search Indexes
```bash
docker compose -f docker-compose.ghcr.yml exec django python manage.py sync_search
```
