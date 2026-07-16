# =============================================================================
# Stage 1: Build the React frontend
# =============================================================================
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# =============================================================================
# Stage 2: Build the Go Search API
# =============================================================================
FROM golang:1.22-alpine AS go-builder
WORKDIR /app
COPY go-api/go.mod go-api/go.sum ./
RUN go mod download
COPY go-api/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o server cmd/server/main.go

# =============================================================================
# Stage 3: Monolithic Production Image
# =============================================================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies (Nginx, supervisor, postgresql-client-18, dos2unix, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnupg2 \
    wget \
    lsb-release \
    nginx \
    supervisor \
    curl \
    ca-certificates \
    dos2unix \
    && install -d /etc/apt/keyrings \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/keyrings/postgresql.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-18 \
    && rm -rf /var/lib/apt/lists/*

# Install python packages
COPY backend/requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django backend source code
COPY backend/ /app/

# Copy compiled Go Search API binary
COPY --from=go-builder /app/server /app/go-server

# Copy compiled React frontend assets to Nginx html folder
COPY --from=frontend-builder /app/dist /usr/share/nginx/html

# Copy configurations
COPY nginx-monolith.conf /etc/nginx/sites-available/default
COPY supervisord.conf /etc/supervisor/supervisord.conf
COPY entrypoint.sh /entrypoint.sh

# Normalize script endings and make executable
RUN dos2unix /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
