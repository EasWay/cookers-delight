# ═════════════════════════════════════════════════════════════════════════════
# Cookers Delight — Makefile
# Your command center for every development and deployment task.
#
# Usage:  make <target>
#   make help         Show all available commands
#   make setup        First-time project setup (run this once)
#   make up           Start all Docker services
#   make down         Stop all services
#   make logs         Tail all service logs
# ═════════════════════════════════════════════════════════════════════════════

# ── Config ─────────────────────────────────────────────────────────────────────
DC          = docker compose
DC_PROD     = docker compose -f docker-compose.yml -f docker-compose.prod.yml
BACKEND     = $(DC) exec backend
QR          = $(DC) exec qr
VITE_CTR    = $(DC) exec vite

.DEFAULT_GOAL := help

.PHONY: help setup up down restart build logs shell shell-qr \
        key-backend key-qr migrate migrate-qr migrate-fresh seed \
        test test-qr artisan artisan-qr tinker \
        npm-install npm-build npm-dev \
        deploy deploy-stack deploy-migrate \
        db-backup db-restore \
        ps health prune


# ─────────────────────────────────────────────────────────────────────────────
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}' \
		| sort
	@echo ""
	@echo "  Run \033[36mmake setup\033[0m for first-time setup."


# ─────────────────────────────────────────────────────────────────────────────
# SETUP
# ─────────────────────────────────────────────────────────────────────────────

setup: ## 🚀 First-time project setup (run once after cloning)
	@echo "\033[1;32m[setup] Bootstrapping Cookers Delight...\033[0m"
	@[ -f .env ] || cp .env.example .env && echo "  ✔ Created root .env"
	@[ -f backend/.env ] || cp backend/.env.docker backend/.env && echo "  ✔ Created backend/.env"
	@[ -f qr-ordering/.env ] || cp qr-ordering/.env.docker qr-ordering/.env && echo "  ✔ Created qr-ordering/.env"
	@echo ""
	@echo "  \033[1;33m⚠️  Edit your .env files and set:\033[0m"
	@echo "     DB_PASSWORD, PAYSTACK_* keys, APP_KEY (auto-generated on first start)"
	@echo ""
	$(MAKE) up
	@sleep 5
	$(MAKE) key-backend
	$(MAKE) key-qr
	$(MAKE) migrate
	$(MAKE) migrate-qr
	@echo ""
	@echo "\033[1;32m[setup] ✅ Done! Open http://localhost in your browser.\033[0m"
	@echo ""
	@echo "  📬 Mailpit:   http://localhost:8025"
	@echo "  🗄️  MySQL:     localhost:3306 (user: cookers)"


# ─────────────────────────────────────────────────────────────────────────────
# DOCKER LIFECYCLE
# ─────────────────────────────────────────────────────────────────────────────

up: ## Start all services in detached mode
	$(DC) up -d --build

down: ## Stop all services
	$(DC) down

restart: ## Restart all services
	$(DC) restart

ps: ## Show running services
	$(DC) ps

logs: ## Tail logs from all services
	$(DC) logs -f

logs-backend: ## Tail backend PHP logs only
	$(DC) logs -f backend

logs-qr: ## Tail QR ordering logs only
	$(DC) logs -f qr

logs-nginx: ## Tail Nginx logs only
	$(DC) logs -f nginx

logs-horizon: ## Tail queue worker logs
	$(DC) logs -f horizon

health: ## Check health of all services
	$(DC) ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

prune: ## Remove stopped containers, networks, orphaned volumes (careful!)
	$(DC) down -v --remove-orphans
	docker system prune -f


# ─────────────────────────────────────────────────────────────────────────────
# SHELL ACCESS
# ─────────────────────────────────────────────────────────────────────────────

shell: ## Open bash shell in the backend container
	$(DC) exec backend bash

shell-qr: ## Open bash shell in the qr-ordering container
	$(DC) exec qr bash

shell-nginx: ## Open shell in nginx container
	$(DC) exec nginx sh

