<?php

/**
 * Laravel development router for `php -S host:port -t public server.php`
 *
 * Usage:
 *   php -S 0.0.0.0:8001 -t public server.php
 *
 * This sets the document root to public/ so built assets (CSS/JS) are served
 * correctly, while all non-file requests are routed through Laravel's front
 * controller (public/index.php).
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '');

// PHP's built-in server sets DOCUMENT_ROOT to the -t path (public/).
// If the requested file physically exists there, serve it directly.
if ($uri !== '/' && file_exists($_SERVER['DOCUMENT_ROOT'] . $uri)) {
    return false;
}

require_once __DIR__ . '/public/index.php';
