<?php

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_errors.log');

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
require_once __DIR__ . '/functions/vacation-accrual.php';
require_once __DIR__ . '/functions/admin.php';
require_once __DIR__ . '/functions/settings.php';
require_once __DIR__ . '/functions/work-schedule.php';

// Set default timezone to Central Time (Tennessee)
date_default_timezone_set('America/Chicago');

handle_cors();

$method = $_SERVER['REQUEST_METHOD'];

// Allow method override via query parameter
if (isset($_GET['method'])) {
    $method = strtoupper($_GET['method']);
}

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
    // Test database connection early
    $testDb = get_db_connection();
    if (!$testDb) {
        throw new Exception('Database connection failed');
    }

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
    } elseif ($path === '/api/vacation/accrual/calculate' && $method === 'POST') {
        handle_calculate_vacation_accrual();
    } elseif ($path === '/api/vacation/accrual/latest' && $method === 'GET') {
        handle_get_latest_vacation_accrual();
    } elseif ($path === '/api/vacation/accrual/all' && $method === 'GET') {
        handle_get_all_vacation_accruals();
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
    } elseif ($path === '/api/admin/work-schedules/bulk' && $method === 'POST') {
        handle_bulk_save_work_schedules();
    } elseif ($path === '/api/admin/work-schedules' && $method === 'DELETE') {
        handle_delete_work_schedule();
    } elseif ($path === '/api/admin/work-schedules/clear-week' && $method === 'POST') {
        handle_clear_week_schedules();
    } elseif ($path === '/api/admin/work-schedules/copy-week' && $method === 'POST') {
        handle_copy_week_schedules();
    } elseif ($path === '/api/admin/store-locations' && $method === 'GET') {
        handle_get_store_locations();
    } elseif ($path === '/api/admin/settings' && $method === 'GET') {
        handle_get_all_settings();
    } elseif ($path === '/api/admin/settings/system' && $method === 'GET') {
        handle_get_system_settings();
    } elseif ($path === '/api/admin/settings/system' && $method === 'PUT') {
        handle_update_system_settings();
    } elseif ($path === '/api/admin/settings/daily-shifts' && $method === 'GET') {
        handle_get_daily_shifts();
    } elseif ($path === '/api/admin/settings/daily-shifts' && $method === 'PUT') {
        handle_update_daily_shift();
    } elseif ($path === '/api/admin/settings/daily-shifts/bulk' && $method === 'PUT') {
        handle_bulk_update_daily_shifts();
    } elseif ($path === '/api/admin/settings/holidays' && $method === 'GET') {
        handle_get_holidays();
    } elseif ($path === '/api/admin/settings/holidays' && $method === 'POST') {
        handle_create_holiday();
    } elseif ($path === '/api/admin/settings/holidays' && $method === 'PUT') {
        handle_update_holiday();
    } elseif ($path === '/api/admin/settings/holidays' && $method === 'DELETE') {
        handle_delete_holiday();
    } elseif ($path === '/api/admin/settings/holidays/bulk' && $method === 'PUT') {
        handle_bulk_update_holidays();
    } elseif ($path === '/api/admin/time-events' && $method === 'GET') {
        handle_get_employee_time_events();
    } elseif ($path === '/api/admin/time-events' && $method === 'PUT') {
        handle_update_time_event();
    } elseif ($path === '/api/admin/time-events' && $method === 'DELETE') {
        handle_delete_time_event();
    } elseif ($path === '/api/admin/time-events' && $method === 'POST') {
        handle_create_time_event_admin();
    } elseif ($path === '/api/admin/daily-breakdown' && $method === 'GET') {
        handle_get_employee_daily_breakdown();
    } else {
        send_error_response('Endpoint not found', 404);
    }
} catch (Exception $e) {
    error_log("API Exception: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage(),
        'errors' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
    exit;
} catch (Throwable $e) {
    error_log("API Fatal Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Fatal error: ' . $e->getMessage(),
        'errors' => [
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ]
    ]);
    exit;
}
