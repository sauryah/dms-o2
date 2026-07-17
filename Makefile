.PHONY: help setup certs start stop restart logs status build migrate seed sync-search shell backup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Full automated setup (Docker + DB + certs)
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File setup.ps1
else
	./setup.sh
endif

certs: ## Regenerate TLS certificates for current LAN IP
ifeq ($(OS),Windows_NT)
	scripts\generate-certs.bat
else
	./scripts/generate-certs.sh
endif

start: ## Start all containers
	docker compose up -d

stop: ## Stop all containers
	docker compose stop

down: ## Stop and remove containers + networks
	docker compose down

restart: ## Restart all containers
	docker compose restart

build: ## Rebuild and restart all containers
	docker compose up -d --build

recreate: ## Force recreate all containers
	docker compose up -d --force-recreate

logs: ## Tail all container logs
	docker compose logs -f

logs-traefik: ## Tail Traefik logs
	docker compose logs -f traefik

logs-django: ## Tail Django logs
	docker compose logs -f django

status: ## Show container status
	docker compose ps

migrate: ## Run database migrations
	docker compose exec django python manage.py migrate

shell: ## Open Django shell
	docker compose exec django python manage.py shell

sync-search: ## Rebuild Meilisearch index
	docker compose exec django python manage.py sync_search

seed: ## Create root superuser
	docker compose exec django python manage.py create_root_user

password: ## Reset root password
	docker compose exec django python manage.py changepassword root

backup: ## Run manual database backup
	docker compose exec backup /scripts/backup_db.sh

restore: ## Restore from backup (usage: make restore FILE=dms_backup.dump)
	docker compose exec backup pg_restore -h db -p 5432 -U $(shell grep POSTGRES_USER .env | cut -d= -f2) -d $(shell grep POSTGRES_DB .env | cut -d= -f2) --clean --if-exists /backups/$(FILE)

clean: ## Remove all containers, volumes, and networks
	docker compose down -v

db: ## Open psql console
	docker compose exec db psql -U $(shell grep POSTGRES_USER .env | cut -d= -f2) -d $(shell grep POSTGRES_DB .env | cut -d= -f2)
