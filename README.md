# DMS — Die Management System

## Overview
DMS (Die Management System) is an industrial LAN-based tracking platform designed to monitor production dies, record history of every change, and provide fast search functionality. The application manages different types of dies (Round and Flat dies), assigns them to machine sets, tracks status updates (e.g., Available, Running, Cleaning, etc.), and maintains a detailed history log of all status and parameter updates.

---

## Features
- **Die Tracking**: Support for Round dies (size) and Flat dies (width, thickness, radius).
- **Audit History**: Automatic, signal-driven tracking of status, set changes, location, and parameters.
- **Fuzzy & Parametric Search**: Blazing fast search using Meilisearch for text/casing/location and PostgreSQL for decimal ranges.
- **Role-Based Access Control**:
  - *Unauthenticated*: Search and view only.
  - *Admin*: Add, edit, delete, and bulk import dies.
  - *Root*: Admin management (create/deactivate admins) and system configuration.
- **Session Management**: One active session per user with automatic idle timeout (30 min) and absolute timeout (12 hours).
- **Bulk Import**: Idempotent spreadsheet import (CSV and Excel/XLSX) with detailed row-by-row validation.
- **Dockerized Architecture**: Simplified deployment using Docker Compose and Traefik v3.

---

## Tech Stack
- **Backend**:
  - Python 3.11, Django 4.2, Django REST Framework, Django Simple JWT, OpenPyXL (relational CRUD, admin, auth, exports)
  - Go (Golang) microservice (high-performance read and search APIs)
- **Database / Search**: PostgreSQL 18, Meilisearch v1.7
- **Frontend**: React 18, Vite, Tailwind CSS, TanStack React Query v5, React Router Dom v6, Lucide React
- **Infra/Proxy**: Docker, Docker Compose, Traefik v3
- **Testing**: Playwright (E2E), Vitest & JSDOM (Frontend unit), Django Test Suite (Backend unit)

---

## Screenshots
> TODO: Verify manually (place screenshots in this section once UI is visually customized on your network)

---

## Prerequisites
- **Docker** and **Docker Compose** installed on the host machine.
- **Node.js** (v18+) and **npm** (for local frontend development only).
- **Python 3.11** (for local backend development only).

---

## Environment Variables
Create a `.env` file in the project root (use `.env.example` as a template):

```ini
POSTGRES_DB=dms
POSTGRES_USER=dms_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_HOST=db
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=your_django_secret_key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=192.168.1.100,localhost,127.0.0.1
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=your_meilisearch_master_key
ROOT_USERNAME=root
ROOT_PASSWORD=your_strong_root_password
SESSION_IDLE_TIMEOUT_MINUTES=30
SESSION_ABSOLUTE_TIMEOUT_HOURS=12
```

---

## Installation

We provide automated setup scripts to copy environment templates, bootstrap the Docker container stack, run database migrations, seed the default root account, and index Meilisearch in a single step.

### Linux & macOS
1. Open your terminal, navigate to the cloned folder, and run:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

