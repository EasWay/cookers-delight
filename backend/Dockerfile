# ── Stage 1: Composer dependencies ───────────────────────────────────────────
FROM composer:2.7 AS deps

WORKDIR /app

ARG IGNITER_CARTE_KEY
RUN if [ -n "$IGNITER_CARTE_KEY" ]; then \
      composer config --global http-basic.igniter.carteblanche.app \
        carte "$IGNITER_CARTE_KEY"; \
    fi

COPY composer.json composer.lock ./
RUN composer install \
      --no-dev \
      --no-scripts \
      --no-autoloader \
      --prefer-dist \
      --ignore-platform-reqs

COPY . .
RUN composer dump-autoload --optimize --no-dev

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM php:8.2-fpm-alpine AS runtime

RUN apk add --no-cache \
      bash curl git icu-libs libpng libjpeg libwebp \
      libzip oniguruma freetype

RUN apk add --no-cache --virtual .build-deps \
      icu-dev libpng-dev libjpeg-turbo-dev libwebp-dev \
      libzip-dev oniguruma-dev freetype-dev \
    && docker-php-ext-configure gd \
         --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
         pdo pdo_mysql mbstring zip gd bcmath opcache intl pcntl \
    && apk del .build-deps

RUN apk add --no-cache --virtual .pecl-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .pecl-deps

COPY docker/php.ini /usr/local/etc/php/conf.d/app.ini
COPY docker/www.conf /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www/html

COPY --from=deps /app .

RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

EXPOSE 9000
CMD ["php-fpm"]
