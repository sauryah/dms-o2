# DMS-O2

[![GitHub Release](https://img.shields.io/github/v/release/sauryah/dms-o2?style=flat-square)](https://github.com/sauryah/dms-o2/releases)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg?style=flat-square)](LICENSE)
[![Docker Pulls](https://img.shields.io/docker/pulls/sauryah/dms-backend?style=flat-square)](https://hub.docker.com/r/sauryah/dms-backend)
[![Build Status](https://img.shields.io/github/actions/workflow/status/sauryah/dms-o2/docker-publish.yml?branch=main&style=flat-square)](https://github.com/sauryah/dms-o2/actions)
[![Python Version](https://img.shields.io/badge/Python-3.11-blue.svg?style=flat-square&logo=python)](backend)
[![Go Version](https://img.shields.io/badge/Go-1.22-blue.svg?style=flat-square&logo=go)](go-api)
[![React Version](https://img.shields.io/badge/React-18-blue.svg?style=flat-square&logo=react)](frontend)
[![GitHub Stars](https://img.shields.io/github/stars/sauryah/dms-o2?style=flat-square)](https://github.com/sauryah/dms-o2/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/sauryah/dms-o2?style=flat-square)](https://github.com/sauryah/dms-o2/network/members)

An industrial-grade, high-performance Local Area Network (LAN) platform for tracking, inventory management, and auditing of manufacturing dies. Designed for low latency, high concurrency shop floor operations, and offline resilience.

## Screenshot

![DMS dashboard screenshot](docs/assets/dms-screenshot.png)

---

## Table of Contents

* [Screenshot](#screenshot)

* [Overview & Architecture](#overview--architecture)
* [Key Features](#key-features)
* [Tech Stack](#tech-stack)
* [Quick Start](#quick-start)
* [Deploy with Docker (No Source Code)](#deploy-with-docker-no-source-code)
* [Configuration](#configuration)
* [Project Structure](#project-structure)
* [Usage Guide](#usage-guide)
* [Deployment & Upgrades](#deployment--upgrades)
* [Backup & Recovery](#backup--recovery)
* [Security](#security)
* [LAN HTTPS Access from Other Computers](#lan-https-access-from-other-computers)
* [Roadmap](#roadmap)
* [FAQ](#faq)
* [Troubleshooting](#troubleshooting)
* [Licensing & Compliance](#licensing--compliance)
* [Contributing](#contributing)
* [Support](#support)
* [Credits](#credits)

---

## Overview & Architecture

DMS-O2 is built as a microservice-oriented application optimized to deliver sub-millisecond read latency over local area networks (LAN). It uses a hybrid query execution design: fuzzy text searches are routed to Meilisearch, and numeric range queries run directly on PostgreSQL.

```mermaid
graph TD
    User([LAN Operator / Admin]) -->|HTTP/HTTPS| Traefik[Traefik v3 Reverse Proxy]
    
    subgraph Container Stack
        Traefik -->|/api/go/*| GoAPI[Go Search API Microservice]
        Traefik -->|/api/* & /admin/*| Django[Django 4.2 Web Server]
        Traefik -->|/*| Nginx[Nginx Static Frontend Server]
        
        Django -->|Celery Workers| Celery[Celery Tasks]
        Django -->|Relational SQL / Audit Signals| Postgres[(PostgreSQL 18)]
        
        GoAPI -->|Fuzzy Lookup| Meili[(Meilisearch v1.7)]
        GoAPI -->|Cache Store| Redis[(Redis 7)]
        GoAPI -->|Range Queries| Postgres
        
        Postgres -->|LISTEN/NOTIFY Cache Invalidation| GoAPI
    end
```

---

## Key Features

* **Precision Die Modeling**: Custom tracking for **Round dies** (casing, current size, original size) and **Flat dies** (width, thickness, corner radius).
* **Interactive CAD Highlighting**: Bidirectional vector highlight syncing. Hovering over dimensions in tables glows the corresponding blueprint SVG node, and vice versa.
* **Visual Storage Rack Map**: Drag-and-drop grid interface representing physical warehouse racks for quick inventory relocation.
* **Fuzzy & Parametric Search**: Blazing-fast lookup leveraging the Go search microservice with Redis caching, PostgreSQL range queries, and Meilisearch.
* **Granular Role-Based Access Control (RBAC)**:
  * *Unauthenticated/Operator*: Read-only search, view metrics, and browse inventory.
  * *Admin*: Full CRUD on dies/machines/sets, and bulk spreadsheet imports.
  * *Root*: User administration, database backup/restore operations, and system configuration.
* **Immutable Auditing**: Database triggers and Django pre-save signals capture all modifications to die status, location, and dimensions.
* **Session Management**: Concurrent session control with immediate eviction of previous logins upon new sign-ins.
* **Sheet-to-Database Import**: Validation-backed, idempotent CSV/Excel import system.
* **Engineering Tools Suite**: Integrated die calculators, including the **Sizing & Elongation Calculator** and the high-fidelity **Wire Drawing Elongation Calculator** featuring interactive results tables, Suggesters, and PDF/Excel/CSV exports.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, Vite, Vanilla CSS | React 18, Vite | Single Page Application |
| **Backend API** | Python, Django, DRF | Python 3.11, Django 4.2 | Relational API, RBAC, Core logic |
| **Search API** | Go (Golang) | 1.22 | High-performance read-only queries |
| **Databases** | PostgreSQL, Meilisearch | Postgres 18, Meili v1.7 | Relational storage & Fuzzy text index |
| **Caching** | Redis | 7 (Alpine) | Search query result cache |
| **Ingress/Proxy** | Traefik | v3 | Ingress, Routing, and TLS termination |
| **Testing** | Vitest, Playwright, PyTest | - | Unit, Integration, and E2E Testing |

---

## Quick Start

### Prerequisites

* **Docker** & **Docker Compose** (V2+)
* **Node.js** (v18+) & **npm** (only required for local developer running)
* **Python 3.11** (only required for local Django execution)

### Automated Setup

The system provides an automated installer that copies settings, builds containers, seeds database structures, and runs search index updates.

#### Linux & macOS

```bash
chmod +x setup.sh
./setup.sh
```

#### Windows (PowerShell)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
./setup.ps1
```

> [!TIP]
> **Using Make**
> A `Makefile` is provided with common commands. Run `make help` to see all available targets (setup, certs, start, stop, logs, backup, etc.).

> [!TIP]
> **LAN Network Access**
> On completion, the setup scripts output your LAN IP address (e.g., `https://192.168.1.15`). Any device on the same local network can access the frontend dashboard directly. To access from other computers without browser warnings, install the root CA certificate — see [LAN HTTPS Access from Other Computers](#lan-https-access-from-other-computers).

### Manual Setup (Alternative)

1. **Environment Settings**:

   ```bash
   cp .env.example .env
   ```

2. **Start Services**:

   ```bash
   docker compose up -d --build
   ```

3. **Run Database Migrations & Seeds**:

   ```bash
   docker compose exec django python manage.py migrate
   docker compose exec django python manage.py create_root_user
   ```

4. **Sync Search Indexes**:
   Execute the index synchronization CLI tool:

   ```bash
   docker compose exec django python manage.py sync_search
   ```

### Access Interfaces

* **Frontend SPA**: [https://localhost](https://localhost)
* **Django Admin Console**: [https://localhost/admin/](https://localhost/admin/)
* **REST API Root**: [https://localhost/api/](https://localhost/api/)
* **Default Root Credentials**: Generated by `setup.sh` (check your `.env` file)

> [!NOTE]
> DMS uses HTTPS by default. The setup scripts automatically generate TLS certificates for your LAN IP using [mkcert](https://github.com/FiloSottile/mkcert). HTTP requests are automatically redirected to HTTPS.

---

## Deploy with Docker (No Source Code)

You can deploy DMS-O2 instantly using **pre-built Docker images** without cloning this repository:

```bash
mkdir dms && cd dms
curl -LO https://raw.githubusercontent.com/sauryah/dms-o2/main/docker-compose.ghcr.yml
curl -LO https://raw.githubusercontent.com/sauryah/dms-o2/main/.env.example
cp .env.example .env   # ← edit passwords & keys!
docker compose -f docker-compose.ghcr.yml up -d
```

For detailed deployment instructions, including Windows PowerShell/Command Prompt scripts, automated backups, and version pinning, see the [Docker Deployment Guide](DOCKER.md).

---

## Configuration

System variables are managed inside the `.env` file located in the project root.

> [!WARNING]
> Ensure all secret keys and passwords are changed in production environments. Never commit `.env` to git repositories.

| Key | Default Value | Description |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `dms` | Target PostgreSQL database name |
| `POSTGRES_USER` | `dms_user` | Database user account |
| `POSTGRES_PASSWORD` | `your_db_password` | Database access password |
| `POSTGRES_HOST` | `db` | Database service host inside Docker network |
| `POSTGRES_PORT` | `5432` | PostgreSQL network port |
| `REDIS_PASSWORD` | `change_me_redis_password` | Redis auth password; must match `docker-compose.yml` and all `CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` values |
| `DJANGO_SECRET_KEY` | `your-secret-key` | Django secret key for session signing and CSRF |
| `INTERNAL_API_SECRET` | `your-internal-secret` | Shared secret for Django ↔ Go API communication |
| `CELERY_BROKER_URL` | `redis://:change_me_redis_password@redis:6379/0` | Redis connection URL for Celery message broker |
| `CELERY_RESULT_BACKEND` | `redis://:change_me_redis_password@redis:6379/0` | Redis connection URL for Celery task results |
| `MEILI_HOST` | `http://meilisearch:7700` | Search service connection endpoint |
| `MEILI_MASTER_KEY` | *auto-generated* | Meilisearch authorization key |
| `ROOT_USERNAME` | `root` | Superuser username |
| `ROOT_PASSWORD` | *(generated by setup.sh)* | Default administrator password |
| `SESSION_IDLE_TIMEOUT_MINUTES` | `30` | Minutes before idle session expires |
| `SESSION_ABSOLUTE_TIMEOUT_HOURS` | `12` | Absolute hours before user is forced to log in again |

---

## Project Structure

```text
dms-o2/
├── .github/workflows/         # CI/CD Deployment configurations
├── .githooks/                 # Git hooks (pre-commit linting & secret detection)
├── backend/                   # Django Backend Service
│   ├── dies/                  # Die models, database signals, and viewsets
│   ├── history/               # Audit logging logic and model hooks
│   ├── machines/              # Assets (Categories, Machines, Tool Sets)
│   └── users/                 # RBAC and session timeout tracking
├── certs/                     # TLS certificates (generated, gitignored)
│   ├── cert.pem               # Server certificate for current LAN IP
│   ├── key.pem                # Private key
│   └── rootCA.pem             # Root CA (install on client machines)
├── go-api/                    # Go Search & Stats Microservice
│   ├── cmd/server/main.go     # API routes and Redis invalidation cache logic
│   └── Dockerfile             # Multi-stage container file
├── frontend/                  # React Frontend Single Page Application
│   ├── src/                   # UI components, layout grids, hooks
│   └── Dockerfile.prod        # Production static Nginx configuration
├── scripts/                   # Utility scripts
│   ├── generate-certs.sh      # Auto-generate TLS certs (Linux/macOS)
│   ├── generate-certs.bat     # Auto-generate TLS certs (Windows)
│   ├── install-cert.bat       # Install rootCA on Windows clients
│   ├── backup_db.sh           # Database backup script
│   └── prune_history.sh       # Audit history retention cleanup
├── docs/                      # Documentation folder
│   └── ARCHITECTURE.md        # Deep architectural design specs
├── design-system/             # CSS tokens and design specs
│   └── die-management-system/
│       └── MASTER.md          # Global design components and tokens
├── Makefile                   # Common dev commands (make help)
├── traefik.yml                # Traefik static config (entrypoints, providers)
├── dynamic.yml                # Traefik dynamic config (TLS store, certificates)
├── docker-compose.yml         # Local development compose stack
├── docker-compose.prod.yml    # Production compose stack
├── docker-compose.ghcr.yml    # Pre-built image compose stack
├── setup.sh                   # Automated setup (Linux/macOS)
├── setup.ps1                  # Automated setup (Windows)
├── deploy.sh                  # Production upgrade script
└── dms-backup.sh              # Database backup and restore script
```

* Detailed Architecture specs can be found in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
* Visual UI styling guidelines are located in [design-system/die-management-system/MASTER.md](design-system/die-management-system/MASTER.md).

---

## Usage Guide

### Using Make (Recommended)

Run `make help` to see all available commands:

| Command | Description |
| :--- | :--- |
| `make setup` | Full automated setup (Docker + DB + certs) |
| `make certs` | Regenerate TLS certificates for current LAN IP |
| `make start` | Start all containers |
| `make stop` | Stop all containers |
| `make logs` | Tail all container logs |
| `make migrate` | Run database migrations |
| `make backup` | Run manual database backup |
| `make build` | Rebuild and restart all containers |

### Common Container Tasks

* **Start the container stack**:

  ```bash
  docker compose up -d
  ```

* **Stop the stack (without deleting data)**:

  ```bash
  docker compose stop
  ```

* **Bring the stack down (cleans containers and networks)**:

  ```bash
  docker compose down
  ```

* **View container logs**:

  ```bash
  docker compose logs -f
  ```

* **Database Interactive CLI**:

  ```bash
  docker compose exec db psql -U dms_user -d dms
  ```

### Keyboard Navigation

Within the main navigation search bar, the UI supports:

* `ArrowDown` / `ArrowUp` to traverse list results.
* `Tab` / `Shift+Tab` to focus fields.
* `Enter` to select highlighted inventory records.

---

## Deployment & Upgrades

Production-optimized assets use a high-concurrency setup:

1. **Nginx**: Serves compiled React assets with Gzip compression.
2. **Gunicorn**: Serves the Django backend WSGI server.
3. **Go Endpoint**: Bypasses Django entirely for high-speed read operations on `/api/go/*`.

### Production Deployment Script

To deploy upgrades without downtime, use the integrated deployment automation script:

```bash
./deploy.sh
```

This script pulls updates, verifies configuration files, builds changed containers, runs SQL migrations, and clears legacy docker caches.

---

## Backup & Recovery

A scheduled database container performs compressed dumps nightly at **2:00 AM** and persists them to the host folder `./backups/` with a **14-day retention cycle**.

### Command Utility (`dms-backup.sh`)

* **Create a manual backup**:

  ```bash
  ./dms-backup.sh backup
  ```

* **List all local backups**:

  ```bash
  ./dms-backup.sh list
  ```

* **Restore the database**:

  ```bash
  ./dms-backup.sh restore <backup_filename.dump>
  ```

  *Note: Restoring a database will overwrite current records and trigger an automatic rebuild of Meilisearch search indexes.*

---

## Security

DMS-O2 is maintained with security as a priority. Key security measures include:

* **HTTPS Everywhere**: Traefik terminates TLS using locally-trusted certificates generated by [mkcert](https://github.com/FiloSottile/mkcert). HTTP requests are automatically redirected to HTTPS.
* **JWT tokens** stored in localStorage (httpOnly cookie migration is on the roadmap).
* **`INTERNAL_API_SECRET`** enforced via timing-safe comparison (`hmac.compare_digest`).
* **Redis authentication** via `--requirepass` on all Redis clients (Go API, Django cache, Celery broker).
* **Nginx security headers**: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`.
* **SQL injection prevention** with parameterized queries and input validation on all shell scripts.
* **Celery task safety** — backup restore tasks pass token hashes instead of raw JWTs through the message broker.

### TLS Certificates

DMS generates TLS certificates automatically during setup using [mkcert](https://github.com/FiloSottile/mkcert). Certificates are:

* **Auto-generated** for your machine's LAN IP address during `setup.sh` / `setup.ps1`
* **Stored locally** in `certs/` (excluded from git via `.gitignore`)
* **Valid for 2 years** from the date of generation
* **Regenerable** by running `scripts/generate-certs.sh` (Linux/macOS) or `scripts/generate-certs.bat` (Windows)

To access from another computer on the same network without browser warnings, see [LAN HTTPS Access from Other Computers](#lan-https-access-from-other-computers) below.

If you identify a security issue, please review our [Security Policy](SECURITY.md) for details on responsible vulnerability reporting.

---

## LAN HTTPS Access from Other Computers

To access DMS from another computer on the same network **without browser warnings**, install the root CA certificate on each client machine.

### Step 1: Copy the Root CA

On the DMS server, copy these files from the `certs/` folder to the other computer:

```text
certs/rootCA.cer    ← install this (DER format, works on Windows)
```

Copy via USB, network share, email, etc.

### Step 2: Install the Certificate

**Option A — Command Line (Recommended)**

Open **PowerShell as Administrator** on the other computer and run:

```powershell
certutil -addstore -f "Root" rootCA.cer
```

**Option B — Windows GUI**

1. Double-click `rootCA.cer`
2. Click **Install Certificate**
3. Select **Local Machine** → Next
4. Select **Place all certificates in the following store** → Browse
5. Select **Trusted Root Certification Authorities** → OK → Next → Finish

**Option C — Firefox**

Firefox uses its own certificate store:

1. Open `about:preferences#privacy` in Firefox
2. Scroll to **Certificates** → click **View Certificates**
3. Go to **Authorities** tab → click **Import**
4. Select `rootCA.cer`
5. Check **Trust this CA to identify websites** → OK
6. Restart Firefox

### Step 3: Verify

Open `https://<DMS_SERVER_IP>` in the browser. It should show as secure with no warnings.

### Regenerating Certificates

If the server's IP address changes, regenerate the certificates:

```bash
# Linux/macOS
./scripts/generate-certs.sh

# Windows
scripts\generate-certs.bat
```

Or run `mkcert` directly, replacing `YOUR_LAN_IP` with your actual IP (e.g., `192.168.10.71`):

```bash
mkcert -install
mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 127.0.0.1 YOUR_LAN_IP ::1
```

After generating, restart Traefik:

```bash
docker compose up -d --force-recreate traefik
```

Then redistribute `rootCA.cer` to all client machines and reinstall it.

---

## Roadmap

The current priorities and roadmap items for DMS-O2 include:

* **CAD Engine Extensions:** Direct import support for DWG/DXF dimensional schematics.
* **Expanded Analytics:** Graphical historical wear trends and predictive cycle life tracking.
* **Multi-Warehouse Syncing:** Inter-facility inventory transfers with audit chain validation.
* **ScyllaDB Migration:** Evaluation of high-throughput timeseries storage for die history logs.

---

## FAQ

### How is concurrent session eviction handled?

DMS enforces a single active session policy. When a user signs in from a different terminal or browser session, the previous session is immediately invalidated (returning `401 Unauthorized` on old requests).

### How do I re-sync search indexes manually?

If database records and Meilisearch indexes are out of sync, trigger a full re-index run:

```bash
docker compose exec django python manage.py sync_search
```

### Can unauthenticated users move dies?

No. Moving dies, adding new records, or editing states requires **Admin** or **Root** permissions. Unauthenticated users are strictly limited to search and view actions.

---

## Troubleshooting

| Symptoms | Cause | Solution |
| :--- | :--- | :--- |
| **Meilisearch connection error** | Dev config host mapping mismatch | Inside Docker networks, configure `MEILI_HOST=http://meilisearch:7700`. For direct local runs, set `MEILI_HOST=http://localhost:7700`. |
| **Port conflict on 80/443** | Another server (Nginx/Apache) is running on the host | Disable host server: `sudo systemctl stop nginx`, or change port bindings in `docker-compose.yml`. Both ports 80 (HTTP) and 443 (HTTPS) must be available. |
| **Write/Compile permission denied** | Root-owned files left in mounting volume | Run cleanup command: `docker compose exec frontend rm -rf dist` and restart. |
| **401 Unauthorized loops** | Database state was reset or session invalidated | Clear local storage in browser devtools and log in again. |
| **Dies missing from sidebar tree / showing 0 count** | Database has scaled beyond the default pagination limit | Increase the default `pageSize` state variable in `frontend/src/features/inventory/hooks/useInventoryState.ts` and rebuild the frontend: `docker compose up -d --build frontend`. |
| **Cannot connect/access from phone or external device** | Host IP not allowed in Django, Windows Network Category is Public, or Firewall blocking Docker Backend. | Add the laptop's network IP address or `*` to `DJANGO_ALLOWED_HOSTS` in your `.env` file, then restart containers. On Windows, set your network profile to **Private** in admin PowerShell: `Set-NetConnectionProfile -InterfaceAlias Wi-Fi -NetworkCategory Private`. Update Docker's inbound rules to apply to all profiles. |
| **Browser shows "Not Secure" or certificate warning** | Root CA certificate not installed on client machine. | See [LAN HTTPS Access from Other Computers](#lan-https-access-from-other-computers) to install the root CA. For Firefox, import via `about:preferences#privacy`. |
| **`ERR_CERT_AUTHORITY_INVALID` in Chrome** | Chrome uses its own root store and ignores Windows certificate store. | Import the root CA via `chrome://settings/certificates` → Authorities → Import. Or use Microsoft Edge which uses the Windows store. |
| **Certificate does not match IP (DNS/IP SAN error)** | Server IP changed after certificates were generated. | Regenerate certificates: `scripts\generate-certs.bat` (Windows) or `./scripts/generate-certs.sh` (Linux/macOS), then reinstall the root CA on client machines. |
| **Locked out / forgot root password** | Root password lost or compromised | Reset via Docker exec: `docker compose exec -T django python manage.py changepassword root` (enter new password when prompted). |

---

## Licensing & Compliance

DMS-O2 is a dual-licensed project designed to offer flexibility for both open-source development and proprietary commercial use:

1. **Open Source (GNU AGPL-3.0)**: Free to run, copy, modify, and distribute. However, if you modify the software and host it over a network, you **must make your modifications publicly available** under the AGPL-3.0. Review the full terms in the [LICENSE](LICENSE) file.
2. **Commercial License**: If your organization has policies against AGPL software, or you wish to make proprietary modifications without disclosing your source code, you must obtain a commercial license. Review details in [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) or contact the maintainers.

For detailed intellectual property and branding rules, see:

* **Copyright Details:** [COPYRIGHT.md](COPYRIGHT.md)
* **Trademark Guidelines:** [TRADEMARK.md](TRADEMARK.md)

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for local development setup instructions, testing workflows, and information on our Contributor License Agreement (CLA) that permits dual-licensing of your changes.

### Pre-commit Hooks

A pre-commit hook is included in `.githooks/pre-commit` that checks Python syntax, detects `console.log` statements in JS/TS, validates Dockerfiles, and scans for accidental secret leaks. To enable:

```bash
git config core.hooksPath .githooks
```

---

## Support

For deployment support, bug reports, and customization help, check our [Support Guide](SUPPORT.md) to choose the best community or commercial support channel.

---

## Credits

Developed for industrial manufacturing shop floors by Sahil Pradhan.