### Windows (PowerShell)
1. Open PowerShell (preferably as Administrator), navigate to the cloned folder, and run:
   ```powershell
   ./setup.ps1
   ```
   *(If prompted with execution policy errors, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` first).*

> [!TIP]
> **Automatic LAN IP Detection**: At the end of the setup, the script will automatically detect and print your host's local IP address (e.g., `http://192.168.1.15`). You can open this URL in any phone or device connected to the same Wi-Fi network to use the app immediately!

---


### Manual Installation (Alternative)
If you prefer to run the steps manually:
1. **Configure Environment File**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials and configuration
   ```
2. **Build and Run Containers**:
   ```bash
   docker compose up -d --build
   ```
3. **Initialize Root Account & Sync Search**:
   ```bash
   docker compose exec django python manage.py migrate
   docker compose exec django python manage.py create_root_user
   docker compose exec django python manage.py sync_search
   ```


5. **Access the Application**:
   Once running, you can access the platform at:
   - **Frontend App**: [http://localhost](http://localhost) (or `http://dms.local` / `http://<lan-ip>`)
   - **Django Admin Interface**: [http://localhost/admin/](http://localhost/admin/)
   - **Django REST API**: [http://localhost/api/](http://localhost/api/)



   **Default Root Credentials**:
   - **Username**: `root`
   - **Password**: `root123` (as defined in the default environment configuration)

---

## Docker Container Management

Here are the essential commands for managing your Docker containers in development or production.

### 1. Starting the Application
If you are starting the application for the first time or after making changes to dependencies (like `package.json` or `requirements.txt`):
```bash
docker compose up -d --build
```
*If no configurations or dependencies changed, you can start it without the `--build` flag:*
```bash
docker compose up -d
```

### 2. Stopping the Application (Temporarily)
To stop the running containers without removing them or affecting any data:
```bash
docker compose stop
```
*To start them back up after stopping:*
```bash
docker compose start
```

### 3. Shutting Down and Re-initializing (Clean Shutdown)
To fully stop and remove the containers and the local virtual network (useful if you face network/port binding issues):
```bash
docker compose down
```
To bring everything back up after a shutdown:
```bash
docker compose up -d
```

> [!IMPORTANT]
> **Data Persistence Warning:** 
> Running `docker compose down` preserves all your database records and search indexes because they are saved in persistent volumes.
> **DO NOT** run `docker compose down -v` unless you explicitly want to delete all database and search index data.

### 4. Viewing Application Logs
To view combined logs from all running containers in real-time:
```bash
docker compose logs -f
```
To view logs of a specific service (e.g., just Django or Traefik):
```bash
docker compose logs -f django
docker compose logs -f traefik
```

### 5. Running Database Commands / Shell
To enter the PostgreSQL database interactive console:
```bash
docker compose exec db psql -U dms_user -d dms
```
To run Django management commands (e.g. creating users, running migrations):
```bash
docker compose exec django python manage.py <command>
```

### 6. Initializing and Creating Users
If the database is fresh and there are no users:
1. **Initialize the Root User**:
   ```bash
   docker compose exec django python manage.py create_root_user
   ```
   *This initializes the superuser with the credentials defined in your `.env` file (by default: username `root` and password `root_pass_1234567890`).*

2. **Add Other Users**:
   Log in as the `root` user on the web app or at `http://localhost/admin/`, and use the User Administration panel to add new Admin or Regular users.

### 7. Database Backups and Restoration
The application features a built-in automated backup container that takes compressed custom-format snapshots (`.dump` files) every night at **2:00 AM** and stores them on the host machine in the `./backups/` directory with a **14-day retention cycle**.

You can also use the host-level utility script `./dms-backup.sh` to trigger backups, list them, or restore them easily:

* **Trigger a Manual Backup**:
  ```bash
  ./dms-backup.sh backup
  ```
* **List Available Backups**:
  ```bash
  ./dms-backup.sh list
  ```
* **Restore a Backup**:
  ```bash
  ./dms-backup.sh restore <backup_filename.dump>
  # Example:
  ./dms-backup.sh restore dms_backup_20260614_152834.dump
  ```
  *Note: The restore command will overwrite current data and automatically rebuild your Meilisearch search index.*

---

## Running Locally

For rapid frontend/backend development without rebuilding Docker containers constantly, you can run services individually:

### Backend Setup
1. Create a virtual environment and activate it:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run migrations and start the Django dev server:
   ```bash
   python manage.py migrate
   python manage.py runserver 8000
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
2. Run the Vite development server (proxies API requests to backend at port 8000):
   ```bash
   npm run dev
   ```

---

## Available Scripts

### Backend Commands
- `python manage.py migrate`: Apply database schema migrations.
- `python manage.py test`: Run all backend API and model unit tests.
- `python manage.py create_root_user`: Initialize the ROOT superuser account.
- `python manage.py expire_sessions`: Prune expired/idle JWT sessions.

### Frontend (package.json)
- `npm run dev`: Launch the Vite dev server at `http://localhost:3000`.
- `npm run build`: Compile the production-ready build into `/dist`.
- `npm run test`: Run frontend unit tests (Vitest).
- `npm run test:e2e`: Run Playwright E2E smoke tests.

---

## Project Structure
```
dms/
├── .github/workflows/deploy.yml   # CI/CD Deployment configuration
├── backend/                       # Python Django Backend
│   ├── dies/                      # Die Models, Signals & Views
│   ├── machines/                  # Machine and Set configurations
│   ├── history/                   # Audit history tracking
│   ├── users/                     # Authentication & User Sessions
│   ├── dms/                       # Settings and base URLs
│   └── manage.py
├── go-api/                        # Go Search & Stats Microservice
│   ├── Dockerfile                 # Optimized multi-stage Alpine build
│   ├── main.go                    # Entrypoint, DB client, search routing
│   └── go.mod                     # Go dependency list
├── frontend/                      # React Frontend
│   ├── src/                       # Source files (App, Card components)
│   ├── tests/e2e/                 # Playwright E2E tests
│   ├── vite.config.js             # Vite configuration with API proxy
│   ├── playwright.config.js       # Playwright E2E config
│   └── Dockerfile.prod            # Production multi-stage Nginx build
├── scripts/                       # Git hooks and utility scripts
├── docker-compose.yml             # Development Docker Compose configuration
├── docker-compose.prod.yml        # Production Docker Compose configuration
├── deploy.sh                      # Production upgrade and deployment script
├── traefik.yml                    # Traefik routing configuration
└── PROJECT.md                     # Roadmap and progress checklist
```

---

## API Documentation

### Authentication
* **POST** `/api/auth/login/`
  * Body: `{ "username": "...", "password": "..." }`
  * Returns: `{ "token": "<JWT>", "role": "ROOT|ADMIN|REGULAR" }`

### Dies Inventory
* **GET** `/api/dies/`
  * Query parameters for filtering: `die_type`, `status`, `casing`, `location`, `size_min`, `size_max`, `width_min`, `width_max`, `thick_min`, `thick_max`.
* **POST** `/api/dies/` (Admin/Root)
  * Body: Create Round or Flat Die.
* **GET** `/api/dies/<die_id>/`
  * Returns detailed die parameters along with its entire audit change history.
* **PATCH** `/api/dies/<die_id>/` (Admin/Root)
  * Modify location, status, remarks, or current dimensions.
* **DELETE** `/api/dies/<die_id>/` (Admin/Root)
  * Remove die from registry.

### Fuzzy Search
* **GET** `/api/search/`
  * Query parameters: `q` (fuzzy text query), `die_type`, `status`, `location`, `casing`.
  * Queries Meilisearch and retrieves detailed information from PostgreSQL.

### Bulk Import
* **POST** `/api/import/` (Admin/Root)
  * Multipart Form Data containing `file` (Excel `.xlsx` or CSV).
  * Returns: `{ "created": X, "updated": Y, "skipped": Z, "errors": [...] }`.

### User Management
* **GET/POST/PUT/PATCH/DELETE** `/api/users/` (Root Only)
  * Manage administrative user accounts.

### Machine Sets Management
* **GET/POST** `/api/categories/` (Admin/Root for write operations)
  * View or create machine categories.
* **GET/PATCH/DELETE** `/api/categories/<id>/` (Admin/Root for write operations)
  * View, modify, or delete a machine category.
* **GET/POST** `/api/machines/` (Admin/Root for write operations)
  * View or create machines.
* **GET/PATCH/DELETE** `/api/machines/<id>/` (Admin/Root for write operations)
  * View, modify, or delete a machine.
* **GET/POST** `/api/sets/` (Admin/Root for write operations)
  * View or create machine sets.
* **GET/PATCH/DELETE** `/api/sets/<id>/` (Admin/Root for write operations)
  * View, modify, or delete a machine set.

---

## Database Setup
The database schema is managed automatically by Django.
To manually verify database connection or run schema inspections:
```bash
docker compose exec db psql -U dms_user -d dms
```

---

## Deployment & Upgrades

### Development Mode
For local development, use the default `docker-compose.yml` configuration. This mounts the source code directories directly into the containers to support hot reloading:
```bash
docker compose up -d --build
```

### Production Mode
For production deployments, the application uses an optimized configuration:
- **Frontend**: Multi-stage Docker build (`frontend/Dockerfile.prod`) compiling React assets to static HTML/JS/CSS served via Nginx.
- **Backend**: Django served by Gunicorn instead of the development server.
- **Proxy**: Traefik routing `/api/go` to the high-performance Go microservice, `/api` and `/admin` to Django, and all other paths to the Nginx static server.

To run the application in production mode manually:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Automated Upgrade and Deploy Script (`deploy.sh`)
For safe upgrades when new code is pulled from GitHub, a custom `./deploy.sh` script is provided. It automates:
1. Pulling the latest changes from the repository.
2. Validating the active `.env` configuration against `.env.example` to ensure new features have their configuration keys.
3. Re-building docker containers to apply any new package dependencies (`package.json` or `requirements.txt`).
4. Applying database migrations automatically.
5. Creating or synchronizing the `ROOT` superuser based on environment variables.
6. Pruning unused Docker images to free up disk space.

To run the upgrade script:
```bash
chmod +x deploy.sh
./deploy.sh
```

### CI/CD Deployment
Automated deployment is configured via GitHub Actions in `.github/workflows/deploy.yml`. On push to the `main` branch, the workflow:
1. Runs the test suite against temporary PostgreSQL and Meilisearch services.
2. Backs up the remote production database.
3. SSHs into the production server, pulls modifications, builds, and starts the container stack.

---

## Troubleshooting

### Meilisearch connection fails
Make sure your `.env` contains the correct host path:
- Inside docker network: `MEILI_HOST=http://meilisearch:7700`
- Outside docker network (local development): `MEILI_HOST=http://localhost:7700`

### Concurrent Session Logout
If you log in with the same credentials on another browser or device, your previous JWT token is immediately invalidated (returning `401 Unauthorized`).

---



## Contributing

We welcome contributions to improve the Die Management System (DMS)! Please follow these steps to contribute:

1. **Fork the Repository**: Create a personal copy of the project.
2. **Create a Feature Branch**: Use descriptive names (e.g., `feature/add-wear-charts` or `bugfix/session-timeout`).
3. **Write Tests**: Ensure any backend additions are covered by Django unit tests and frontend changes are covered by Vitest suites.
4. **Run Quality Checks**:
   * Run backend unit tests: `docker compose exec django python manage.py test`
   * Run frontend unit tests: `npm run test` (inside the `frontend` folder)
5. **Submit a Pull Request**: Provide a detailed description of your changes and reference any relevant issue numbers.

---

## License

**Proprietary / Internal Use Only**

This software and its source code are proprietary. See the [LICENSE](file:///home/sahil/Projects/dms-o2/LICENSE) file for the full terms and conditions governing use, reproduction, and distribution.