mysql-shell: ## Open MySQL interactive shell
	$(DC) exec mysql mysql -u cookers -psecret_change_me cookers_delight

redis-cli: ## Open Redis CLI
	$(DC) exec redis redis-cli


# ─────────────────────────────────────────────────────────────────────────────
# APP KEYS
# ─────────────────────────────────────────────────────────────────────────────

key-backend: ## Generate APP_KEY for backend
	$(BACKEND) php artisan key:generate --force

key-qr: ## Generate APP_KEY for qr-ordering
	$(QR) php artisan key:generate --force


# ─────────────────────────────────────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────────────────────────────────────

migrate: ## Run backend migrations
	$(BACKEND) php artisan migrate --no-interaction

migrate-qr: ## Run qr-ordering migrations
	$(QR) php artisan migrate --no-interaction

migrate-fresh: ## Wipe and re-migrate + seed (⚠️ destroys all data)
	$(BACKEND) php artisan migrate:fresh --seed --no-interaction

migrate-fresh-qr: ## Wipe and re-migrate qr-ordering
	$(QR) php artisan migrate:fresh --no-interaction

seed: ## Seed the backend database
	$(BACKEND) php artisan db:seed --no-interaction

db-backup: ## Dump the database to ./backups/db-$(date).sql.gz
	@mkdir -p backups
	$(DC) exec mysql mysqldump -u cookers -psecret_change_me cookers_delight \
		| gzip > backups/db-$$(date +%Y%m%d-%H%M%S).sql.gz
	@echo "Backup saved to ./backups/"

db-restore: ## Restore from a backup: make db-restore FILE=backups/db-xxx.sql.gz
	@[ -f "$(FILE)" ] || (echo "Usage: make db-restore FILE=backups/db-xxx.sql.gz" && exit 1)
	gunzip < $(FILE) | $(DC) exec -T mysql mysql -u cookers -psecret_change_me cookers_delight


# ─────────────────────────────────────────────────────────────────────────────
# ARTISAN
# ─────────────────────────────────────────────────────────────────────────────

artisan: ## Run artisan in backend: make artisan CMD="route:list"
	$(BACKEND) php artisan $(CMD)

artisan-qr: ## Run artisan in qr-ordering: make artisan-qr CMD="route:list"
	$(QR) php artisan $(CMD)

tinker: ## Open Laravel Tinker (backend)
	$(BACKEND) php artisan tinker

cache-clear: ## Clear all caches
	$(BACKEND) php artisan cache:clear
	$(BACKEND) php artisan config:clear
	$(BACKEND) php artisan route:clear
	$(BACKEND) php artisan view:clear


# ─────────────────────────────────────────────────────────────────────────────
# FRONTEND
# ─────────────────────────────────────────────────────────────────────────────

npm-install: ## Install Node dependencies
	$(DC) exec vite pnpm install

npm-build: ## Build React frontend for production
	$(DC) exec vite pnpm run build

npm-dev: ## Show Vite logs (dev server is already running via docker)
	$(DC) logs -f vite


# ─────────────────────────────────────────────────────────────────────────────
# TESTING
# ─────────────────────────────────────────────────────────────────────────────

test: ## Run backend PHP tests
	$(BACKEND) php artisan test

test-qr: ## Run qr-ordering tests
	$(QR) php artisan test

test-js: ## Run Vitest (frontend unit tests)
	$(DC) exec vite pnpm run test


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTION DEPLOYMENT
# ─────────────────────────────────────────────────────────────────────────────

build-prod: ## Build React for production (output: dist/)
	pnpm run build

deploy: ## Deploy to production via SSH (edit scripts/deploy.sh first)
	@echo "\033[1;33m[deploy] Deploying to production...\033[0m"
	bash scripts/deploy.sh

deploy-stack: ## Pull and restart prod stack on the server
	$(DC_PROD) pull
	$(DC_PROD) up -d --build --remove-orphans

deploy-migrate: ## Run migrations on production
	$(DC_PROD) exec backend php artisan migrate --force --no-interaction
