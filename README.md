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
- **Backend**: Python 3.11, Django 4.2, Django REST Framework, Django Simple JWT, PostgreSQL 18, Meilisearch v1.7, OpenPyXL
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

1. **Clone the Repository**:
   ```bash
   git clone <repo-url> dms
   cd dms
   ```

2. **Configure Environment File**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials and configuration
   ```

3. **Build and Run Containers**:
   ```bash
   docker compose up -d --build
   ```

4. **Initialize Root Account**:
   ```bash
   docker compose exec django python manage.py create_root_user
   ```

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
├── frontend/                      # React Frontend
│   ├── src/                       # Source files (App, Card components)
│   ├── tests/e2e/                 # Playwright E2E tests
│   ├── vite.config.js             # Vite configuration with API proxy
│   └── playwright.config.js       # Playwright E2E config
├── scripts/                       # Git hooks and utility scripts
├── docker-compose.yml             # Docker Compose orchestration
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

---

## Database Setup
The database schema is managed automatically by Django.
To manually verify database connection or run schema inspections:
```bash
docker compose exec db psql -U dms_user -d dms
```

---

## Deployment
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
> TODO: Verify manually

---

## License
> TODO: Verify manually
