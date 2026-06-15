# Feature Plan: High-Performance Go Search Microservice

## 1. Overview
Introduce a lightweight, high-performance Go microservice (`dms-go-api`) to handle search and dashboard read operations, offloading them from the Django REST backend. Django remains the primary system of record for mutations, administration, and authentication, while Go processes high-frequency queries against PostgreSQL and Meilisearch.

## 2. Requirements
- [x] Create an optimized Go microservice using standard library `http.ServeMux` for routing.
- [x] Establish high-speed connection pools for PostgreSQL and Meilisearch.
- [x] Implement `/api/go/health` and `/api/go/search` endpoints.
- [x] Route `/api/go/*` requests through Traefik ingress proxy.
- [x] Redirect frontend search calls (registry explorer and dashboard) to the Go API.
- [x] Resolve PostgreSQL `ANY($1)` SQL array parameter parsing issues.
- [x] Establish clean dev server proxy routing for `/api/go` in `vite.config.js`.

## 3. Architecture & Design
- **Frontend**: React 18 + TanStack React Query. Calls `/api/go/search` for search queries.
- **Backend**: Go microservice handles search API. Django backend handles write mutations (creating/deleting/updating dies, JWT authentication, and bulk imports).
- **Database / Search**: Go connects directly to PostgreSQL 18 and Meilisearch v1.7.

## 4. Implementation Steps
1. [x] Scaffold `/go-api` with `Dockerfile`, `go.mod`, and `main.go`.
2. [x] Set up database pool limits and Meilisearch query mechanisms in Go.
3. [x] Configure Traefik path rules and priorities (`priority=100` for Go, `priority=50` for Django).
4. [x] Update frontend queries in `App.tsx` for dashboard and registry search.
5. [x] Implement `pq.Array` binding to fix PostgreSQL query failures.
6. [x] Configure Vite development server proxy to avoid routing `/api/go` to Django.

## 5. Testing Plan
- [x] Direct API endpoint verification via `curl`.
- [x] Frontend unit testing with Vitest.
- [x] Full integration smoke testing using Playwright E2E suites.
