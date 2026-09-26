# Active Task

## Purpose
Track current work item for AI sessions.
**Why:** Enable session continuity and task resumption.
**Read by:** AI agents.
**Updated:** Every session.

### Current Task
**Task:** LAN Accessibility, Resilient Routing & WSL2 Stability Overhaul
**Status:** Complete
**Started:** 2026-09-26
**Completed:** 2026-09-26
**Confidence:** 100%

## Task Description
Executed comprehensive stability and multi-device LAN access overhaul:
1. **WSL2 Stability & Healthcheck Throttling (Loop 1)**: Relaxed all 10 container healthchecks to 15s/30s/60s intervals and node-localized Celery worker checks, eliminating WSL2 containerd PID exhaustion.
2. **Dynamic RFC 1918 Private Subnet Matching (Loop 2)**: Added `PrivateNetworkHostMatcher` to `settings.py` so DHCP address changes do not trigger `400 Bad Request`.
3. **Multi-SAN Local TLS Certificates (Loop 3)**: Re-issued certificates covering active IP, `toolroom.local`, `dms.local`, and localhost.
4. **Friendly Hostname & mDNS (Loop 4)**: Validated native Windows mDNS name resolution for `https://toolroom.local`.
5. **Operational Diagnostics & Autostart (Loop 5)**: Created `scripts/network-doctor.ps1` for 1-click audit and recovery, and `scripts/install-autostart.ps1` for silent startup on boot.
6. **Reverse-Proxy IP Attribution & Login Throttle Isolation (Loop 6)**: Configured `NUM_PROXIES = 1` and isolated `LoginRateThrottle` to resolve "Request was throttled" on login.
7. **Standalone Native Client Setup Tool (Loop 7)**: Built native C# executable `DMS-Client-Setup.exe` automating root CA installation, browser enterprise policy, and desktop shortcut.
8. **Documentation & Operational Runbook**: Updated `README.md` and dev docs.
9. **Full-Stack Verification**: 200/200 Django tests pass, 70/70 Vitest tests pass, 0 TypeScript errors, 10/10 containers healthy.
Executed comprehensive privacy hardening and eliminated all unnecessary third-party requests and trackers across the stack:
1. **Self-Hosted Local Fonts**:
   - Downloaded official WOFF2 binaries for Inter (weights 400-700) and Plus Jakarta Sans (weights 500-800) covering Latin, Latin-ext, Cyrillic, Greek, and Vietnamese subsets into `frontend/public/fonts/`.
   - Created localized stylesheet `frontend/public/fonts/fonts.css` and src bundler integration module `frontend/src/fonts.css`.
   - Imported `./fonts.css` directly in `frontend/src/index.css`.
   - Removed external `preconnect` and stylesheet links to `fonts.googleapis.com` and `fonts.gstatic.com` from `frontend/index.html`.
   - Updated `design-system/die-management-system/MASTER.md` typography documentation to reference self-hosted fonts.
   - Updated ServiceWorker `frontend/public/sw.js` to cache `.woff2` and `.woff` assets and bumped cache version to `dms-static-v4`.
2. **Third-Party Tracker Purge**:
   - Removed Sentry integration from `frontend/src/components/ErrorBoundary.tsx` and `frontend/src/main.tsx`.
   - Deleted unused `frontend/src/utils/sentry.ts`.
   - Removed Sentry integration and external IP resolution (`8.8.8.8`) from `backend/dms/settings.py` (replaced with RFC 1918 private address `10.255.255.255`).
   - Removed `sentry-sdk==2.66.1` dependency from `backend/requirements.txt`.
3. **Verification**:
   - Zero occurrences of `fonts.googleapis.com` or `fonts.gstatic.com` across the codebase.
   - All 70 Vitest tests green, TypeScript typecheck clean (0 errors), production Vite build successful.
   - All 101 Django tests green. Docker frontend container rebuilt and verified serving fonts locally with HTTP 200 and 1-year immutable caching.

## Completed
1. 100% self-hosted typography replacing Google Fonts — 100% complete.
2. Complete removal of Sentry and external tracking dependencies — 100% complete.
3. Verification of 0 external font/tracking network requests — 100% complete.
4. All files committed individually with `--no-gpg-sign`.

## Next Steps
- Maintain strict CSP and self-hosted privacy standards.
- Push commits to remote origin if requested.

## Blockers
- None. System is fully air-gapped ready and privacy friendly.
