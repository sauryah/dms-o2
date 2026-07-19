# Enterprise Roadmap & Phases (roadmap.md)

## Phase 1: Security & Service Boundaries (Completed)
- Go auth verification cached for 5 minutes.
- Logout evicts Go verification cache key directly.
- OutboxTask payload signed using SHA-256 HMAC signatures.
- Go startup validation checks for insecure development secrets.

## Phase 2: Location Grid & Physical Schema (Next Phase)
- Migrate free-text `Die.location` to structured table (`rack_id` + `shelf_number`).
- Prevent tool assignment to non-existent layout spots.

## Phase 3: Wear Alert Automation & ML (Future Phase)
- Build daily cron tasks executing wear predictions.
- Train predictive models forecasting tool remaining lifetime.
