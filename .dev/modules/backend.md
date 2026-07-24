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
- `status`: Enum (`AVAILABLE`, `RUNNING`, `CLEANING`, `POLISHING`, `DAMAGED`, `SCRAPPED`, `MISSING`)
- `rack`: Foreign key to Rack (nullable)
- `shelf_number`: Positive small int (nullable)
- `current_set`: Foreign key to Set (nullable)
- `remarks`: Maintenance notes text
- `predicted_remaining_days`: Calculated lifetime integer
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


## Key Views

### Authentication
- `POST /api/auth/login/`: User login
- `POST /api/auth/logout/`: User logout
- `POST /api/auth/token/refresh/`: Token refresh

### Dies
- `GET /api/dies/`: List dies
- `POST /api/dies/{id}/recut/`: Recut die

### Backups
- `POST /api/backups/`: Create backup

## Business Logic

### Die Recut
1. Validate input dimensions
2. Lock die record (select_for_update)
3. Update current dimensions
4. Create DieHistory record
5. Recalculate predicted_remaining_days
6. Return updated die

### Wear Alert Detection
1. Check die dimensions against thresholds
2. Create WearAlert if threshold exceeded
3. Send notification if critical
4. Log alert creation

### Predicted Remaining Days
1. Calculate wear rate from history
2. Project remaining useful life
3. Update die.predicted_remaining_days
4. Cache for dashboard performance

## Background Tasks

### Outbox Pattern
- Tasks queued in outbox_task table
- HMAC-SHA256 payload signatures
- Exponential backoff retry
- Dead-letter queue for failures

### Scheduled Tasks
- Daily backup creation
- Hourly wear alert checks
- Weekly prediction updates
- Monthly report generation

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
