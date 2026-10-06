# Security Guidelines & Controls (security.md)

## 1. CSRF Verification Header
Mutating POST/PATCH/DELETE API requests using cookie authentication must supply:
`X-Requested-With: XMLHttpRequest`

## 2. Timing-Safe Key Comparisons
Verification calls use timing-safe comparators:
```python
if not hmac.compare_digest(internal_key, settings.INTERNAL_API_SECRET):
    return Response(status=status.HTTP_403_FORBIDDEN)
```

## 3. Login Rate Limiting
- Max 15 login attempts per minute per IP address (configured via isolated `LoginRateThrottle` in `users/views/auth.py` with `scope = 'login'`).
- Failed attempts tracked per-username in Redis (`login_attempts:{username}`) with 5-minute expiry. After consecutive failures, further attempts are blocked until the Redis key expires.

## 4. Outbox Payload Integrity
All `OutboxTask` payloads are signed using a SHA-256 HMAC signature. The outbox processor validates this signature before executing sync commands, mitigating injection risks.

## 5. Security Headers (Go API)
All Go API responses include production-standard security headers:
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Cross-Origin-Opener-Policy: same-origin` - Isolates browsing context
- `Cross-Origin-Resource-Policy: same-origin` - Prevents cross-origin resource loading

## 6. Request Size Limits
Go API enforces a 10MB request body size limit to prevent denial-of-service attacks via oversized payloads.

## 7. Server Timeouts
Go API server enforces the following timeouts to prevent resource exhaustion:
- ReadHeaderTimeout: 10 seconds
- ReadTimeout: 30 seconds
- WriteTimeout: 30 seconds
- IdleTimeout: 120 seconds

## 8. Two-Factor Authentication via Single-Use Backup Codes
- Secondary sign-in security uses cryptographically hashed (SHA-256) one-time recovery codes (`UserBackupCode`).
- Users generate 10 single-use codes (`XXXX-XXXX` format). Upon verification during login, the specific code is atomically marked as used.
- Sign-in attempts with depleted codes are blocked with HTTP 403 Forbidden.
- Disabling requires verification of the user's current password.
- Emergency CLI unlock: Administrators can reset MFA for any locked user via `python manage.py reset_mfa <username>`.

## 9. Outbox Retention & Cleanup
- Processed outbox tasks are automatically pruned by Celery Beat (`prune_processed_outbox_tasks`) with a 7-day retention window to prevent database bloat while maintaining a transient debug buffer.

## 10. Role-Based Session Eviction & Auth Cache Invalidation
- When a user's role or tool authorization permissions are updated by an administrator, all active database sessions (`UserSession`) for that user are revoked and Redis auth token caches are purged immediately, forcing client re-authentication.

## 11. Reverse Proxy IP Attribution & Dynamic LAN Matching
- `NUM_PROXIES = 1` configured in `settings.py` so Django REST Framework accurately resolves client IP addresses from `X-Forwarded-For` behind the Traefik reverse proxy.
- `PrivateNetworkHostMatcher` dynamically permits RFC 1918 private subnets and `.local` hostnames when `DJANGO_ALLOW_PRIVATE_IPS=True`, preventing `400 Bad Request` upon DHCP address reallocations.

## 12. Safe Method Authentication Enforcement
- Custom permission classes `IsAdminOrRoot` and `IsAdminOrRootOrOperatorRelocate` enforce `IsAuthenticated` on safe methods (`GET`, `HEAD`, `OPTIONS`), returning HTTP 401 Unauthorized for unauthenticated queries.

## 13. Privacy Hardening & Self-Hosted Typography
- All UI typography (Inter, Plus Jakarta Sans) is 100% self-hosted as WOFF2 assets in `frontend/public/fonts/`.
- All external links to Google Fonts (`fonts.googleapis.com`) and third-party trackers (Sentry SDK) have been completely removed, ensuring zero external data leakage and full air-gap compliance.
