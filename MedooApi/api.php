<?php

require_once __DIR__ . '/vendor/autoload.php';

if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        putenv(trim($name) . '=' . trim($value));
    }
}

require_once __DIR__ . '/functions/cors.php';
require_once __DIR__ . '/functions/response.php';
require_once __DIR__ . '/functions/db.php';
require_once __DIR__ . '/functions/jwt.php';
require_once __DIR__ . '/functions/auth.php';
require_once __DIR__ . '/functions/timeclock.php';
require_once __DIR__ . '/functions/timeentry-events.php';
require_once __DIR__ . '/functions/vacation.php';
require_once __DIR__ . '/functions/admin.php';

handle_cors();

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);
$path = str_replace('/MedooApi/api.php', '', $path);
$path = str_replace('/api.php', '', $path);
$path = rtrim($path, '/');

// If path is empty or just the script name, check query string for endpoint
if (empty($path) || $path === '/MedooApi' || $path === '') {
    // Support ?endpoint=/api/auth/login format
    if (isset($_GET['endpoint'])) {
        $path = $_GET['endpoint'];
    }
}

try {
    if ($path === '/api/auth/login' && $method === 'POST') {
        handle_login();
    } elseif ($path === '/api/auth/register' && $method === 'POST') {
        handle_register();
    } elseif ($path === '/api/auth/me' && $method === 'GET') {
        handle_me();
    } elseif ($path === '/api/timeclock/clock-in' && $method === 'POST') {
        handle_clock_in();
    } elseif ($path === '/api/timeclock/clock-out' && $method === 'POST') {
        handle_clock_out();
    } elseif ($path === '/api/timeclock/active' && $method === 'GET') {
        handle_get_active_entry();
    } elseif ($path === '/api/timeclock/today' && $method === 'GET') {
        handle_get_today_entries();
    } elseif ($path === '/api/timeclock/entries' && $method === 'GET') {
        handle_get_entries();
    } elseif ($path === '/api/timeclock/entries' && $method === 'PUT') {
        handle_update_entry();
    } elseif ($path === '/api/timeclock/events' && $method === 'POST') {
        handle_create_time_entry_event();
    } elseif ($path === '/api/timeclock/events/today' && $method === 'GET') {
        handle_get_today_time_events();
    } elseif ($path === '/api/timeclock/events' && $method === 'GET') {
        handle_get_time_events();
    } elseif ($path === '/api/timeclock/status' && $method === 'GET') {
        handle_get_current_status();
    } elseif ($path === '/api/vacation/balance' && $method === 'GET') {
        handle_get_vacation_balance();
    } elseif ($path === '/api/vacation/requests' && $method === 'GET') {
        handle_get_vacation_requests();
    } elseif ($path === '/api/vacation/requests' && $method === 'POST') {
        handle_create_vacation_request();
    } elseif ($path === '/api/vacation/requests' && $method === 'PUT') {
        handle_update_vacation_request();
    } elseif ($path === '/api/vacation/requests/cancel' && $method === 'POST') {
        handle_cancel_vacation_request();
    } elseif ($path === '/api/admin/employees' && $method === 'GET') {
        handle_get_employees();
    } elseif ($path === '/api/admin/employee' && $method === 'GET') {
        handle_get_employee();
    } elseif ($path === '/api/admin/employees' && $method === 'POST') {
        handle_create_employee();
    } elseif ($path === '/api/admin/employees' && $method === 'PUT') {
        handle_update_employee();
    } elseif ($path === '/api/admin/employees' && $method === 'DELETE') {
        handle_delete_employee();
    } elseif ($path === '/api/admin/time-entries' && $method === 'GET') {
        handle_get_all_time_entries();
    } elseif ($path === '/api/admin/time-reports' && $method === 'GET') {
        handle_get_time_reports();
    } elseif ($path === '/api/admin/vacation-requests' && $method === 'GET') {
        handle_get_all_vacation_requests();
    } elseif ($path === '/api/admin/vacation-requests/approve' && $method === 'POST') {
        handle_approve_vacation();
    } elseif ($path === '/api/admin/vacation-requests/deny' && $method === 'POST') {
        handle_deny_vacation();
    } elseif ($path === '/api/admin/work-schedules' && $method === 'GET') {
        handle_get_work_schedules();
    } elseif ($path === '/api/admin/work-schedules' && $method === 'POST') {
        handle_save_work_schedule();
    } else {
        send_error_response('Endpoint not found', 404);
    }
} catch (Exception $e) {
    send_error_response('Server error: ' . $e->getMessage(), 500);
}
