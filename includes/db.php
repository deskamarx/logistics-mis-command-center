<?php
/**
 * Database Abstraction Layer for MySQL (InfinityFree) & JSON File Storage
 */

require_once __DIR__ . '/../config.php';

class DB {
    private static $instance = null;
    private $pdo = null;
    private $mysqli = null;
    private $is_mysql = false;

    private function __construct() {
        if (defined('DB_TYPE') && DB_TYPE === 'mysql') {
            // Try PDO first
            if (extension_loaded('pdo_mysql')) {
                try {
                    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";port=" . DB_PORT . ";charset=utf8mb4";
                    $this->pdo = new PDO($dsn, DB_USER, DB_PASS, [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                    ]);
                    $this->is_mysql = true;
                    return;
                } catch (Exception $e) {
                    // Fall back to mysqli if PDO fails
                }
            }

            if (extension_loaded('mysqli')) {
                try {
                    $this->mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, (int)DB_PORT);
                    if (!$this->mysqli->connect_error) {
                        $this->mysqli->set_charset("utf8mb4");
                        $this->is_mysql = true;
                        return;
                    }
                } catch (Exception $e) {}
            }
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new DB();
        }
        return self::$instance;
    }

    public function isMySQL() {
        return $this->is_mysql;
    }

    public function readData() {
        if ($this->is_mysql && $this->pdo) {
            return $this->readFromMySQL();
        }
        
        // JSON file read
        if (!file_exists(JSON_DB_PATH)) {
            return [
                'users' => [],
                'spreadsheets' => [],
                'transactions' => [],
                'orders' => [],
                'settings' => []
            ];
        }
        $content = file_get_contents(JSON_DB_PATH);
        return json_decode($content, true) ?: [];
    }

    public function writeData($data) {
        if ($this->is_mysql && $this->pdo) {
            $this->writeToMySQL($data);
            return true;
        }

        // JSON file write
        if (!is_dir(DATA_DIR)) {
            mkdir(DATA_DIR, 0755, true);
        }
        return file_put_contents(JSON_DB_PATH, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
    }

    private function readFromMySQL() {
        $data = [
            'users' => [],
            'spreadsheets' => [],
            'transactions' => [],
            'orders' => [],
            'settings' => []
        ];

        try {
            $stmt = $this->pdo->query("SELECT * FROM users");
            $data['users'] = $stmt->fetchAll();

            $stmt = $this->pdo->query("SELECT * FROM spreadsheets");
            $data['spreadsheets'] = $stmt->fetchAll();

            $stmt = $this->pdo->query("SELECT * FROM transactions ORDER BY id DESC LIMIT 10000");
            $data['transactions'] = $stmt->fetchAll();

            $stmt = $this->pdo->query("SELECT * FROM workstation_orders ORDER BY id DESC LIMIT 5000");
            $data['orders'] = $stmt->fetchAll();

            $stmt = $this->pdo->query("SELECT * FROM app_settings");
            $settingsRows = $stmt->fetchAll();
            foreach ($settingsRows as $s) {
                $data['settings'][$s['setting_key']] = json_decode($s['setting_value'], true) ?? $s['setting_value'];
            }
        } catch (Exception $e) {}

        return $data;
    }

    private function writeToMySQL($data) {
        // Simple transaction save to MySQL
        try {
            if (isset($data['users'])) {
                foreach ($data['users'] as $u) {
                    $stmt = $this->pdo->prepare("INSERT INTO users (id, username, email, password_hash, full_name, role) 
                        VALUES (:id, :username, :email, :password_hash, :full_name, :role) 
                        ON DUPLICATE KEY UPDATE username=:username, email=:email, full_name=:full_name, role=:role");
                    $stmt->execute([
                        ':id' => $u['id'],
                        ':username' => $u['username'],
                        ':email' => $u['email'],
                        ':password_hash' => $u['password_hash'],
                        ':full_name' => $u['full_name'],
                        ':role' => $u['role']
                    ]);
                }
            }
        } catch (Exception $e) {}
    }
}

function get_db_data() {
    return DB::getInstance()->readData();
}

function save_db_data($data) {
    return DB::getInstance()->writeData($data);
}
