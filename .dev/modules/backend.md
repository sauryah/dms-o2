# Backend Module (Django)

## Purpose
Django backend overview for write operations and business logic.
**Why:** Reference for understanding Django service and implementing features.
**Read by:** AI agents, backend engineers.
**Updated:** When module changes.

## Overview
- **Framework:** Django 4.2
- **Language:** Python 3.11
- **Database:** PostgreSQL 18
- **Cache:** Redis 7
- **Purpose:** Write operations, business logic, authentication

## Architecture

### Service Responsibilities
- User authentication and authorization
- CRUD operations for dies, machines, sets
- Business logic (recut, wear alerts, predictions)
- Audit logging and history tracking
- Background task processing (outbox pattern)
- Database migrations and schema management

### Key Components
- **Views:** REST API endpoints
- **Models:** Database schema and business logic
- **Serializers:** Data validation and transformation
- **Services:** Business logic layer
- **Tasks:** Background processing
- **Middleware:** Request/response processing

## Directory Structure
```
backend/
├── dms/             # Core settings, main URLs, WSGI/ASGI, Celery config
├── dies/            # Dies, RoundDie, FlatDie, WearAlert, DieTolerance, MaintenanceLog, ImportLog, OutboxTask
├── history/         # DieHistory, MachineHistory models, signals, and views
├── machines/        # MachineCategory, Machine, Set, Rack models and ViewSets
├── search/          # Celery Meilisearch indexing tasks
├── users/           # Custom User, UserSession, UserActivityLog, auth views & permissions
└── manage.py        # Django management CLI script
```

## Key Models

### Die
- `id`: Primary key
- `die_id`: Unique string identifier
- `die_type`: Enum ('ROUND', 'FLAT')
- `casing`: Dimensions envelope string (e.g. `25x10`)
- `status`: Enum (`AVAILABLE`, `RUNNING`, `CLEANING`, `POLISHING`, `DAMAGED`, `SCRAPPED`, `MISSING`, `MAINTENANCE`)
- `rack`: Foreign key to Rack (nullable)
- `shelf_number`: Positive small int (nullable)
- `current_set`: Foreign key to Set (nullable)
- `remarks`: Maintenance notes text
- `version`: Optimistic locking integer

### RoundDie
- `punched_size`: Decimal(7,3)
- `current_size`: Decimal(7,3)

### FlatDie
- `punched_width`: Decimal(7,3)
- `current_width`: Decimal(7,3)
- `punched_thickness`: Decimal(7,3)
- `current_thickness`: Decimal(7,3)
- `radius`: Decimal(7,3) fillet radius

### DieHistory
- `die`: Foreign key to Die
- `changed_by`: Foreign key to User (nullable)
- `timestamp`: DateTime
- `field_name`: String field name
- `old_value`: Text old value
- `new_value`: Text new value
- `ip_address`: Client IP address
- `note`: Change context note
- `prev_hash`: SHA-256 hash of preceding history record
- `hash`: SHA-256 hash of current history record (tamper-evident chain)

### MachineHistory
- `entity_type`: Enum ('MACHINE', 'SET', 'CATEGORY', 'RACK')
- `entity_id`: Integer primary key of target entity
- `entity_name`: String label of target entity
- `action`: Enum ('CREATED', 'UPDATED', 'DELETED')
- `field_name`: String field modified
- `old_value`: Text old value
- `new_value`: Text new value
- `changed_by`: Foreign key to User (nullable)
- `timestamp`: DateTime
- `ip_address`: Client IP address
- `prev_hash`: SHA-256 hash of preceding machine history record
- `hash`: SHA-256 hash of current machine history record

### EnamelMachine & MachineDieStock
- `EnamelMachine`: Unique name and description representing active enameling lines
- `MachineDieStock`: Die size (Decimal 7,3) and quantity counter allocated to an enamel machine

### DieInventoryRecount & DieInventoryRecountItem
- `DieInventoryRecount`: Machine-specific physical inventory audit header (Status: `DRAFT`, `SUBMITTED`)
- `DieInventoryRecountItem`: Line-item die size, counted quantity, and previous recorded quantity

### UserBackupCode
- `user`: Foreign key to User
- `code_hash`: PBKDF2 SHA-256 hash of 8-character single-use code
- `is_used`: Boolean redemption indicator
- `used_at`: Timestamp of usage
- `created_at`: Timestamp of generation


