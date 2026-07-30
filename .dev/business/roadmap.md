# Enterprise Roadmap & Phases (roadmap.md)

## Phase 1: Security & Service Boundaries (Completed)
- Go auth verification cached for 5 minutes.
- Logout evicts Go verification cache key directly.
- OutboxTask payload signed using SHA-256 HMAC signatures.
- Go startup validation checks for insecure development secrets.
- Redis AOF persistence enabled.
- Docker resource limits applied to all services.

## Phase 2: Location Grid & Physical Schema (Completed)
- Migrated free-text `Die.location` to structured `rack` (FK) + `shelf_number`.
- Validation prevents assignment to non-existent layout spots.
- API endpoints updated to use rack_id/shelf_number filters.

## Phase 3: Wear Alert Automation & ML (Partial - Alert Engine Done)
- DieTolerance and WearAlert models implemented with configurable thresholds.
- Background validation on die post-save signals.
- Wear alerts exposed via API (`/api/v1/tolerances/`, `/api/v1/wear-alerts/`).
- Daily wear check task via Celery Beat (`check_all_wear_alerts_task`).
- **Remaining**: Predictive ML models forecasting tool remaining lifetime.

## Additional Completed Work
- **v1.9.2**: 3D Stress Heatmap, Theory Panel, granular permissions tree, live auth sync.
- **v1.9.3**: Die Inventory redesign (multi-view, wizard, filters, slide-out drawer).
- **SWR Caching**: Stale-while-revalidate for `/api/go/stats` endpoint.
- **Code Splitting**: Lazy-loaded charting, 3D viewer, CAD blueprint components.
