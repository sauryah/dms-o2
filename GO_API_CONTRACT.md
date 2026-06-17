# Go API Contract Documentation

## Overview
The Go Search Service (`go-api/main.go`) provides a high-performance search and statistics API for the DMS system, with built-in caching via Redis and multi-source querying (PostgreSQL + Meilisearch).

## Endpoints

### 1. Health Check
**Endpoint:** `GET /api/go/health`
**Authentication:** None
**Response:**
```json
{
  "status": "healthy"
}
```

### 2. Search Dies
**Endpoint:** `GET /api/go/search`
**Authentication:** Required (JWT Bearer token)

#### Query Parameters:
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `q` | string | Full-text search query (die_id substring) | `DI-001` |
| `die_type` | string | Filter by die type: `ROUND` or `FLAT` | `ROUND` |
| `status` | string | Filter by status | `AVAILABLE`, `RUNNING`, `DAMAGED`, etc. |
| `casing` | string | Filter by casing (text substring) | `25x10` |
| `location` | string | Filter by location | `Warehouse A` |
| `size_min` | decimal | Min size for ROUND dies (mm) | `2.5` |
| `size_max` | decimal | Max size for ROUND dies (mm) | `5.0` |
| `width_min` | decimal | Min width for FLAT dies (mm) | `10` |
| `width_max` | decimal | Max width for FLAT dies (mm) | `20` |
| `thick_min` | decimal | Min thickness for FLAT dies (mm) | `2` |
| `thick_max` | decimal | Max thickness for FLAT dies (mm) | `5` |

#### Response (200 OK):
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

#### Error Responses:
- **401 Unauthorized:** Missing or invalid JWT token
- **500 Internal Server Error:** Database or Meilisearch connection failure

#### Search Logic:
1. If `q` parameter is provided:
   - Query Meilisearch index with full-text search on: `die_id`, `casing`, `status`, `location`, `set`, `machine`, `size`, `width`, `thickness`
   - Retrieve matching die IDs from Meilisearch
   - Fetch full die details from PostgreSQL using those IDs
2. If no `q` parameter:
   - Query PostgreSQL directly with filter conditions

#### Caching:
- Search results are cached in Redis for **10 seconds**
- Cache key: `search:{q}:{die_type}:{status}:{location}:{casing}:{size_min}:{size_max}:{width_min}:{width_max}:{thick_min}:{thick_max}`
- Cache is invalidated on database changes via PostgreSQL LISTEN/NOTIFY

### 3. Statistics (Index Reconciliation Status)
**Endpoint:** `GET /api/go/stats`
**Authentication:** Required (JWT Bearer token)

#### Response (200 OK):
```json
{
  "last_reconciliation": "2026-06-17T10:30:45Z",
  "status": "healthy",
  "postgres_count": 1250,
  "meilisearch_count": 1250,
  "mismatch_detected": false
}
```

## Data Models

### DieRepresentation (JSON)
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
  
  // ROUND die fields (mutually exclusive with FLAT fields)
  current_size?: string;    // Current diameter in mm
  
  // FLAT die fields (mutually exclusive with ROUND fields)
  current_width?: string;   // Current width in mm
  current_thickness?: string; // Current thickness in mm
  radius?: string;          // Radius in mm
}
```

## Authentication
The Go API uses JWT bearer tokens passed in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Tokens are validated by the `authMiddleware` function which:
1. Extracts token from `Authorization` header
2. Verifies signature using public key from environment
3. Returns 401 if invalid or missing

## Performance Characteristics
- **Response Time:** <100ms for cached queries, <500ms for uncached searches
- **Redis Caching:** 10-second TTL for all search results
- **Index Reconciliation:** Runs every 60 seconds, detects and logs Meilisearch/PostgreSQL mismatches
- **Connection Pooling:** PostgreSQL connections managed by database/sql package

## Error Handling
All errors return JSON with an `error` field:
```json
{
  "error": "Connection to Meilisearch failed"
}
```

## Frontend Integration
The React frontend calls this API via `useApi()` hook in `InventoryPage.tsx`:
```typescript
const { data: dies } = useQuery({
  queryKey: ['dies', debouncedQ, dieType, statusVal, ...],
  queryFn: ({ signal }) => request('/api/go/search?q=...&die_type=...', { signal })
})
```

Results are passed to `DiesTable` component for rendering and to `FilterPanel` for user interaction.
