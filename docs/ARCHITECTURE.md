# DMS — Architecture, APIs, and Database Specifications

This document consolidates the technical specifications of the Die Management System (DMS) application, covering:
1. **Django REST API Schema**
2. **Go Search API Contract & Logic**
3. **Database Connection Pooling Configuration (PostgreSQL)**

---

## 1. Django REST API Schema

### Overview
The DMS API uses **drf-spectacular** to automatically generate OpenAPI 3.0.3 schema documentation. All endpoints are fully documented and interactive.

### Accessing the API Documentation

#### Swagger UI
* **URL:** `http://localhost:8000/api/docs/`
* Interactive API explorer with:
  * Request/response examples
  * Try-it-out functionality with live API testing
  * Authentication token input
  * Full endpoint documentation

#### ReDoc
* **URL:** `http://localhost:8000/api/redoc/`
* Alternative documentation viewer (read-only, optimized for browsing)

#### Raw OpenAPI Schema
* **URL:** `http://localhost:8000/api/schema/`
* JSON OpenAPI 3.0.3 specification (machine-readable)

### Authentication
All endpoints (except schema endpoints) require JWT Bearer token authentication:
```bash
Authorization: Bearer <token>
```

#### Getting a Token
* **Endpoint:** `POST /api/auth/login/`
* **Request Payload:**
  ```json
  {
    "username": "root",
    "password": "your_password"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
  }
  ```

### API Endpoints

#### Authentication
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login/` | Login and get JWT token |
| POST | `/api/auth/keep-alive/` | Refresh authentication token |

#### Dies Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/dies/` | List all dies (with filtering & pagination) |
| POST | `/api/dies/` | Create a new die |
| GET | `/api/dies/{id}/` | Retrieve single die |
| PUT | `/api/dies/{id}/` | Update die (full update) |
| PATCH | `/api/dies/{id}/` | Partial die update |
| DELETE | `/api/dies/{id}/` | Delete a die |

#### Die Filters
Query parameters for `/api/dies/`:
* `die_type`: Filter by ROUND or FLAT
* `status`: Filter by status (ACTIVE, INACTIVE, AVAILABLE, etc.)
* `location`: Filter by location
* `casing`: Filter by casing type
* `size_min`, `size_max`: Filter ROUND dies by size range
* `width_min`, `width_max`: Filter FLAT dies by width range
* `thickness_min`, `thickness_max`: Filter FLAT dies by thickness range
* `page`: Pagination (default page size: 100)

#### Machines & Categories
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/categories/` | List machine categories |
| POST | `/api/categories/` | Create category |
| GET | `/api/machines/` | List machines |
| POST | `/api/machines/` | Create machine |
| GET | `/api/sets/` | List die sets |
| POST | `/api/sets/` | Create set |

#### Users Management
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/users/` | List users (paginated) |
| POST | `/api/users/` | Create user |
| GET | `/api/users/{id}/` | Retrieve user |
| PUT | `/api/users/{id}/` | Update user |
| DELETE | `/api/users/{id}/` | Delete user |

#### Backups
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/backups/` | List backups |
| POST | `/api/backups/` | Trigger backup |

#### Import & Events
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/import/` | Bulk import dies |
| GET | `/api/events/` | Server-sent events stream |

### Request/Response Examples

#### Create a ROUND Die
* **Request:**
  ```bash
  curl -X POST http://localhost:8000/api/dies/ \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "die_id": "D-12345",
      "die_type": "ROUND",
      "casing": "STEEL",
      "status": "ACTIVE",
      "location": "RACK-A",
      "original_size": 5.5,
      "current_size": 5.4,
      "current_set": 1,
      "remarks": "Regular maintenance performed"
    }'
  ```
* **Response (201 Created):**
  ```json
  {
    "id": 123,
    "die_id": "D-12345",
    "die_type": "ROUND",
    "casing": "STEEL",
    "status": "ACTIVE",
    "location": "RACK-A",
    "original_size": 5.5,
    "current_size": 5.4,
    "current_set": 1,
    "remarks": "Regular maintenance performed",
    "created_at": "2025-06-16T10:30:45Z",
    "updated_at": "2025-06-16T10:30:45Z"
  }
  ```

