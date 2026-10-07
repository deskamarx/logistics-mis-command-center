<?php
/**
 * REST API Controller Endpoint
 */

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/includes/db.php';
require_once __DIR__ . '/includes/auth.php';
require_once __DIR__ . '/includes/sheet_fetcher.php';
require_once __DIR__ . '/includes/analytics.php';

$action = $_GET['action'] ?? $_POST['action'] ?? 'me';

try {
    switch ($action) {
        case 'login':
            $user_input = trim($_POST['username'] ?? $_POST['email'] ?? '');
            $password = trim($_POST['password'] ?? '');

            if (empty($user_input) || empty($password)) {
                echo json_encode(['status' => 'error', 'message' => 'Please enter username/email and password']);
                exit;
            }

            $user = authenticate_user($user_input, $password);
            if ($user) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Login successful',
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'full_name' => $user['full_name'],
                        'role' => $user['role'],
                        'is_admin' => is_admin()
                    ],
                    'csrf_token' => $_SESSION['csrf_token']
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Invalid credentials. Please try again.']);
            }
            break;

        case 'logout':
            logout_user();
            echo json_encode(['status' => 'success', 'message' => 'Logged out successfully']);
            break;

        case 'me':
            $user = get_logged_user();
            if ($user) {
                echo json_encode([
                    'status' => 'success',
                    'authenticated' => true,
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'full_name' => $user['full_name'],
                        'role' => $user['role'],
                        'is_admin' => is_admin()
                    ],
                    'csrf_token' => $_SESSION['csrf_token']
                ]);
            } else {
                echo json_encode([
                    'status' => 'success',
                    'authenticated' => false
                ]);
            }
            break;

        case 'get_overview':
            require_login();
            $overview = Analytics::getExecutiveOverview();
            $alerts = Analytics::getDecisionAlerts();
            echo json_encode([
                'status' => 'success',
                'overview' => $overview,
                'alerts_summary' => [
                    'count' => count($alerts),
                    'top_alerts' => array_slice($alerts, 0, 3)
                ]
            ]);
            break;

        case 'get_responsibility':
            require_login();
            $data = Analytics::getResponsibilityMatrix();
            echo json_encode([
                'status' => 'success',
                'data' => $data
            ]);
            break;

        case 'get_financials':
            require_login();
            $data = Analytics::getFinancialAnalysis();
            echo json_encode([
                'status' => 'success',
                'data' => $data
            ]);
            break;

        case 'get_alerts':
            require_login();
            $alerts = Analytics::getDecisionAlerts();
            echo json_encode([
                'status' => 'success',
                'alerts' => $alerts
            ]);
            break;

        case 'get_transactions':
            require_login();
            $data = get_db_data();
            $transactions = $data['transactions'] ?? [];

            $search = strtolower(trim($_GET['search'] ?? ''));
            $empFilter = strtolower(trim($_GET['employee'] ?? ''));
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(100, max(10, intval($_GET['limit'] ?? 25)));

            $filtered = array_filter($transactions, function($t) use ($search, $empFilter) {
                if (!empty($empFilter) && strtolower($t['employee_name'] ?? '') !== $empFilter) {
                    return false;
                }
                if (!empty($search)) {
                    $haystack = strtolower(($t['employee_name'] ?? '') . ' ' . ($t['depositor_store'] ?? '') . ' ' . ($t['payment_method'] ?? '') . ' ' . ($t['dealer_id'] ?? '') . ' ' . ($t['account'] ?? ''));
                    if (strpos($haystack, $search) === false) {
                        return false;
                    }
                }
                return true;
            });

            $totalCount = count($filtered);
            $totalPages = ceil($totalCount / $limit);
            $offset = ($page - 1) * $limit;
            $paged = array_slice(array_values($filtered), $offset, $limit);

            echo json_encode([
                'status' => 'success',
                'total_records' => $totalCount,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages,
                'records' => $paged
            ]);
            break;

        case 'get_orders':
            require_login();
            $data = get_db_data();
            $orders = $data['orders'] ?? [];

            $search = strtolower(trim($_GET['search'] ?? ''));
            $wingFilter = strtoupper(trim($_GET['wing'] ?? ''));
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = min(100, max(10, intval($_GET['limit'] ?? 25)));

            $filtered = array_filter($orders, function($o) use ($search, $wingFilter) {
                if (!empty($wingFilter) && strtoupper($o['wing'] ?? '') !== $wingFilter) {
                    return false;
                }
                if (!empty($search)) {
                    $haystack = strtolower(($o['party_name'] ?? '') . ' ' . ($o['sales_guy'] ?? '') . ' ' . ($o['model_name'] ?? '') . ' ' . ($o['status'] ?? '') . ' ' . ($o['imei_serial'] ?? ''));
                    if (strpos($haystack, $search) === false) {
                        return false;
                    }
                }
                return true;
            });

            $totalCount = count($filtered);
            $totalPages = ceil($totalCount / $limit);
            $offset = ($page - 1) * $limit;
            $paged = array_slice(array_values($filtered), $offset, $limit);

            echo json_encode([
                'status' => 'success',
                'total_records' => $totalCount,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages,
                'records' => $paged
            ]);
            break;

        case 'get_spreadsheets':
            require_login();
            $data = get_db_data();
            $spreadsheets = $data['spreadsheets'] ?? [];

            echo json_encode([
                'status' => 'success',
                'is_admin' => is_admin(),
                'spreadsheets' => $spreadsheets
            ]);
            break;

        case 'add_spreadsheet':
            require_admin();
            verify_csrf();

            $title = trim($_POST['title'] ?? '');
            $url = trim($_POST['sheet_url'] ?? '');
            $category = trim($_POST['category'] ?? 'workstation');
            $method = trim($_POST['fetch_method'] ?? 'csv_direct');
            $apps_script_url = trim($_POST['apps_script_url'] ?? '');

            if (empty($title) || empty($url)) {
                echo json_encode(['status' => 'error', 'message' => 'Spreadsheet title and URL are required']);
                exit;
            }

            $parsed = SheetFetcher::parseUrl($url);
            if (empty($parsed['doc_id'])) {
                echo json_encode(['status' => 'error', 'message' => 'Invalid Google Sheets URL format.']);
                exit;
            }

            $dbData = get_db_data();
            $spreadsheets = &$dbData['spreadsheets'];

            $newId = 1;
            foreach ($spreadsheets as $s) {
                if ($s['id'] >= $newId) $newId = $s['id'] + 1;
            }

            $newItem = [
                'id' => $newId,
                'title' => $title,
                'category' => $category,
                'sheet_url' => $url,
                'doc_id' => $parsed['doc_id'],
                'gid' => $parsed['gid'],
                'fetch_method' => $method,
                'apps_script_url' => $apps_script_url,
                'is_active' => 1,
                'last_synced_at' => null,
                'sync_status' => 'pending',
                'rows_count' => 0
            ];

            $spreadsheets[] = $newItem;
            save_db_data($dbData);

            // Trigger sync immediately
            $syncRes = SheetFetcher::syncSpreadsheet($newId);

            echo json_encode([
                'status' => 'success',
                'message' => 'Spreadsheet link added successfully',
                'spreadsheet' => $newItem,
                'sync_result' => $syncRes
            ]);
            break;

        case 'delete_spreadsheet':
            require_admin();
            verify_csrf();

            $id = intval($_POST['id'] ?? 0);
            $dbData = get_db_data();
            $spreadsheets = &$dbData['spreadsheets'];

            $filtered = array_filter($spreadsheets, function($s) use ($id) {
                return $s['id'] != $id;
            });

            $dbData['spreadsheets'] = array_values($filtered);
            save_db_data($dbData);

            echo json_encode(['status' => 'success', 'message' => 'Spreadsheet deleted successfully']);
            break;

        case 'sync_sheets':
            require_admin();
            verify_csrf();

            $id = intval($_POST['id'] ?? 0);
            $dbData = get_db_data();
            $spreadsheets = $dbData['spreadsheets'] ?? [];

            $results = [];
            foreach ($spreadsheets as $s) {
                if ($id === 0 || $s['id'] == $id) {
                    $results[] = SheetFetcher::syncSpreadsheet($s['id']);
                }
            }

            echo json_encode([
                'status' => 'success',
                'message' => 'Sync triggered successfully',
                'results' => $results
            ]);
            break;

        case 'get_users':
            require_admin();
            $data = get_db_data();
            $users = array_map(function($u) {
                return [
                    'id' => $u['id'],
                    'username' => $u['username'],
                    'email' => $u['email'],
                    'full_name' => $u['full_name'],
                    'role' => $u['role'],
                    'created_at' => $u['created_at'] ?? ''
                ];
            }, $data['users'] ?? []);

            echo json_encode([
                'status' => 'success',
                'users' => $users
            ]);
            break;

        case 'add_user':
            require_admin();
            verify_csrf();

            $username = trim($_POST['username'] ?? '');
            $email = trim($_POST['email'] ?? '');
            $full_name = trim($_POST['full_name'] ?? '');
            $password = trim($_POST['password'] ?? '');
            $role = trim($_POST['role'] ?? 'partner');

            if (empty($username) || empty($email) || empty($password)) {
                echo json_encode(['status' => 'error', 'message' => 'Username, Email and Password are required']);
                exit;
            }

            $dbData = get_db_data();
            $users = &$dbData['users'];

            foreach ($users as $u) {
                if (strtolower($u['username']) === strtolower($username) || strtolower($u['email']) === strtolower($email)) {
                    echo json_encode(['status' => 'error', 'message' => 'Username or Email already exists']);
                    exit;
                }
            }

            $newId = 1;
            foreach ($users as $u) {
                if ($u['id'] >= $newId) $newId = $u['id'] + 1;
            }

            $newUser = [
                'id' => $newId,
                'username' => $username,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_BCRYPT),
                'password_plain_hint' => $password,
                'full_name' => $full_name ?: $username,
                'role' => $role === 'admin' ? 'admin' : 'partner',
                'created_at' => date('Y-m-d H:i:s')
            ];

            $users[] = $newUser;
            save_db_data($dbData);

            echo json_encode([
                'status' => 'success',
                'message' => "User {$username} created successfully as " . strtoupper($role)
            ]);
            break;

        case 'update_settings':
            require_admin();
            verify_csrf();

            $margin = floatval($_POST['est_profit_margin_pct'] ?? 12.5);
            $company_name = trim($_POST['company_name'] ?? 'Amaya Logistics & Operations');

            $dbData = get_db_data();
            if (!isset($dbData['settings'])) $dbData['settings'] = [];

            $dbData['settings']['est_profit_margin_pct'] = $margin;
            $dbData['settings']['company_name'] = $company_name;

            save_db_data($dbData);

            echo json_encode([
                'status' => 'success',
                'message' => 'Settings updated successfully'
            ]);
            break;

        default:
            echo json_encode(['status' => 'error', 'message' => 'Unknown action request']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
