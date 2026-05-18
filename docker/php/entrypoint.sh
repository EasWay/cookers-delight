#!/bin/bash
set -e

echo "[entrypoint] Starting Cookers Delight PHP service..."

# ── Install Composer dependencies if vendor/ is missing ─────────────────────
if [ ! -d "vendor" ]; then
  echo "[entrypoint] Installing Composer dependencies..."
  composer install --no-interaction --no-progress
fi

# ── Generate app key if not set ───────────────────────────────────────────────
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "" ]; then
  echo "[entrypoint] Generating application key..."
  php artisan key:generate --no-interaction --force
fi

# ── Wait for MySQL to be ready ────────────────────────────────────────────────
echo "[entrypoint] Waiting for MySQL..."
until mysql -h"${DB_HOST:-mysql}" -u"${DB_USERNAME:-cookers}" -p"${DB_PASSWORD:-secret}" -e "SELECT 1" >/dev/null 2>&1; do
  echo "[entrypoint] MySQL not ready — retrying in 3s..."
  sleep 3
done
echo "[entrypoint] MySQL is ready."

# ── Run migrations ─────────────────────────────────────────────────────────────
echo "[entrypoint] Running database migrations..."
php artisan migrate --no-interaction --force 2>/dev/null || echo "[entrypoint] Migrations skipped (or already up to date)"

# ── Storage link ──────────────────────────────────────────────────────────────
php artisan storage:link --no-interaction 2>/dev/null || true

echo "[entrypoint] Setup complete. Starting PHP-FPM..."

# Execute the CMD (php-fpm, php artisan horizon, etc.)
exec "$@"