#### Create a FLAT Die
* **Request:**
  ```bash
  curl -X POST http://localhost:8000/api/dies/ \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{
      "die_id": "F-67890",
      "die_type": "FLAT",
      "casing": "CARBIDE",
      "status": "ACTIVE",
      "location": "STORAGE-B",
      "original_width": 10.0,
      "current_width": 9.8,
      "original_thickness": 2.5,
      "current_thickness": 2.4,
      "radius": 0.5,
      "current_set": null
    }'
  ```

#### Filter Dies by Type and Status
* **Request:**
  ```bash
  curl "http://localhost:8000/api/dies/?die_type=ROUND&status=ACTIVE" \
    -H "Authorization: Bearer <token>"
  ```
* **Response:**
  ```json
  {
    "count": 45,
    "next": "http://localhost:8000/api/dies/?page=2",
    "previous": null,
    "results": [
      {
        "id": 1,
        "die_id": "D-00001",
        "die_type": "ROUND",
        "casing": "STEEL",
        "status": "ACTIVE",
        "location": "RACK-A",
        "original_size": 2.5,
        "current_size": 2.5,
        "current_set": null,
        "created_at": "2025-06-16T10:30:45Z",
        "updated_at": "2025-06-16T10:30:45Z"
      }
    ]
  }
  ```

### Schema Features

#### Auto-Generated Descriptions
All ViewSet docstrings are automatically included in the schema:
```python
class DieViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing die inventory.
    
    Supports create, read, update, delete operations.
    Filters: die_type, status, location, casing, size ranges
    """
```

#### Field Validation
Fields are documented with:
* Type information (string, integer, number, boolean, array, object)
* Required/optional status
* Min/max constraints
* Enum choices

#### Pagination
Default pagination: **100 items per page**
```json
{
  "count": 250,
  "next": "http://localhost:8000/api/dies/?page=2",
  "previous": null,
  "results": [...]
}
```

### Error Handling
All API errors return structured JSON responses:

#### 400 Bad Request
```json
{
  "die_id": ["This field may not be blank."],
  "current_size": ["Ensure this value is greater than or equal to 0."]
}
```

#### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

#### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

#### 404 Not Found
```json
{
  "detail": "Not found."
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

### Client Generation
The OpenAPI schema can be used to auto-generate client SDKs:
```bash
# Generate TypeScript client
npx @openapi-generator-cli/cli generate -i http://localhost:8000/api/schema/ -g typescript-fetch -o ./generated-client

