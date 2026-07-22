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

## 3. Login Lockout Throttling
- Max 5 requests/minute per IP.
- 5 consecutive failures lockout the account for 5 minutes.

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
