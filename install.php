<?php
/**
 * InfinityFree & MySQL 1-Click Installation Script
 * Initializes MySQL tables and configures config_db.php
 */

require_once __DIR__ . '/config.php';

$message = '';
$statusType = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['install_db'])) {
    $dbHost = trim($_POST['db_host'] ?? 'localhost');
    $dbName = trim($_POST['db_name'] ?? '');
    $dbUser = trim($_POST['db_user'] ?? '');
    $dbPass = trim($_POST['db_pass'] ?? '');
    $dbPort = trim($_POST['db_port'] ?? '3306');

    if (empty($dbName) || empty($dbUser)) {
        $message = 'Database Name and Database User are required!';
        $statusType = 'danger';
    } else {
        try {
            $dsn = "mysql:host={$dbHost};port={$dbPort};charset=utf8mb4";
            $pdo = new PDO($dsn, $dbUser, $dbPass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
            
            // Create Database if missing
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `{$dbName}`");

            // 1. Users table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `users` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `username` VARCHAR(50) NOT NULL UNIQUE,
                `email` VARCHAR(100) NOT NULL UNIQUE,
                `password_hash` VARCHAR(255) NOT NULL,
                `password_plain_hint` VARCHAR(255) NULL,
                `full_name` VARCHAR(100) NOT NULL,
                `role` VARCHAR(20) NOT NULL DEFAULT 'partner',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            // 2. Spreadsheets table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `spreadsheets` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `title` VARCHAR(150) NOT NULL,
                `category` VARCHAR(50) NOT NULL,
                `sheet_url` TEXT NOT NULL,
                `doc_id` VARCHAR(100) NOT NULL,
                `gid` VARCHAR(50) DEFAULT '0',
                `fetch_method` VARCHAR(50) DEFAULT 'csv_direct',
                `apps_script_url` TEXT NULL,
                `is_active` TINYINT DEFAULT 1,
                `last_synced_at` DATETIME NULL,
                `sync_status` VARCHAR(50) DEFAULT 'pending',
                `rows_count` INT DEFAULT 0,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            // 3. Transactions table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `transactions` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `sheet_id` INT NOT NULL,
                `trans_date` VARCHAR(50) NULL,
                `dealer_id` VARCHAR(50) NULL,
                `timestamp` VARCHAR(100) NULL,
                `email` VARCHAR(100) NULL,
                `employee_name` VARCHAR(100) NULL,
                `depositor_store` VARCHAR(150) NULL,
                `deposit_amount` DECIMAL(15,2) DEFAULT 0.00,
                `payment_method` VARCHAR(100) NULL,
                `payment_slip_url` TEXT NULL,
                `account` VARCHAR(100) NULL,
                `note` TEXT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (`employee_name`), INDEX (`depositor_store`), INDEX (`trans_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            // 4. Workstation Orders table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `workstation_orders` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `sheet_id` INT NOT NULL,
                `status` VARCHAR(50) NULL,
                `wing` VARCHAR(50) NULL,
                `party_name` VARCHAR(150) NULL,
                `sales_guy` VARCHAR(100) NULL,
                `model_name` VARCHAR(100) NULL,
                `imei_serial` VARCHAR(100) NULL,
                `quantity` INT DEFAULT 1,
                `unit_price` DECIMAL(12,2) DEFAULT 0.00,
                `notes` TEXT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX (`party_name`), INDEX (`wing`), INDEX (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            // 5. Settings table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `app_settings` (
                `setting_key` VARCHAR(100) PRIMARY KEY,
                `setting_value` TEXT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

            // Write config_db.php file
            $configContent = "<?php\n" .
                "// InfinityFree MySQL Database Connection Settings\n" .
                "define('DB_HOST', '" . addslashes($dbHost) . "');\n" .
                "define('DB_NAME', '" . addslashes($dbName) . "');\n" .
                "define('DB_USER', '" . addslashes($dbUser) . "');\n" .
                "define('DB_PASS', '" . addslashes($dbPass) . "');\n" .
                "define('DB_PORT', '" . addslashes($dbPort) . "');\n";

            file_put_contents(__DIR__ . '/config_db.php', $configContent);

            $message = 'InfinityFree MySQL installation completed successfully! You can now log into your dashboard.';
            $statusType = 'success';

        } catch (Exception $e) {
            $message = 'MySQL Installation Error: ' . $e->getMessage();
            $statusType = 'danger';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>InfinityFree 1-Click Database Installer</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: #131b2e;
            --primary: #6366f1;
            --primary-hover: #4f46e5;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --border-color: #1e293b;
        }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 2.5rem;
            max-width: 520px;
            width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        h2 { margin-top: 0; font-size: 1.5rem; color: #fff; }
        p { color: var(--text-muted); font-size: 0.92rem; line-height: 1.5; }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; color: #cbd5e1; }
        input[type="text"], input[type="password"] {
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            background-color: #0f172a;
            border: 1px solid #334155;
            color: #fff;
            box-sizing: border-box;
            font-size: 0.95rem;
        }
        input:focus { outline: none; border-color: var(--primary); }
        .btn {
            width: 100%;
            padding: 0.85rem;
            background-color: var(--primary);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            font-size: 1rem;
            transition: background 0.2s;
        }
        .btn:hover { background-color: var(--primary-hover); }
        .alert {
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
        }
        .alert-success { background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; }
        .alert-danger { background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #f87171; }
        .badge {
            display: inline-block;
            background: #1e1b4b;
            color: #818cf8;
            padding: 0.35rem 0.75rem;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 700;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">InfinityFree Deployment Tool</div>
        <h2>InfinityFree MySQL Installer</h2>
        <p>Enter your InfinityFree MySQL database details below (found in your InfinityFree Control Panel &gt; MySQL Databases).</p>

        <?php if (!empty($message)): ?>
            <div class="alert alert-<?php echo $statusType; ?>">
                <?php echo htmlspecialchars($message); ?>
                <?php if ($statusType === 'success'): ?>
                    <br><br><a href="index.php" style="color:#fff; font-weight:bold; text-decoration:underline;">Click Here to Go to Login Page &rarr;</a>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <form method="POST" action="install.php">
            <div class="form-group">
                <label>MySQL Host (e.g. sql100.infinityfree.com or localhost)</label>
                <input type="text" name="db_host" value="<?php echo htmlspecialchars($_POST['db_host'] ?? 'localhost'); ?>" required>
            </div>
            <div class="form-group">
                <label>Database Name (e.g. if0_38401234_mis)</label>
                <input type="text" name="db_name" value="<?php echo htmlspecialchars($_POST['db_name'] ?? ''); ?>" placeholder="if0_XXXXXXXX_mis" required>
            </div>
            <div class="form-group">
                <label>MySQL Username (e.g. if0_38401234)</label>
                <input type="text" name="db_user" value="<?php echo htmlspecialchars($_POST['db_user'] ?? ''); ?>" placeholder="if0_XXXXXXXX" required>
            </div>
            <div class="form-group">
                <label>MySQL Password (vPanel password)</label>
                <input type="password" name="db_pass" placeholder="••••••••••••">
            </div>
            <div class="form-group">
                <label>MySQL Port (Default 3306)</label>
                <input type="text" name="db_port" value="3306">
            </div>
            <button type="submit" name="install_db" class="btn">🚀 Run Database Installation</button>
        </form>
    </div>
</body>
</html>