# Generate Python client
pip install openapi-generator-cli
openapi-generator-cli generate -i http://localhost:8000/api/schema/ -g python -o ./generated-client
```

---

## 2. Go Search API Contract & Logic

### Overview
The Go Search Service (`go-api/main.go`) provides a high-performance search and statistics API for the DMS system, with built-in caching via Redis and multi-source querying (PostgreSQL + Meilisearch).

### Endpoints

#### 1. Health Check
* **Endpoint:** `GET /api/go/health`
* **Authentication:** None
* **Response (200 OK):**
  ```json
  {
    "status": "healthy"
  }
  ```

#### 2. Search Dies
* **Endpoint:** `GET /api/go/search`
* **Authentication:** Required (JWT Bearer token)
* **Query Parameters:**
  | Parameter | Type | Description | Example |
  |-----------|------|-------------|---------|
  | `q` | string | Full-text search query (matches against all indexed fields) | `120` |
  | `die_type` | string | Filter by die type: `ROUND` or `FLAT` | `ROUND` |
  | `status` | string | Filter by status | `AVAILABLE`, `RUNNING`, `DAMAGED`, `POLISHING`, etc. |
  | `casing` | string | Filter by casing (text substring) | `25x10` |
  | `location` | string | Filter by location | `Warehouse A` |
  | `size_min` | decimal | Min size for ROUND dies (mm) | `2.5` |
  | `size_max` | decimal | Max size for ROUND dies (mm) | `5.0` |
  | `width_min` | decimal | Min width for FLAT dies (mm) | `10` |
  | `width_max` | decimal | Max width for FLAT dies (mm) | `20` |
  | `thick_min` | decimal | Min thickness for FLAT dies (mm) | `2` |
  | `thick_max` | decimal | Max thickness for FLAT dies (mm) | `5` |

* **Response (200 OK):**
  ```json
  [
    {
      "die_id": "DI-001",
      "die_type": "ROUND",
      "casing": "25x10",
      "status": "AVAILABLE",
      "location": "Warehouse A",
      "set_name": "Production Set 1",
      "machine_name": "Machine A",
      "current_set": 42,
      "current_size": "2.5"
    },
    {
      "die_id": "DI-002",
      "die_type": "FLAT",
      "casing": "30x15",
      "status": "RUNNING",
      "location": "Shop Floor",
      "set_name": "Production Set 2",
      "machine_name": "Machine B",
      "current_set": 43,
      "current_width": "15.5",
      "current_thickness": "3.2",
      "radius": "2.0"
    }
  ]
  ```

#### 3. Statistics (Index Reconciliation Status)
* **Endpoint:** `GET /api/go/stats`
* **Authentication:** Required (JWT Bearer token)
* **Response (200 OK):**
  ```json
  {
    "last_reconciliation": "2026-06-17T10:30:45Z",
    "status": "healthy",
    "postgres_count": 1250,
    "meilisearch_count": 1250,
    "mismatch_detected": false
  }
  ```

### Data Models

#### DieRepresentation (JSON)
```typescript
{
  die_id: string;           // Primary identifier (e.g., "DI-001")
  die_type: string;         // "ROUND" or "FLAT"
  casing: string;           // Casing dimensions (e.g., "25x10")
  status: string;           // Status enum value
  location: string;         // Physical location
  set_name: string;         // Name of assigned production set
  machine_name: string;     // Name of machine (through set.machine)
  current_set: number | null; // FK to production set, null if unassigned
  
  // ROUND die fields
  current_size?: string;    // Current diameter in mm
  
  // FLAT die fields
  current_width?: string;   // Current width in mm
  current_thickness?: string; // Current thickness in mm
  radius?: string;          // Radius in mm
}
```

### Search Logic
1. **With Search Query (`q`)**:
   * Queries Meilisearch index with full-text search across: `die_id`, `casing`, `status`, `location`, `set`, `machine`, `size`, `width`, `thickness`
   * Extracts matching die IDs from Meilisearch
   * Fetches full die details from PostgreSQL using those IDs
2. **Without Search Query**:
   * Queries PostgreSQL directly using filter parameters (`die_type`, `status`, `location`, range filters, etc.)

### Caching
* Search results are cached in Redis for **10 seconds**
* Cache key pattern: `search:{q}:{die_type}:{status}:{location}:{casing}:{size_min}:{size_max}:{width_min}:{width_max}:{thick_min}:{thick_max}`
* The cache is immediately invalidated on database changes via PostgreSQL `LISTEN` / `NOTIFY` signals

---

## 3. Database Connection Pooling Configuration

### Current Configuration
The Django application uses PostgreSQL with the following connection pooling settings:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'CONN_MAX_AGE': 300,  # Connections live for 5 minutes
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 second query timeout
        },
        'ATOMIC_REQUESTS': True,  # Wrap each request in a transaction
    }
}
```

### Settings Explanation
* **`CONN_MAX_AGE` (300 seconds)**: Reuse connections within 5-minute window to avoid the overhead of establishing new sockets for each request.
* **`connect_timeout` (10 seconds)**: Wait max 10 seconds to establish a new database connection.
* **`statement_timeout` (30,000ms)**: Cancel queries running longer than 30 seconds to prevent runaway processes.
* **`ATOMIC_REQUESTS` (True)**: Wraps each web request in a transaction, rolling back modifications on errors.

### Connection Limits
* **Django-Level**: Default Pool Size is 5 connections (managed by database/sql).
* **PostgreSQL-Level**: Configured via `max_connections` (Default: 100 in the `docker-compose.yml` file).

### Monitoring Connection Usage

#### Check Active Connections
```sql
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
```

#### Check Connection Status
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### Optimization Tips
1. **Increase CONN_MAX_AGE for stable workloads**: If connections are stable and not timing out, increase to 600+ seconds.
2. **Lower CONN_MAX_AGE for bursty workloads**: If many idle connections accumulate, lower to 120-180 seconds to release database handles.
3. **Monitor slow queries**: Set `log_min_duration_statement = 1000` in PostgreSQL config to log queries taking more than 1 second.
4. **PgBouncer**: For high-concurrency LAN/production deployments, configure PgBouncer in front of PostgreSQL.
