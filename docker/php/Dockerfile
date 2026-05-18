# ─────────────────────────────────────────────────────────────────────────────
# Development PHP Image — PHP 8.3 FPM
# Shared by: backend (TastyIgniter) and qr-ordering (kawax)
# ─────────────────────────────────────────────────────────────────────────────

FROM php:8.3-fpm-alpine

ARG APP_DIR=backend

# ── System deps ───────────────────────────────────────────────────────────────
RUN apk add --no-cache \
    bash \
    curl \
    git \
    zip \
    unzip \
    supervisor \
    # Image processing (GD)
    freetype-dev \
    libjpeg-turbo-dev \
    libpng-dev \
    # ZIP
    libzip-dev \
    # Intl
    icu-dev \
    # MySQL client (for healthchecks)
    mysql-client

# ── PHP extensions ────────────────────────────────────────────────────────────
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        mbstring \
        zip \
        exif \
        pcntl \
        bcmath \
        gd \
        intl \
        opcache

# Redis extension (PECL)
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# ── Composer 2 ────────────────────────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ── Working directory ─────────────────────────────────────────────────────────
WORKDIR /var/www/${APP_DIR}

# ── Entrypoint ────────────────────────────────────────────────────────────────
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# ── PHP-FPM listens on 9000 ───────────────────────────────────────────────────
EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm"]
