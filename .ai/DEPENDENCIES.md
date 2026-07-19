# Dependency Configurations (DEPENDENCIES.md)

Every package, library, and image tag in DMS-O2 is strictly pinned to ensure reproducibility.

---

## 1. Python Backend Dependencies (`backend/requirements.txt`)
*   **Web Framework & ORM**:
    *   `Django==4.2.21`
    *   `djangorestframework==3.15.2`
*   **Authentication & Security**:
    *   `djangorestframework-simplejwt==5.3.1`
    *   `django-cors-headers==4.4.0`
    *   `python-decouple==3.8` (for environment variable loading)
*   **Database & Search**:
    *   `psycopg2-binary==2.9.9` (PostgreSQL adapter)
    *   `meilisearch==0.31.6` (Python Meilisearch client)
*   **Background Tasks & Cache**:
    *   `celery==5.3.6` (Asynchronous task coordinator)
    *   `redis==5.0.1` (Broker client)
*   **Exports & Documentation**:
    *   `openpyxl==3.1.5` (Excel spreadsheet generator)
    *   `drf-spectacular==0.27.2` (OpenAPI schema parser)
*   **Production Server**:
    *   `gunicorn==22.0.0` (WSGI web server)

---

## 2. Frontend JS/TS dependencies (`frontend/package.json`)
*   **Core UI Library**:
    *   `react == 18.2.0`
    *   `react-dom == 18.2.0`
*   **Build & Tooling**:
    *   `vite == 5.1.0`
    *   `typescript == 6.0.3`
    *   `postcss == 8.4.35`
    *   `tailwindcss == 3.4.1`
*   **State & Navigation**:
    *   `@tanstack/react-query == 5.0.0`
    *   `react-router-dom == 6.22.0`
*   **UI Components & Animations**:
    *   `@tanstack/react-table == 8.20.5`
    *   `react-window == 2.2.7` (virtualized list renderer)
    *   `framer-motion == 11.11.17`
    *   `recharts == 2.12.7` (Dimension wear & area reduction charts)
    *   `lucide-react == 0.300.0`
    *   `react-hot-toast == 2.4.1`
*   **Workbench Exports**:
    *   `xlsx == 0.18.5`
    *   `jspdf == 2.5.2`
    *   `jspdf-autotable == 3.8.3`
*   **Testing Suites**:
    *   `vitest == 1.2.2`
    *   `@playwright/test == 1.60.0`
    *   `@testing-library/react == 16.3.2`

---

## 3. Go API Dependencies (`go-api/go.mod`)
*   **SDK Target**: `go 1.22`
*   **Direct Requirements**:
    *   `github.com/lib/pq v1.10.9` (PostgreSQL driver)
    *   `github.com/meilisearch/meilisearch-go v0.26.3`
*   **Indirect Requirements**:
    *   `github.com/redis/go-redis/v9 v9.5.1` (Redis client)
    *   `github.com/golang-jwt/jwt/v4 v4.5.0` (JWT token signature evaluator)
    *   `github.com/valyala/fasthttp v1.37.1` (indirect dependency)
    *   `github.com/andybalholm/brotli v1.0.4`
    *   `github.com/klauspost/compress v1.15.6`

---

## 4. Container Infrastructure Images
*   **Frontend compilation**: `node:18-alpine`
*   **Go Search compilation**: `golang:1.22-alpine`
*   **Monolithic production base**: `python:3.11-slim`
*   **PostgreSQL Relational DB**: `postgres:18-alpine`
*   **Search Engine**: `getmeili/meilisearch:v1.7`
*   **Reverse Proxy**: `traefik:v3` (configured locally, health check via `wget --spider http://127.0.0.1:80`)
