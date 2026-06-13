#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Starting DMS Application Upgrade ==="

# 1. Pull the latest changes from Git
echo ">>> Pulling latest code from GitHub..."
git pull

# 2. Check environment variables
if [ ! -f .env ]; then
    echo ">>> Error: .env file is missing!"
    echo "Creating it from .env.example. Please update your environment variables before continuing."
    cp .env.example .env
    exit 1
fi

# Compare .env and .env.example keys to find missing configurations
echo ">>> Validating environment variables..."
missing_keys=()
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    if [[ "$line" =~ ^# ]] || [[ -z "$line" ]] || [[ ! "$line" =~ = ]]; then
        continue
    fi
    key=$(echo "$line" | cut -d'=' -f1 | tr -d ' ')
    if ! grep -q "^[[:space:]]*${key}[[:space:]]*=" .env; then
        missing_keys+=("$key")
    fi
done < .env.example

if [ ${#missing_keys[@]} -gt 0 ]; then
    echo ">>> WARNING: The following required keys are missing in your .env file:"
    for k in "${missing_keys[@]}"; do
        echo "  - $k"
    done
    echo "Please update your .env file with these variables and restart the deploy script."
    exit 1
fi

# 3. Build containers (applies new package installations from package.json and requirements.txt)
echo ">>> Building docker containers with Docker Compose..."
docker compose -f docker-compose.prod.yml build

# 4. Bring up the containers (automatically applies DB migrations on migrate container completed)
echo ">>> Starting services in production mode..."
docker compose -f docker-compose.prod.yml up -d

# 5. Synchronize/Initialize root superuser settings
echo ">>> Waiting for Django service to start..."
# Wait up to 30 seconds for the django container to be running
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml ps | grep -q "django-1" | grep -q "Up"; then
        break
    fi
    sleep 1
done

echo ">>> Creating/Updating ROOT superuser in Django..."
docker compose -f docker-compose.prod.yml exec django python manage.py create_root_user

# 6. Cleanup unused docker images to free up space
echo ">>> Cleaning up old, unused Docker images..."
docker image prune -f

echo "=== Upgrade Completed Successfully ==="
