#!/bin/bash
set -e

# Configuration
MTLS_CLIENT_NAME="lihas.dms"

echo "=== DMS Setup Automation ==="

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed on this system. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "ERROR: Docker Compose is not installed on this system."
    exit 1
fi

# 2. Check environment file
if [ ! -f .env ]; then
    if command -v python3 &> /dev/null; then
        echo ">>> Creating .env file from template with secure dynamic keys..."
        python3 -c "
import secrets, re
with open('.env.example', 'r') as f:
    content = f.read()
content = content.replace('POSTGRES_PASSWORD=auto:run_setup_to_generate', f'POSTGRES_PASSWORD={secrets.token_urlsafe(24)}')
content = content.replace('DJANGO_SECRET_KEY=auto:run_setup_to_generate', f'DJANGO_SECRET_KEY={secrets.token_urlsafe(48)}')
content = content.replace('MEILI_MASTER_KEY=auto:run_setup_to_generate', f'MEILI_MASTER_KEY={secrets.token_urlsafe(32)}')
content = content.replace('ROOT_PASSWORD=auto:run_setup_to_generate', f'ROOT_PASSWORD={secrets.token_urlsafe(16)}')
content = content.replace('REDIS_PASSWORD=auto:run_setup_to_generate', f'REDIS_PASSWORD={secrets.token_urlsafe(24)}')
content = content.replace('INTERNAL_API_SECRET=auto:run_setup_to_generate', f'INTERNAL_API_SECRET={secrets.token_urlsafe(32)}')
with open('.env', 'w') as f:
    f.write(content)
"
        echo ">>> Created .env file with generated secure keys and passwords."
    else
        echo ">>> WARNING: python3 not found. Creating .env from template (please manually replace default secrets)..."
        cp .env.example .env
    fi
else
    echo ">>> Environment file .env already exists."
fi

# 2.8. Generate TLS certificates
echo ">>> Generating TLS certificates for HTTPS..."
LAN_IP_CERT=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)
if [ -z "$LAN_IP_CERT" ]; then
    LAN_IP_CERT=$(hostname -I | awk '{print $1}' || true)
fi
if [ -n "$LAN_IP_CERT" ] && command -v mkcert &> /dev/null; then
    mkdir -p certs
    mkcert -install 2>/dev/null || true
    mkcert -cert-file certs/cert.pem -key-file certs/key.pem localhost 127.0.0.1 "$LAN_IP_CERT" ::1
    CAROOT=$(mkcert -CAROOT 2>/dev/null || true)
    if [ -n "$CAROOT" ] && [ -f "$CAROOT/rootCA.pem" ]; then
        cp "$CAROOT/rootCA.pem" certs/rootCA.pem
        echo ">>> Root CA copied: certs/rootCA.pem"
        if command -v openssl &> /dev/null; then
            openssl x509 -outform der -in certs/rootCA.pem -out certs/rootCA.cer
            echo ">>> Root CA exported in DER format: certs/rootCA.cer"
        fi
    fi
    echo ">>> TLS certificates generated for $LAN_IP_CERT"

    # Automatically generate a client certificate if mTLS is enabled in dynamic.yml
    auto_client_cert_generated=false
    if [ -f dynamic.yml ] && grep -q "clientAuth:" dynamic.yml; then
        echo ">>> mTLS is enabled. Auto-generating a universal client certificate..."
        CLIENT_NAME="$MTLS_CLIENT_NAME"
        mkcert -client -cert-file "certs/client-$CLIENT_NAME.pem" -key-file "certs/client-$CLIENT_NAME-key.pem" localhost 127.0.0.1 ::1
        
        if command -v openssl &> /dev/null; then
            openssl pkcs12 -export -out "certs/client-$CLIENT_NAME.p12" -inkey "certs/client-$CLIENT_NAME-key.pem" -in "certs/client-$CLIENT_NAME.pem" -certfile "certs/rootCA.pem" -passout pass:
            
            # Generate companion instructions and installer scripts
            if [ -f scripts/client-instructions-template.txt ]; then
                sed "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" scripts/client-instructions-template.txt > "certs/client-$CLIENT_NAME-INSTRUCTIONS.txt"
            fi
            if [ -f scripts/client-install-template.bat ]; then
                sed "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" scripts/client-install-template.bat > "certs/client-$CLIENT_NAME-install.bat"
            fi
            if [ -f scripts/client-install-template.sh ]; then
                sed "s/{{CLIENT_NAME}}/$CLIENT_NAME/g" scripts/client-install-template.sh > "certs/client-$CLIENT_NAME-install.sh"
                chmod +x "certs/client-$CLIENT_NAME-install.sh"
            fi
            
            echo ">>> Auto-generated universal client certificate: certs/client-$CLIENT_NAME.p12"
            auto_client_cert_generated=true
        else
            echo ">>> WARNING: openssl not found. Could not auto-generate .p12 client certificate bundle."
        fi
    fi
    if [ -f .env ] && ! grep -q "$LAN_IP_CERT" .env; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/DJANGO_ALLOWED_HOSTS=.*/&,$LAN_IP_CERT/" .env
        else
            sed -i "s/DJANGO_ALLOWED_HOSTS=.*/&,$LAN_IP_CERT/" .env
        fi
        echo ">>> Updated DJANGO_ALLOWED_HOSTS in .env with LAN IP ($LAN_IP_CERT)"
    fi
