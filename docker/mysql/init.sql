-- ─────────────────────────────────────────────────────────────────────────────
-- Cookers Delight — MySQL Initialization
-- Runs once when the MySQL container starts for the first time.
-- ─────────────────────────────────────────────────────────────────────────────

-- Main application database (TastyIgniter backend)
CREATE DATABASE IF NOT EXISTS `cookers_delight`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- QR ordering app database
CREATE DATABASE IF NOT EXISTS `cookers_delight_qr`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Grant the app user access to both
GRANT ALL PRIVILEGES ON `cookers_delight`.* TO 'cookers'@'%';
GRANT ALL PRIVILEGES ON `cookers_delight_qr`.* TO 'cookers'@'%';

FLUSH PRIVILEGES;
