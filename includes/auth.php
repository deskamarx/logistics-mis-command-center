<?php
/**
 * User Authentication & Role Authorization System
 */

require_once __DIR__ . '/db.php';

function get_logged_user() {
    if (empty($_SESSION['user_id'])) {
        return null;
    }

    $dbData = get_db_data();
    $users = $dbData['users'] ?? [];
    foreach ($users as $u) {
        if ($u['id'] == $_SESSION['user_id']) {
            return $u;
        }
    }
    return null;
}

function is_authenticated() {
    return get_logged_user() !== null;
}

function is_admin() {
    $user = get_logged_user();
    if (!$user) return false;
    // Primary admin check
    return ($user['role'] === 'admin' || strtolower($user['email']) === 'bahalul1964@gmail.com');
}

function require_login() {
    if (!is_authenticated()) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Authentication required. Please log in.']);
        exit;
    }
}

function require_admin() {
    require_login();
    if (!is_admin()) {
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Access denied. Only owner/admin (bahalul1964@gmail.com) can perform this action.']);
        exit;
    }
}

function authenticate_user($username_or_email, $password) {
    $dbData = get_db_data();
    $users = $dbData['users'] ?? [];

    $target = strtolower(trim($username_or_email));

    foreach ($users as $user) {
        if (strtolower($user['username']) === $target || strtolower($user['email']) === $target) {
            // Check password (hash or default demo password match)
            $password_matches = password_verify($password, $user['password_hash']);
            if (!$password_matches && !empty($user['password_plain_hint']) && $password === $user['password_plain_hint']) {
                $password_matches = true;
            }

            // Also fallback for initial default logins if needed
            if (!$password_matches && strtolower($user['username']) === 'bahalul' && ($password === 'admin123' || $password === 'bahalul123')) {
                $password_matches = true;
            }
            if (!$password_matches && strtolower($user['username']) === 'partner1' && $password === 'partner123') {
                $password_matches = true;
            }

            if ($password_matches) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_role'] = $user['role'];
                $_SESSION['username'] = $user['username'];
                $_SESSION['email'] = $user['email'];
                return $user;
            }
        }
    }
    return false;
}

function logout_user() {
    unset($_SESSION['user_id']);
    unset($_SESSION['user_role']);
    unset($_SESSION['username']);
    unset($_SESSION['email']);
    session_destroy();
}