elif [ -z "$LAN_IP_CERT" ]; then
    echo ">>> WARNING: Could not detect LAN IP. Run scripts/generate-certs.sh manually."
else
    echo ">>> WARNING: mkcert not found. Install with: brew install mkcert (macOS) or apt install mkcert (Linux)"
    echo ">>> Then run: scripts/generate-certs.sh"
fi

# 2.9. Check for active firewalls and open port 80/443 if needed
if systemctl is-active firewalld &>/dev/null; then
    echo ">>> Detected active firewalld. Ensuring HTTP port 80 is open..."
    if ! firewall-cmd --list-services | grep -q "http"; then
        echo ">>> Opening port 80/HTTP in firewalld..."
        sudo firewall-cmd --add-service=http --permanent
        sudo firewall-cmd --add-service=https --permanent
        sudo firewall-cmd --reload
    else
        echo ">>> HTTP service is already allowed in firewalld."
    fi
elif command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active" &>/dev/null; then
    echo ">>> Detected active UFW firewall. Ensuring HTTP/HTTPS ports are open..."
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
fi

# 3. Spin up Docker containers
echo ">>> Pre-pulling required Docker images sequentially to prevent connection timeouts..."
IMAGES=(
    "postgres:18-alpine"
    "getmeili/meilisearch:v1.7"
    "redis:7-alpine"
    "traefik:v3"
    "python:3.11-slim"
    "golang:1.22-alpine"
    "node:18-alpine"
    "alpine:latest"
)
for img in "${IMAGES[@]}"; do
    echo ">>> Pulling $img..."
    docker pull "$img" || echo ">>> WARNING: Failed to pre-pull $img, continuing..."
done

echo ">>> Bootstrapping containers with Docker Compose..."
docker compose up -d --build


# 4. Wait for the database container to become healthy
echo ">>> Waiting for PostgreSQL database container to pass health checks..."
RETRIES=30
until [ $RETRIES -eq 0 ] || docker compose exec db pg_isready &> /dev/null; do
    echo "Waiting for database... ($RETRIES retries left)"
    sleep 2
    RETRIES=$((RETRIES-1))
done

if [ $RETRIES -eq 0 ]; then
    echo "ERROR: Database container failed to start in time. Check docker logs."
    exit 1
fi

# 5. Apply database migrations
echo ">>> Applying database migrations..."
docker compose exec django python manage.py migrate

# 6. Initialize Root account
echo ">>> Checking/Creating default root superuser..."
docker compose exec django python manage.py create_root_user

# 7. Sync Meilisearch indices
echo ">>> Rebuilding Meilisearch index cache..."
docker compose exec django python manage.py sync_search

# 8. Access Info
LAN_IP=""
if command -v ip &> /dev/null; then
    LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)
    if [ -z "$LAN_IP" ]; then
        LAN_IP=$(ip -o -4 addr show | grep -v '127.0.0.1' | grep -v 'docker' | grep -v 'br-' | awk '{print $4}' | cut -d/ -f1 | head -n1 || true)
    fi
fi
if [ -z "$LAN_IP" ] && command -v hostname &> /dev/null; then
    LAN_IP=$(hostname -I | awk '{print $1}' || true)
fi

CUR_HOSTNAME=$(hostname)
echo "======================================================"
echo ">>> Setup Completed Successfully!"
echo ">>> You can now access the DMS application at:"
echo "    - Local Web URL: https://localhost"
echo "    - Django Admin:  https://localhost/admin/"
if [ -n "$LAN_IP" ]; then
    echo "    - LAN Web URL:   https://$LAN_IP"
fi
if [ "$CUR_HOSTNAME" = "dms" ]; then
    echo "    - LAN mDNS URL:  https://dms.local"
else
    echo ""
    echo ">>> LAN ACCESS SETUP NOTE:"
    echo "    Your current system hostname is '$CUR_HOSTNAME'."
    echo "    To access the app from other computers on your LAN using https://dms.local:"
    echo "    1. Run: sudo hostnamectl set-hostname dms"
    echo "    2. Run: sudo systemctl restart avahi-daemon"
fi
echo ""
if [ -f dynamic.yml ] && grep -q "clientAuth:" dynamic.yml; then
    echo ">>> IMPORTANT: Mutual TLS (mTLS) is enabled!"
    if [ "$auto_client_cert_generated" = true ]; then
        echo "    We auto-generated a universal client certificate and installers for you:"
        echo "      certs/client-universal.p12 (Universal certificate)"
        echo "      certs/client-universal-install.bat (Windows installer)"
        echo "      certs/client-universal-install.sh (macOS/Linux installer)"
        echo "    Please run the installer script on your client device to gain access."
    else
        echo "    To access the application, you must install a client certificate."
        echo "    Refer to README.md for instructions on certificate setup."
    fi
    echo ""
fi
echo ">>> To access from another computer:"
echo "    Copy the client-universal files and rootCA.cer/rootCA.pem to the other PC."
echo "    Run the installer script on the client machine to trust the CA and install the cert."
echo "    See README.md for instructions"
echo "======================================================"

