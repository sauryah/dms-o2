# DMS — Die Management System
> Industrial LAN die tracking platform.
> Store dies. Record every change. Search fast.

---

## HOW TO USE THIS FILE (for any CLI agent)

You are building the DMS app from scratch. Rules:
1. Read this entire file first.
2. Build one phase at a time — in order.
3. After each phase, run the listed tests. All must pass before continuing.
4. If a test fails, fix it before moving on. Do not skip.
5. After completing a phase, append a changelog entry at the bottom of this file.
6. Ask the user before making any decision not covered here.

---

## Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Django 4.2 + Django REST Framework|
| Database   | PostgreSQL 18                     |
| Search     | Meilisearch v1.7                  |
| Frontend   | React 18 + Vite + Tailwind CSS    |
| Auth       | Django sessions + JWT (DRF Simple JWT) |
| Infra      | Docker Compose + Traefik v3       |
| CI/CD      | GitHub Actions → SSH deploy       |

---

## Data Hierarchy

```
MachineCategory → Machine → Set → Die → DieHistory
```

---

## Roles

| Role            | Can do                                                                 |
|-----------------|------------------------------------------------------------------------|
| Unauthenticated | Search + view only                                                     |
| Admin           | Search, view, edit status, add/edit/delete dies, bulk import           |
| Root            | Everything Admin can + manage users (create/deactivate admins)         |

- Root is ONE account. Created once via management command. Never via UI.
- Admins created by Root only via `/api/users/` endpoint.
- One active session per user. New login kills old session immediately.
- Idle timeout: 30 minutes. Absolute timeout: 12 hours.

---

## Die Types

### Round Die fields
- die_id (unique)
- casing (e.g. 25x10)
- status
- location (free-text, e.g. "Rack A - Shelf 3", nullable)
- original_size (decimal, 3dp)
- current_size (decimal, 3dp)
- current_set (FK → Set, nullable)
- remarks

### Flat Die fields
- die_id (unique)
- casing (e.g. 30x15)
- status
- location (free-text, e.g. "Rack B - Shelf 1", nullable)
- original_width, current_width (decimal, 3dp)
- original_thickness, current_thickness (decimal, 3dp)
- radius (decimal, 3dp)
- current_set (FK → Set, nullable)
- remarks

### Die Status values
AVAILABLE · RUNNING · CLEANING · POLISHING · DAMAGED · SCRAPPED · MISSING

---

## Search Result Shape

**Round die:** size · id · casing · location · set · machine
**Flat die:** width×thickness · id · casing · location · set · machine

---

## Key Rules (always follow these)

- DieHistory is written by `pre_save` signal ONLY. Never call it manually.
- Track these fields in DieHistory: status, current_set_id, location, current_size, current_width, current_thickness, remarks
- Meilisearch for text/ID/fuzzy search. PostgreSQL for decimal range queries.
- Bulk import uses `update_or_create` on `die_id`. No duplicates ever.
- Never edit a migration file after it is created. Always make a new one.
- Migrations are always committed to git alongside model changes.
- `docker compose up` always runs the `migrate` service before `django` starts.
- Excel export uses openpyxl. All exports: one header row, then data rows. No merged cells.
- Export — all dies: one sheet, every die regardless of machine/set.
- Export — machine wise: one sheet per machine, dies grouped under that machine.
- Export — set wise: one sheet per set, dies in that set only.

---
---

# PHASES — BUILD IN THIS ORDER

---

## PHASE 0 — Project scaffold

### What to build
1. Create this directory structure:
```
DMS/
├── PROJECT.md                        ← this file
├── .env.example
├── .gitignore
├── docker-compose.yml
├── traefik.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   ├── dms/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── dies/         (empty Django app)
│   ├── machines/     (empty Django app)
│   ├── history/      (empty Django app)
│   └── users/        (empty Django app)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── App.jsx
└── scripts/
    └── update_project_md.py
```

2. `.env.example` must contain:
```
POSTGRES_DB=dms
POSTGRES_USER=dms_user
POSTGRES_PASSWORD=change_me
POSTGRES_HOST=db
POSTGRES_PORT=5432
DJANGO_SECRET_KEY=change_me
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=192.168.1.100,localhost
MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=change_me
ROOT_USERNAME=root
ROOT_PASSWORD=change_me_strong
SESSION_IDLE_TIMEOUT_MINUTES=30
SESSION_ABSOLUTE_TIMEOUT_HOURS=12
```

3. `requirements.txt` must include:
```
Django==4.2.*
djangorestframework
djangorestframework-simplejwt
psycopg2-binary
meilisearch
openpyxl
python-decouple
gunicorn
```

4. `docker-compose.yml` must define these services:
   - `db` — postgres:18-alpine, healthcheck with pg_isready
   - `migrate` — runs `python manage.py migrate --noinput`, depends_on db healthy, restart: "no"
   - `django` — depends_on migrate completed_successfully
   - `meilisearch` — getmeili/meilisearch:v1.7
   - `traefik` — traefik:v3, port 80

5. Django settings must read all values from `.env` via `python-decouple`.
   INSTALLED_APPS must include: dies, machines, history, users, rest_framework.

### Tests — all must pass before Phase 1
```bash
# T0.1 — docker compose builds without error
docker compose build

# T0.2 — migrate service runs and exits 0
docker compose run --rm migrate

# T0.3 — django starts and responds
docker compose up -d django
curl -f http://localhost:8000/api/ || exit 1

# T0.4 — meilisearch is healthy
curl -f http://localhost:7700/health || exit 1

# T0.5 — .env.example has no real secrets (all values are placeholders)
grep -E "change_me|your_" .env.example | wc -l  # must be > 0
```

