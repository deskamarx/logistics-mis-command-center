<?php
/**
 * Logistics MIS & Executive Command Center Configuration
 * Compatible with InfinityFree (PHP 7.4/8.0/8.1/8.2) & Local Development
 */

// Start session if not started
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

define('APP_NAME', 'Amaya Logistics MIS & Command Center');
define('APP_VERSION', '2.0.0');
define('OWNER_EMAIL', 'bahalul1964@gmail.com');

// Database Configuration (Can be configured via install.php on InfinityFree)
define('DB_TYPE', file_exists(__DIR__ . '/config_db.php') ? 'mysql' : 'json'); // 'mysql' or 'json'

if (file_exists(__DIR__ . '/config_db.php')) {
    require_once __DIR__ . '/config_db.php';
} else {
    // Default fallback values for MySQL if user connects it later
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'mis_company_db');
    define('DB_USER', 'root');
    define('DB_PASS', '');
    define('DB_PORT', '3306');
}

// Data Directory for JSON fallback & cache
define('DATA_DIR', __DIR__ . '/data');
define('JSON_DB_PATH', DATA_DIR . '/db.json');

// CSRF Protection Helper
if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function verify_csrf() {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? $_POST['csrf_token'] ?? '';
    if (!$token || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Invalid CSRF security token']);
        exit;
    }
}
