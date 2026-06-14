#!/bin/bash
set -e

echo "=== DMS (Die Management System) Setup Automation ==="

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
    echo ">>> Creating .env file from template..."
    cp .env.example .env
    echo ">>> Created .env file. Please edit it if you need custom database ports or passwords."
else
    echo ">>> Environment file .env already exists."
fi

# 2.5 Check and generate local SSL certificates for HTTPS
if [ ! -f certs/dms.local.pem ] || [ ! -f certs/dms.local-key.pem ]; then
    echo ">>> Local SSL certificates not found. Automating certificate generation..."
    mkdir -p certs
    
    # Check if mkcert is available on system
    MKCERT_BIN="mkcert"
    if ! command -v mkcert &> /dev/null; then
        if [ ! -f ./mkcert ]; then
            echo ">>> mkcert not found on system. Downloading precompiled binary..."
            ARCH=$(uname -m)
            OS=$(uname -s | tr '[:upper:]' '[:lower:]')
            if [ "$ARCH" = "x86_64" ] && [ "$OS" = "linux" ]; then
                curl -L -o ./mkcert https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-linux-amd64
                chmod +x ./mkcert
                MKCERT_BIN="./mkcert"
            else
                echo "WARNING: Unsupported OS/Architecture for automated download."
                echo "Please install mkcert manually (https://github.com/FiloSottile/mkcert) and generate certs in ./certs/"
                exit 1
            fi
        else
            MKCERT_BIN="./mkcert"
        fi
    fi
    
    # Generate the local certs
    $MKCERT_BIN -cert-file certs/dms.local.pem -key-file certs/dms.local-key.pem dms.local "*.dms.local" localhost 127.0.0.1
    echo ">>> Generated SSL certificates in ./certs/"
    echo ">>> NOTE: To trust this certificate in your browser, run: $MKCERT_BIN -install"
fi

# 3. Spin up Docker containers
echo ">>> Bootstrapping containers with Docker Compose..."
docker compose up -d --build


# 4. Wait for the database container to become healthy
echo ">>> Waiting for PostgreSQL database container to pass health checks..."
RETRIES=30
until [ $RETRIES -eq 0 ] || docker compose exec db pg_isready -U dms_user -d dms &> /dev/null; do
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

echo "======================================================"
echo ">>> Setup Completed Successfully!"
echo ">>> You can now access the DMS application at:"
echo "    - Web App URL: http://localhost"
echo "    - Django Admin: http://localhost/admin/"
echo "======================================================"
