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
- Max 5 login attempts per minute per IP address (configured via `LoginRateThrottle` in `users/views/auth.py`).
- Failed attempts tracked per-username in Redis (`login_attempts:{username}`) with 5-minute expiry. After 5 consecutive failures, further attempts are blocked until the Redis key expires.

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

## 8. Two-Factor Authentication (TOTP / 2FA)
- Supports RFC 6238 time-based one-time passcodes using `pyotp` with 30-second rotation window.
- Login challenge issues signed temporary session tokens with 5-minute expiry (`salt="dms-mfa-login"`).
- Setup secret verification cached with short TTL in Redis (`mfa_setup_secret:{user_id}`).
- Disabling requires verification of both user account password and active 6-digit TOTP token.

## 9. Outbox Retention & Cleanup
- Processed outbox tasks are automatically pruned by Celery Beat (`prune_processed_outbox_tasks`) with a 7-day retention window to prevent database bloat while maintaining a transient debug buffer.
