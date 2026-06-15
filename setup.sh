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

# 2.8. Check for active firewalls and open port 80/HTTP if needed
if systemctl is-active firewalld &>/dev/null; then
    echo ">>> Detected active firewalld. Ensuring HTTP port 80 is open..."
    if ! firewall-cmd --list-services | grep -q "http"; then
        echo ">>> Opening port 80/HTTP in firewalld..."
        sudo firewall-cmd --add-service=http --permanent
        sudo firewall-cmd --reload
    else
        echo ">>> HTTP service is already allowed in firewalld."
    fi
elif command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active" &>/dev/null; then
    echo ">>> Detected active UFW firewall. Ensuring HTTP port 80 is open..."
    sudo ufw allow http
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
echo "    - Local Web URL: http://localhost"
echo "    - Django Admin:  http://localhost/admin/"
if [ -n "$LAN_IP" ]; then
    echo "    - LAN Web URL:   http://$LAN_IP"
fi
if [ "$CUR_HOSTNAME" = "dms" ]; then
    echo "    - LAN mDNS URL:  http://dms.local"
else
    echo ""
    echo ">>> LAN ACCESS SETUP NOTE:"
    echo "    Your current system hostname is '$CUR_HOSTNAME'."
    echo "    To access the app from other computers on your LAN using http://dms.local:"
    echo "    1. Run: sudo hostnamectl set-hostname dms"
    echo "    2. Run: sudo systemctl restart avahi-daemon"
fi
echo "======================================================"

