#!/bin/bash
set -e

echo "[entrypoint:prod] Starting Cookers Delight production service..."

# ── Wait for MySQL ─────────────────────────────────────────────────────────────
echo "[entrypoint:prod] Waiting for MySQL..."
until mysql -h"${DB_HOST:-mysql}" -u"${DB_USERNAME:-cookers}" -p"${DB_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
  sleep 3
done
echo "[entrypoint:prod] MySQL is ready."

# ── Run migrations (non-interactive, will not destroy data) ──────────────────
echo "[entrypoint:prod] Running migrations..."
php artisan migrate --no-interaction --force

# ── Laravel production optimizations ─────────────────────────────────────────
echo "[entrypoint:prod] Caching config, routes, views..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# ── Storage link ──────────────────────────────────────────────────────────────
php artisan storage:link --no-interaction 2>/dev/null || true

echo "[entrypoint:prod] Ready. Handing off to: $*"
exec "$@"
