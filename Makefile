.PHONY: help dev dev-down staging staging-down prod prod-down build logs shell migrate seed

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
