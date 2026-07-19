# AI Master Context Entrypoint (MASTER_CONTEXT.md)

This directory (`.ai/`) contains the complete machine-readable systems engineering ledger, architecture blueprints, schema definitions, and operational logs for DMS-O2. It serves as the primary contextual repository for AI coding agents.

## 📖 Context Files Map

1.  **[MASTER_CONTEXT.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/MASTER_CONTEXT.md)**: Entry point guide containing directory guide, technology stacks, and indexes.
2.  **[ARCHITECTURE.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/ARCHITECTURE.md)**: Deep-dive into Gunicorn, Celery workers, Go Search routing, SSE loops, and proxies.
3.  **[CONVENTIONS.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/CONVENTIONS.md)**: Coding standards, formatting rules, test matrices, and logging guidelines.
4.  **[BUSINESS_RULES.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/BUSINESS_RULES.md)**: Sizing logic, recut rules, wear alerts thresholds, and profile edits.
5.  **[SECURITY.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/SECURITY.md)**: Hardening settings, token secrets check, cookie security, brute-force throttling, and path-traversal verification.
6.  **[OPERATIONS.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/OPERATIONS.md)**: Database backup/restores workflows, md5 validation, container boot scripts, and setup commands.
7.  **[DECISION_LOG.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/DECISION_LOG.md)**: Architectural decisions log (outbox, token caching, cookies CSRF safeguards).
8.  **[FEATURE_MAP.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/FEATURE_MAP.md)**: Inventory EXPLORER tree, SVG hover synchronization, Rack grid layout, and Elongation Calculator bench.
9.  **[API_MAP.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/API_MAP.md)**: Mapping of endpoints, validation headers, internal verification, and SSE streams.
10. **[DATABASE.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/DATABASE.md)**: Models definitions, field schemas, GIN indexing structures, and cascading ORM signals.
11. **[STATE_FLOW.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/STATE_FLOW.md)**: Lifecycle states of dies, allocations, recut state updates, and wear alerts escalations.
12. **[DEPENDENCIES.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/DEPENDENCIES.md)**: Pinned Python libraries, Node package modules, Go sum definitions, and Docker base layers.
13. **[ROADMAP.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/ROADMAP.md)**: Complete roadmap history, phased development steps, and future vectors.
14. **[TECH_DEBT.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/TECH_DEBT.md)**: Performance scale limitations, duplicate tools, and code decomposition items.
15. **[KNOWN_BUGS.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/KNOWN_BUGS.md)**: Historical resolved defects, outstanding bugs, and troubleshooting guides.
16. **[TASK_HISTORY.md](file:///home/sahil/Desktop/Projects/dms-o2/.ai/TASK_HISTORY.md)**: Timeline of milestones, updates logs, and chronological releases.

---

## 📂 Repository Folder Guide

```
dms-o2/
├── .ai/                      # AI Context files (this directory)
├── .github/
│   └── workflows/            # GitHub Action CI/CD deployment files
├── .githooks/
│   └── pre-commit            # Git pre-commit syntax & quality controllers
├── backend/                  # Django monolith package
│   ├── dies/                 # Die management models, services, tasks, signals
│   ├── history/              # Audit trails database models and tasks
│   ├── machines/             # Categories, Machines, Sets, Racks configurations
│   ├── users/                # Authentication, sessions, profiling, backups
│   ├── dms/                  # Core WSGI, Celery and settings definitions
│   ├── search/               # Meilisearch helpers and Outbox Celery tasks
│   └── manage.py             # Django controller entry point
├── go-api/                   # Go Search API microservice
│   ├── cmd/server/           # Service HTTP server entry point (main.go)
│   └── internal/             # Config, DB connections, Cache, Handlers, SSE events
├── frontend/                 # React 18 / Vite frontend SPA
│   ├── src/                  
│   │   ├── features/         # Dashboard state, tree layouts, calculators
│   │   ├── pages/            # View pages and tabs component pages
│   │   ├── hooks/            # useApi HTTP client & useRealtimeSync hooks
│   │   └── contexts/         # Authentication and user state providers
│   └── tests/                # Unit test files
├── scripts/                  # Shell utilities (certs generation, backups, pruners)
├── Makefile                  # Local shortcut command orchestrations
├── nginx-monolith.conf       # Unified monolithic production server settings
├── supervisord.conf          # Unified container process coordinator
└── entrypoint.sh             # Production container boot script
```

---

## 🛠️ Technology Stack Overview

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Relational Database** | PostgreSQL 18 | rel-data, indexing, triggers, audit trails |
| **Monolithic WSGI Backend** | Django 4.2.21 + DRF 3.15.2 | authentication, mutations, xlsx, tasks |
| **Search Microservice** | Go 1.22 | high-speed reads, PostgreSQL pool joins |
| **Cache & Task Broker** | Redis 5.0.1 / Redis DB 0 & 1 | cached search key hash, celery queue broker |
| **Search Engine** | Meilisearch v1.7 | fuzzy text token matching |
| **Web UI Frontend** | React 18.2.0 + Vite 5.1.0 | SPA UI, custom React query state |
| **Process Manager** | Supervisord | Gunicorn + Celery + Go API + Nginx |
| **Container Router** | Nginx | serves static assets, proxies `/api/` |
| **LAN TLS Provider** | mkcert (LAN IP detection) | machines LAN secure SSL certifications |
