# Security Architecture & Rules (SECURITY.md)

This document outlines the security rules, rate limiters, timing-safe checks, and credentials validation mechanisms enforced across the DMS-O2 codebase.

---

## 1. CSRF XMLHttpRequest Validation
*   **Rule**: Cookie-authenticated API requests (POST, PATCH, DELETE) must provide the custom request header `X-Requested-With: XMLHttpRequest`.
*   **Why**: Protects JWT token cookies from Cross-Site Request Forgery (CSRF) attacks by forcing the browser to prove the request originated from an authorized frontend call.
*   **Enforced**: Inside the Django CSRF custom middleware layer.
*   **Files**:
    *   Frontend Client Hook: [useApi.ts](file:///home/sahil/Desktop/Projects/dms-o2/frontend/src/hooks/useApi.ts#L104-L106)
    *   Backend Middleware: [middleware.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/middleware.py)
*   **Failure Mode**: State-changing requests will fail with a `403 Forbidden` error.
*   **Correct Example (TypeScript)**:
    ```typescript
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    ```

---

## 2. Timing-Safe Internal Verification Key
*   **Rule**: Service-to-service validation of `X-Internal-Key` must use `hmac.compare_digest`.
*   **Why**: Mitigates timing attacks where attackers could measure character comparison response times to brute-force the internal API secret key.
*   **Enforced**: Verify Token endpoint logic.
*   **Files**:
    *   Go Client Authentication: [auth.go](file:///home/sahil/Desktop/Projects/dms-o2/go-api/internal/auth/auth.go)
    *   Backend Middleware check: [middleware.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/middleware.py)
*   **Failure Mode**: Exposed endpoints vulnerable to timing analysis attacks.
*   **Correct Example (Python)**:
    ```python
    if not hmac.compare_digest(internal_key, settings.INTERNAL_API_SECRET):
        return HttpResponseForbidden("Invalid internal key")
    ```

---

## 3. Brute-Force Rate Limiting & Lockout Throttling
*   **Rule**: Login requests are rate-limited to 5 requests/minute per IP, and 5 consecutive failures block the username for 5 minutes (300 seconds).
*   **Why**: Prevents brute-force attacks on credentials.
*   **Enforced**: `LoginRateThrottle` and Redis cache keys.
*   **Files**:
    *   Authentication Views: [auth.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/views/auth.py)
*   **Failure Mode**: Vulnerability to brute-force credential stuffing.
*   **Correct Example (Python)**:
    ```python
    class LoginView(APIView):
        throttle_classes = [LoginRateThrottle]
    ```

---

## 4. Secure Path-Traversal Filename Validations
*   **Rule**: Backup file paths must be validated using `os.path.commonpath`.
*   **Why**: Prevents path traversal directory disclosures.
*   **Enforced**: `BackupService.validate_filepath()`.
*   **Files**:
    *   Backup Service: [backup_service.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/users/services/backup_service.py#L205-L210)
*   **Failure Mode**: File disclosures outside `/backups/`.
*   **Correct Example (Python)**:
    ```python
    filepath = os.path.realpath(os.path.join(backup_dir, filename))
    real_backup_dir = os.path.realpath(backup_dir)
    if os.path.commonpath([filepath, real_backup_dir]) != real_backup_dir:
        raise ValueError('Invalid filepath')
    ```

---

## 5. Startup Credentials Hardening Checks
*   **Rule**: If `DJANGO_DEBUG=False`, Django checks environment variables and raises `ImproperlyConfigured` if they match default local configurations.
*   **Why**: Prevents production deployments from running with weak default credentials.
*   **Enforced**: Django settings.py at startup.
*   **Files**:
    *   Django Settings: [settings.py](file:///home/sahil/Desktop/Projects/dms-o2/backend/dms/settings.py#L272-L283)
*   **Failure Mode**: Production deployment with weak default credentials.
*   **Mandatory Checks**:
    *   `DJANGO_SECRET_KEY` != `django-insecure-development-secret-key-12345`
    *   `MEILI_MASTER_KEY` >= 16 chars and not in (`meili_secret_key`, `change_me`)
    *   `INTERNAL_API_SECRET` >= 16 chars and not in (`dms_internal_secret_default_key_998`, `your-internal-secret`)
    *   `POSTGRES_PASSWORD` >= 16 chars and not in (`db_secret_password`, `password`, `postgres`, `dms_pass_password`)

---

## 6. Non-Root Container Execution
*   **Rule**: All application containers must run under a dedicated non-root user (`USER dmsuser`). Container ports must bind to non-privileged ports (>=1024) internally.
*   **Why**: Minimizes the attack surface. If an attacker exploits a remote code execution vulnerability in any application process, they do not gain root access to the container or host filesystem.
*   **Enforced**: Dockerfiles, Docker Compose files, and Supervisord configurations.
*   **Files**:
    *   Unified Monolith Dockerfile: [Dockerfile](file:///home/sahil/Desktop/Projects/dms-o2/Dockerfile)
    *   Backend Dockerfile: [backend/Dockerfile](file:///home/sahil/Desktop/Projects/dms-o2/backend/Dockerfile)
    *   Go-API Dockerfile: [go-api/Dockerfile](file:///home/sahil/Desktop/Projects/dms-o2/go-api/Dockerfile)
*   **Failure Mode**: Services running as root user inside production container runtimes.
*   **Correct Example (Dockerfile)**:
    ```dockerfile
    # Create a non-root system user and group
    RUN groupadd -g 1000 dmsgroup && \
        useradd -u 1000 -g dmsgroup -m -s /bin/bash dmsuser
    USER dmsuser
    ```