---

## PHASE 1 — Core models + migrations

### What to build

#### machines/models.py
```python
class MachineCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)

class Machine(models.Model):
    category = models.ForeignKey(MachineCategory, on_delete=models.PROTECT)
    name = models.CharField(max_length=100, unique=True)

class Set(models.Model):
    machine = models.ForeignKey(Machine, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    class Meta:
        unique_together = ['machine', 'name']
```

#### dies/models.py
```python
STATUS_CHOICES = [
    ('AVAILABLE','Available'), ('RUNNING','Running'),
    ('CLEANING','Cleaning'), ('POLISHING','Polishing'),
    ('DAMAGED','Damaged'), ('SCRAPPED','Scrapped'), ('MISSING','Missing'),
]

class Die(models.Model):
    die_id      = models.CharField(max_length=50, unique=True)
    die_type    = models.CharField(max_length=10, choices=[('ROUND','Round'),('FLAT','Flat')])
    casing      = models.CharField(max_length=50)
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    location    = models.CharField(max_length=200, blank=True)  # e.g. "Rack A - Shelf 3"
    current_set = models.ForeignKey('machines.Set', null=True, blank=True, on_delete=models.SET_NULL)
    remarks     = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['casing']),
            models.Index(fields=['die_type']),
            models.Index(fields=['location']),
        ]

class RoundDie(models.Model):
    die           = models.OneToOneField(Die, on_delete=models.CASCADE, related_name='rounddie')
    original_size = models.DecimalField(max_digits=7, decimal_places=3)
    current_size  = models.DecimalField(max_digits=7, decimal_places=3)
    class Meta:
        indexes = [models.Index(fields=['current_size'])]

class FlatDie(models.Model):
    die                = models.OneToOneField(Die, on_delete=models.CASCADE, related_name='flatdie')
    original_width     = models.DecimalField(max_digits=7, decimal_places=3)
    current_width      = models.DecimalField(max_digits=7, decimal_places=3)
    original_thickness = models.DecimalField(max_digits=7, decimal_places=3)
    current_thickness  = models.DecimalField(max_digits=7, decimal_places=3)
    radius             = models.DecimalField(max_digits=7, decimal_places=3)
    class Meta:
        indexes = [models.Index(fields=['current_width', 'current_thickness'])]
```

#### history/models.py
```python
class DieHistory(models.Model):
    die        = models.ForeignKey('dies.Die', on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    timestamp  = models.DateTimeField(auto_now_add=True)
    field_name = models.CharField(max_length=50)
    old_value  = models.TextField()
    new_value  = models.TextField()
    note       = models.TextField(blank=True)
    class Meta:
        ordering = ['-timestamp']
        indexes  = [models.Index(fields=['die', 'timestamp'])]
```

#### users/models.py
```python
class UserSession(models.Model):
    user       = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    token_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen  = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True)
    device     = models.CharField(max_length=255, blank=True)
```

After writing models, run:
```bash
python manage.py makemigrations dies machines history users
python manage.py migrate
```

### Tests — all must pass before Phase 2
```bash
# T1.1 — migrations apply cleanly
docker compose run --rm migrate

# T1.2 — all tables exist in DB
docker compose exec db psql -U dms_user -d dms -c "\dt" | grep -E "dies_die|dies_rounddie|dies_flatdie|machines_machine|history_diehistory|users_usersession"

# T1.3 — location column exists on dies_die table
docker compose exec db psql -U dms_user -d dms -c "\d dies_die" | grep location

# T1.4 — Django system check passes
docker compose run --rm django python manage.py check

# T1.5 — model unit tests
docker compose run --rm django python manage.py test dies.tests.test_models --verbosity=2
```

---

## PHASE 2 — DieHistory signals

... (and so on)


## Changelog
### 2026-06-12 · feat: add client-side CSV template download on Bulk Import page
### 2026-06-12 · docs: update PROJECT.md changelog after readme update
### 2026-06-12 · docs: update API documentation in README.md with Machine Sets CRUD endpoints
### 2026-06-12 · docs: update PROJECT.md changelog
### 2026-06-12 · feat: implement machine category, machine, and set CRUD views with frontend pages, separate dashboard and inventory pages, and fix E2E smoke tests
### 2026-06-12 · docs: add default login credentials to README.md
### 2026-06-12 · docs: finalize project md changelog with the docker setup documentation commit
### 2026-06-12 · docs: update README.md and PROJECT.md to document unified docker setup
### 2026-06-12 · infra: containerize React frontend service in docker-compose with Traefik ingress
### 2026-06-12 · docs: finalize PROJECT.md changelog with readme commit
### 2026-06-12 · docs: generate complete README.md based on codebase analysis
### 2026-06-12 · docs: finalize changelog in PROJECT.md
### 2026-06-12 · docs: update changelog for Phase 6-8 complete
### 2026-06-12 · Phase 6-8: React frontend pages, bulk import, and JWT auth and session prune logic and tests implemented
### 2026-06-12 · Phase 5: Deploy workflow implemented
### 2026-06-12 · Phase 4: REST API + Search implemented and passing all tests
### 2026-06-12 · Phase 3: Django admin configured and all models registered, all tests pass
### 2026-06-12 · Phase 2: DieHistory pre_save signals implemented, all tests pass
### 2026-06-12 · Phase 1: Core models and migrations implemented, all tests pass
### 2026-06-12 · Phase 0: Project scaffold complete and all tests pass
### 2026-06-12 · docs: update changelog for phase 0 scaffold
### 2026-06-12 · Phase 0: Project Scaffold
