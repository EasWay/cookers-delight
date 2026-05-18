#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Cookers Delight — Manual Deploy Script
# Run: make deploy   OR   bash scripts/deploy.sh
#
# Requires: DEPLOY_HOST, DEPLOY_USER, DEPLOY_PATH in .env or environment
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# Load deploy config from root .env if present
if [ -f .env ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^(DEPLOY_|VITE_)' .env | xargs) 2>/dev/null || true
fi

DEPLOY_HOST="${DEPLOY_HOST:?Set DEPLOY_HOST in .env (e.g. 159.89.100.1)}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_PATH="${DEPLOY_PATH:-/var/www/cookers-delight}"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       Cookers Delight — Production Deploy                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "  Host:  $DEPLOY_HOST"
echo "  User:  $DEPLOY_USER"
echo "  Path:  $DEPLOY_PATH"
echo ""
read -rp "  Deploy to production? [y/N] " confirm
[ "${confirm,,}" = "y" ] || { echo "Aborted."; exit 0; }

echo ""
echo "▶ Building React frontend..."
pnpm run build

echo ""
echo "▶ Uploading built SPA to server..."
rsync -az --delete --progress dist/ \
  "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/dist/"

echo ""
echo "▶ Running server-side deploy steps..."
# shellcheck disable=SC2087
ssh "$DEPLOY_USER@$DEPLOY_HOST" << ENDSSH
  set -e
  cd "$DEPLOY_PATH"

  echo "  → Pulling latest code..."
  git pull origin main

  echo "  → Installing backend deps..."
  cd backend && composer install --no-dev --no-interaction --optimize-autoloader && cd ..

  echo "  → Installing QR deps..."
  cd qr-ordering && composer install --no-dev --no-interaction --optimize-autoloader && cd ..

  echo "  → Running migrations..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T backend php artisan migrate --force --no-interaction
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T qr php artisan migrate --force --no-interaction

  echo "  → Rebuilding Docker images..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    up -d --build --remove-orphans

  echo "  → Caching Laravel config/routes..."
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T backend php artisan config:cache
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
    exec -T backend php artisan route:cache

  echo ""
  echo "  ✅ Deploy complete!"
ENDSSH

echo ""
echo "✅ Deployment finished. Check http://$DEPLOY_HOST"
