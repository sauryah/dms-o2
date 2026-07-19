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