## Key Views

### Authentication & MFA
- `POST /api/v1/auth/login/`: User login (sets HTTPOnly cookies + returns JWT; prompts for MFA if enabled)
- `POST /api/v1/auth/logout/`: User logout
- `POST /api/v1/auth/refresh/`: Token refresh
- `POST /api/v1/auth/keep-alive/`: Extend session
- `POST /api/v1/auth/sse-ticket/`: Get SSE connection ticket
- `GET /api/v1/auth/me/`: Current user profile
- `POST /api/v1/auth/change-password/`: Change password
- `POST /api/v1/auth/backup-codes/generate/`: Generate fresh set of single-use backup recovery codes
- `POST /api/v1/auth/backup-codes/verify/`: Validate and consume a single-use backup code
- `GET /api/v1/auth/backup-codes/status/`: Query count of active/remaining backup codes

### Dies & Enamel Machine Inventory
- `GET /api/v1/dies/`: List dies (with type/status/size filters)
- `POST /api/v1/dies/{die_id}/recut/`: Recut die
- `GET/POST /api/v1/dies/{die_id}/maintenance_logs/`: Maintenance log
- `GET /api/v1/dies/enamel-machines/`: List enamel machines
- `GET /api/v1/dies/machine-stock/`: Machine-allocated die stock quantities
- `GET/POST /api/v1/dies/inventory-recounts/`: Physical recount audit sheets
- `POST /api/v1/dies/inventory-recounts/{id}/submit/`: Submit and reconcile recount with stock

### User Management
- `POST /api/v1/users/terminate-sessions/`: Bulk terminate active sessions on permission/role change

### Backups
- `GET/POST /api/v1/backups/`: List / create backups

## Business Logic

### Die Recut
1. Validate input dimensions
2. Lock die record (select_for_update)
3. Update current dimensions
4. Create DieHistory record with cryptographic hash chain
5. Broadcast sync and SSE updates
6. Invalidate dashboard and search caches
7. Return updated die

### Wear Alert Detection
1. Check die dimensions against thresholds
2. Create WearAlert if threshold exceeded
3. Send notification if critical
4. Log alert creation

### Physical Recount Reconciliation
1. Operator records physical floor counts per enamel machine in `DRAFT` state
2. Verification and submission triggers atomic update of `MachineDieStock`
3. Audit variance is locked into `DieInventoryRecountItem` with user attribution

### Cryptographic Audit Chaining
1. Every write to `DieHistory` or `MachineHistory` reads the latest record's `hash`
2. Computes SHA-256 of payload concatenated with `prev_hash`
3. Ensures tamper-evident chronology of all physical die modifications

## Background Tasks

### Outbox Pattern
- Tasks queued in outbox_task table
- HMAC-SHA256 payload signatures
- Exponential backoff retry
- Dead-letter queue for failures

### Scheduled Tasks
- Daily backup creation
- Hourly wear alert checks
- Periodic Meilisearch index synchronization

## Testing

### Unit Tests
```bash
# Run all tests
pytest

# Run specific module
pytest dies/

# Run with coverage
pytest --cov=backend
```

### Integration Tests
```bash
# Run integration tests
pytest --integration

# Run API tests
pytest api/
```

## Development

### Local Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

### Common Commands
```bash
# Shell
python manage.py shell

# Create migration
python manage.py makemigrations

# Apply migration
python manage.py migrate

# Load fixtures
python manage.py loaddata fixtures/initial_data.json
```

## Performance Considerations

### Database
- Use `select_related()` for foreign keys
- Use `prefetch_related()` for many-to-many
- Avoid N+1 queries
- Use `only()` and `defer()` for large fields

### Caching
- Cache frequently accessed data
- Use Django cache framework
- Implement cache invalidation
- Monitor cache hit rates

### Queries
- Use `exists()` instead of `count()` when possible
- Use `values()` and `values_list()` for data-only queries
- Use `bulk_create()` for multiple inserts
- Use `update()` for bulk updates

## Security

### Authentication
- JWT tokens in HTTPOnly cookies
- Token refresh mechanism
- Session management
- Rate limiting

### Authorization
- Role-based access control
- Permission classes
- Object-level permissions
- Admin-only endpoints

### Data Protection
- Input validation
- SQL injection prevention (ORM)
- XSS prevention
- CSRF protection
- Sensitive data handling
