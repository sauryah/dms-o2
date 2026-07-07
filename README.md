# DMS

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](LICENSE)
[![Python Version](https://img.shields.io/badge/python-3.11-blue.svg)](backend)
[![Go Version](https://img.shields.io/badge/go-1.21-blue.svg)](go-api)
[![React Version](https://img.shields.io/badge/react-18-blue.svg)](frontend)

An industrial-grade, high-performance Local Area Network (LAN) platform for tracking, inventory management, and auditing of manufacturing dies. Designed for low latency, high concurrency shop floor operations, and offline resilience.

## Screenshot

![DMS dashboard screenshot](docs/assets/dms-screenshot.png)

---

## 📖 Table of Contents
* [Overview & Architecture](#-overview--architecture)
* [Key Features](#-key-features)
* [Tech Stack](#-tech-stack)
* [Installation & Quick Start](#-installation--quick-start)
* [Usage Guide](#-usage-guide)
* [Configuration](#-configuration)
* [Project Structure](#-project-structure)
* [Deployment & Upgrades](#-deployment--upgrades)
* [Backup & Recovery](#-backup--recovery)
* [Contributing](#-contributing)
* [License](#-license)
* [Credits](#-credits)
* [FAQ](#-faq)
* [Troubleshooting](#-troubleshooting)

---

## 💡 Overview & Architecture

DMS is built as a microservice-oriented application optimized to deliver sub-millisecond read latency over local area networks (LAN). It uses a hybrid query execution design: fuzzy text searches are routed to Meilisearch, and numeric range queries run directly on PostgreSQL.

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

## 🚀 Key Features

*   **Precision Die Modeling**: Custom tracking for **Round dies** (casing, current size, original size) and **Flat dies** (width, thickness, corner radius).
*   **Interactive CAD Highlighting**: Bidirectional vector highlight syncing. Hovering over dimensions in tables glows the corresponding blueprint SVG node, and vice versa.
*   **Visual Storage Rack Map**: Drag-and-drop grid interface representing physical warehouse racks for quick inventory relocation.
*   **Fuzzy & Parametric Search**: Blazing-fast lookup leveraging the Go search microservice with Redis caching, PostgreSQL range queries, and Meilisearch.
*   **Granular Role-Based Access Control (RBAC)**:
    *   *Unauthenticated/Operator*: Read-only search, view metrics, and browse inventory.
    *   *Admin*: Full CRUD on dies/machines/sets, and bulk spreadsheet imports.
    *   *Root*: User administration, database backup/restore operations, and system configuration.
*   **Immutable Auditing**: Database triggers and Django pre-save signals capture all modifications to die status, location, and dimensions.
*   **Session Management**: Concurrent session control with immediate eviction of previous logins upon new sign-ins.
*   **Sheet-to-Database Import**: Validation-backed, idempotent CSV/Excel import system.

---

## 💻 Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React, Vite, Vanilla CSS | React 18, Vite | Single Page Application |
| **Backend API** | Python, Django, DRF | Python 3.11, Django 4.2 | Relational API, RBAC, Core logic |
| **Search API** | Go (Golang) | 1.21 / 1.22 | High-performance read-only queries |
| **Databases** | PostgreSQL, Meilisearch | Postgres 18, Meili v1.7 | Relational storage & Fuzzy text index |
| **Caching** | Redis | 7 (Alpine) | Search query result cache |
| **Ingress/Proxy** | Traefik | v3 | Ingress, Routing, and TLS termination |
| **Testing** | Vitest, Playwright, PyTest | - | Unit, Integration, and E2E Testing |

---

## 🏁 Installation & Quick Start

### Prerequisites
*   **Docker** & **Docker Compose** (V2+)
*   **Node.js** (v18+) & **npm** (only required for local developer running)
*   **Python 3.11** (only required for local Django execution)

### Automated Setup
The system provides a automated installer that copies settings, builds containers, seeds database structures, and runs search index updates.

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
> **LAN Network Access**
> On completion, the setup scripts output your LAN IP address (e.g., `http://192.168.1.15`). Any device on the same local network can access the frontend dashboard directly.

### Manual Setup (Alternative)
1.  **Environment Settings**:
    ```bash
    cp .env.example .env
    ```
2.  **Start Services**:
    ```bash
    docker compose up -d --build
    ```
3.  **Run Database Migrations & Seeds**:
    ```bash
    docker compose exec django python manage.py migrate
    docker compose exec django python manage.py create_root_user
    ```
4.  **Sync Search Indexes**:
    Execute the index synchronization CLI tool:
    ```bash
    docker compose exec django python manage.py sync_search
    ```

### Access Interfaces
*   **Frontend SPA**: [http://localhost](http://localhost)
*   **Django Admin Console**: [http://localhost/admin/](http://localhost/admin/)
*   **REST API Root**: [http://localhost/api/](http://localhost/api/)
*   **Default Root Credentials**: Username: `root` | Password: `root123` (Configured in `.env`)

---

## ⚙️ Configuration

System variables are managed inside the [.env](file:///home/sahil/Projects/dms-o2/.env) file located in the project root.

> [!WARNING]
> Ensure all secret keys and passwords are changed in production environments. Never commit `.env` to git repositories.

| Key | Default Value | Description |
| :--- | :--- | :--- |
| `POSTGRES_DB` | `dms` | Target PostgreSQL database name |
| `POSTGRES_USER` | `dms_user` | Database user account |
| `POSTGRES_PASSWORD` | `your_db_password` | Database access password |
| `POSTGRES_HOST` | `db` | Database service host inside Docker network |
| `POSTGRES_PORT` | `5432` | PostgreSQL network port |
| `MEILI_HOST` | `http://meilisearch:7700` | Search service connection endpoint |
| `MEILI_MASTER_KEY` | *auto-generated* | Meilisearch authorization key |
| `ROOT_USERNAME` | `root` | Superuser username |
| `ROOT_PASSWORD` | `root123` | Default administrator password |
| `SESSION_IDLE_TIMEOUT_MINUTES` | `30` | Minutes before idle session expires |
| `SESSION_ABSOLUTE_TIMEOUT_HOURS`| `12` | Absolute hours before user is forced to log in again |

---

## 📋 Project Structure

```
dms-o2/
├── .github/workflows/         # CI/CD Deployment configurations
├── backend/                   # Django Backend Service
│   ├── dies/                  # Die models, database signals, and viewsets
│   ├── history/               # Audit logging logic and model hooks
│   ├── machines/              # Assets (Categories, Machines, Tool Sets)
│   └── users/                 # RBAC and session timeout tracking
├── go-api/                    # Go Search & Stats Microservice
│   ├── main.go                # API routes and Redis invalidation cache logic
│   └── Dockerfile             # Multi-stage container file
├── frontend/                  # React Frontend Single Page Application
│   ├── src/               # UI components, layout grids, hooks
│   └── Dockerfile.prod        # Production static Nginx configuration
├── docs/                      # Documentation folder
│   └── ARCHITECTURE.md        # Deep architectural design specs
├── design-system/             # CSS tokens and design specs
│   └── die-management-system/
│       └── MASTER.md          # Global design components and tokens
├── deploy.sh                  # Production upgrade script
└── dms-backup.sh              # Database backup and restore script
```

*   Detailed Architecture specs can be found in [docs/ARCHITECTURE.md](file:///home/sahil/Projects/dms-o2/docs/ARCHITECTURE.md).
*   Visual UI styling guidelines are located in [design-system/die-management-system/MASTER.md](file:///home/sahil/Projects/dms-o2/design-system/die-management-system/MASTER.md).

---

## 🛠️ Usage Guide

### Common Container Tasks
*   **Start the container stack**:
    ```bash
    docker compose up -d
    ```
*   **Stop the stack (without deleting data)**:
    ```bash
    docker compose stop
    ```
*   **Bring the stack down (cleans containers and networks)**:
    ```bash
    docker compose down
    ```
*   **View container logs**:
    ```bash
    docker compose logs -f
    ```
*   **Database Interactive CLI**:
    ```bash
    docker compose exec db psql -U dms_user -d dms
    ```

### Keyboard Navigation
Within the main navigation search bar, the UI supports:
*   `ArrowDown` / `ArrowUp` to traverse list results.
*   `Tab` / `Shift+Tab` to focus fields.
*   `Enter` to select highlighted inventory records.

---

## 🚀 Deployment & Upgrades

Production-optimized assets use a high-concurrency setup:
1.  **Nginx**: Serves compiled React assets with Gzip compression.
2.  **Gunicorn**: Serves the Django backend WSGI server.
3.  **Go Endpoint**: Bypasses Django entirely for high-speed read operations on `/api/go/*`.

### Production Deployment Script
To deploy upgrades without downtime, use the integrated deployment automation script:
```bash
./deploy.sh
```
This script pulls updates, verifies configuration files, builds changed containers, runs SQL migrations, and clears legacy docker caches.

---

## 💾 Backup & Recovery

A scheduled database container performs compressed dumps nightly at **2:00 AM** and persists them to the host folder `./backups/` with a **14-day retention cycle**.

### Command Utility (`dms-backup.sh`)
*   **Create a manual backup**:
    ```bash
    ./dms-backup.sh backup
    ```
*   **List all local backups**:
    ```bash
    ./dms-backup.sh list
    ```
*   **Restore the database**:
    ```bash
    ./dms-backup.sh restore <backup_filename.dump>
    ```
    *Note: Restoring a database will overwrite current records and trigger an automatic rebuild of Meilisearch search indexes.*

---

## 🤝 Contributing

Contributions are welcome! Please review [CONTRIBUTING.md](file:///home/sahil/Projects/dms-o2/CONTRIBUTING.md) for local development setup, testing workflows, and PR processes.

---

## 📄 License & Commercial Licensing

DMS is dual-licensed under the following terms:

1. **Open Source**: DMS is licensed under the strong copyleft [GNU AGPL v3](LICENSE) license. Anyone can use, modify, and distribute this software for free, provided that all modifications and backend source codes are also made open source under the AGPL (even when run as a network service).
2. **Commercial License**: If you wish to use DMS in a commercial/proprietary environment without being bound by the copyleft obligations of the AGPL (e.g., keeping your custom modifications or factory configurations private), please contact the author to acquire a commercial license.

---

## 👥 Credits

Developed for industrial manufacturing shop floors by Sahil Pradhan.

---

## ❓ FAQ

#### How is concurrent session eviction handled?
DMS enforces a single active session policy. When a user signs in from a different terminal or browser session, the previous session is immediately invalidated (returning `401 Unauthorized` on old requests).

#### How do I re-sync search indexes manually?
If database records and Meilisearch indexes are out of sync, trigger a full re-index run:
```bash
docker compose exec django python manage.py sync_search
```

#### Can unauthenticated users move dies?
No. Moving dies, adding new records, or editing states requires **Admin** or **Root** permissions. Unauthenticated users are strictly limited to search and view actions.

---

## ⚠️ Troubleshooting

| Symptoms | Cause | Solution |
| :--- | :--- | :--- |
| **Meilisearch connection error** | Dev config host mapping mismatch | Inside Docker networks, configure `MEILI_HOST=http://meilisearch:7700`. For direct local runs, set `MEILI_HOST=http://localhost:7700`. |
| **Port conflict on 80/443** | Another server (Nginx/Apache) is running on the host | Disable host server: `sudo systemctl stop nginx`, or change port bindings in `docker-compose.yml`. |
| **Write/Compile permission denied** | Root-owned files left in mounting volume | Run cleanup command: `docker compose exec frontend rm -rf dist` and restart. |
| **401 Unauthorized loops** | Database state was reset or session invalidated | Clear local storage in browser devtools and log in again. |
| **Cannot connect/access from phone or external device** | 1. Host IP not allowed in Django.<br>2. Windows Network Category is Public.<br>3. Firewall blocking Docker Backend. | **1.** Add the laptop's network IP address or `*` to `DJANGO_ALLOWED_HOSTS` in your `.env` file, then restart containers.<br>**2.** On Windows, set your network profile to **Private** in admin PowerShell: `Set-NetConnectionProfile -InterfaceAlias Wi-Fi -NetworkCategory Private`. <br>**3.** Update Docker's inbound rules to apply to all profiles: `Get-NetFirewallRule -DisplayName "Docker Desktop Backend" \| Set-NetFirewallRule -Profile Any`. |

