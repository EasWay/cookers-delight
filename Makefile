.PHONY: help dev dev-down staging staging-down prod prod-down build logs shell migrate seed \
        doctor doctor-fix doctor-ai composer-audit composer-outdated pnpm-audit check-versions

COMPOSE_DEV     = docker compose -f docker-compose.yml
COMPOSE_STAGING = docker compose -f docker-compose.yml -f docker-compose.staging.yml
COMPOSE_PROD    = docker compose -f docker-compose.yml -f docker-compose.prod.yml

help:
	@echo "Cookers Delight — Docker commands"
	@echo ""
	@echo "  make dev            Start local dev environment"
	@echo "  make dev-down       Stop local dev environment"
	@echo "  make staging        Start staging stack"
	@echo "  make staging-down   Stop staging stack"
	@echo "  make prod           Start production stack"
	@echo "  make prod-down      Stop production stack"
	@echo "  make build          (Re)build all images"
	@echo "  make logs           Tail logs (dev)"
	@echo "  make shell          Open shell in backend container (dev)"
	@echo "  make migrate        Run Laravel migrations (dev)"
	@echo "  make seed           Run Laravel seeders (dev)"

dev:
	$(COMPOSE_DEV) up -d --build

dev-down:
	$(COMPOSE_DEV) down

staging:
	$(COMPOSE_STAGING) up -d --build

staging-down:
	$(COMPOSE_STAGING) down

prod:
	$(COMPOSE_PROD) up -d --build

prod-down:
	$(COMPOSE_PROD) down

build:
	$(COMPOSE_DEV) build --no-cache

logs:
	$(COMPOSE_DEV) logs -f

shell:
	$(COMPOSE_DEV) exec backend sh

migrate:
	$(COMPOSE_DEV) exec backend php artisan migrate

seed:
	$(COMPOSE_DEV) exec backend php artisan db:seed

# ── Diagnostics ───────────────────────────────────────────────────────────────
doctor:
	@python3 scripts/doctor.py

doctor-fix:
	@python3 scripts/doctor.py --fix

doctor-ai:
	@python3 scripts/doctor.py --fix --ai

# ── On-demand deeper checks ───────────────────────────────────────────────────
composer-audit:
	$(COMPOSE_DEV) exec backend composer audit

composer-outdated:
	$(COMPOSE_DEV) exec backend composer outdated

pnpm-audit:
	pnpm audit

check-versions:
	@echo "PHP:      $$($(COMPOSE_DEV) exec -T backend php -r 'echo PHP_VERSION;' 2>/dev/null)"
	@echo "Composer: $$($(COMPOSE_DEV) exec -T backend composer --version 2>/dev/null | head -1)"
	@echo "Node:     $$(node --version 2>/dev/null)"
	@echo "pnpm:     $$(pnpm --version 2>/dev/null)"
	@echo "Docker:   $$(docker version --format '{{.Server.Version}}' 2>/dev/null)"
	@echo "MySQL:    $$($(COMPOSE_DEV) exec -T mysql mysql -uroot -p$$MYSQL_ROOT_PASSWORD \
	              -e 'SELECT VERSION()' 2>/dev/null | tail -1)"
