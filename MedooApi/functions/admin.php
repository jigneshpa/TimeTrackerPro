<?php

function handle_get_time_reports() {
    require_admin();

    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();

    // Get all active users with their employee vacation data and roles
    $sql = "SELECT
        e.id AS employee_id,
        u.id AS user_id,
        u.employee_code AS employee_number,
        u.first_name,
        u.middle_name,
        u.last_name,
        r.short_name AS employee_role
    FROM employees_timetrackpro e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN model_has_roles mhr ON u.id = mhr.model_id AND mhr.model_type = 'App\\\\Models\\\\Iam\\\\Personnel\\\\User'
    LEFT JOIN roles r ON mhr.role_id = r.id
    WHERE u.status = 'Active'
    ORDER BY
        CASE WHEN r.short_name IN ('master_admin', 'admin') THEN 0 ELSE 1 END,
        u.first_name ASC";

    $employees = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    $reports = [];

    foreach ($employees as $emp) {
        $events = $db->select('time_entry_events_timetrackpro', '*', [
            'employee_id' => $emp['employee_id'],
            'timestamp[>=]' => $startDate . ' 00:00:00',
            'timestamp[<=]' => $endDate . ' 23:59:59',
            'ORDER' => ['timestamp' => 'ASC']
        ]);

        $totalMinutes = 0;
        $lunchMinutes = 0;
        $unpaidMinutes = 0;

        $currentClockIn = null;
        $currentLunchOut = null;
        $currentUnpaidOut = null;

        foreach ($events as $event) {
            $timestamp = strtotime($event['timestamp']);

            switch ($event['entry_type']) {
                case 'clock_in':
                    $currentClockIn = $timestamp;
                    break;

                case 'clock_out':
                    if ($currentClockIn) {
                        $minutes = ($timestamp - $currentClockIn) / 60;
                        $totalMinutes += $minutes;
                        $currentClockIn = null;
                    }
                    break;

                case 'lunch_out':
                    $currentLunchOut = $timestamp;
                    break;

                case 'lunch_in':
                    if ($currentLunchOut) {
                        $minutes = ($timestamp - $currentLunchOut) / 60;
                        $lunchMinutes += $minutes;
                        $currentLunchOut = null;
                    }
                    break;

                case 'unpaid_out':
                    $currentUnpaidOut = $timestamp;
                    break;

                case 'unpaid_in':
                    if ($currentUnpaidOut) {
                        $minutes = ($timestamp - $currentUnpaidOut) / 60;
                        $unpaidMinutes += $minutes;
                        $currentUnpaidOut = null;
                    }
                    break;
            }
        }

        $totalHours = round($totalMinutes / 60, 2);
        $lunchHours = round($lunchMinutes / 60, 2);
        $unpaidHours = round($unpaidMinutes / 60, 2);
        $paidHours = round(($totalMinutes - $lunchMinutes - $unpaidMinutes) / 60, 2);

        // Calculate vacation hours accrued: 1 hour per 26 hours worked
        $vacationAccrued = round($paidHours / 26, 2);

        // Get approved vacation hours for the date range
        $vacationRequests = $db->select('vacation_requests_timetrackpro', '*', [
            'employee_id' => $emp['employee_id'],
            'start_date[>=]' => $startDate,
            'end_date[<=]' => $endDate,
            'status' => 'approved'
        ]);

        $approvedVacationHours = 0;
        foreach ($vacationRequests as $req) {
            // days_requested is already in hours, not days
            $approvedVacationHours += $req['days_requested'];
        }

        $fullName = trim($emp['first_name'] . ' ' . ($emp['middle_name'] ?? '') . ' ' . ($emp['last_name'] ?? ''));

        $reports[] = [
            'employee_id' => $emp['employee_id'],
            'user_id' => $emp['user_id'],
            'employee_name' => $fullName,
            'employee_number' => $emp['employee_number'],
            'employee_role' => $emp['employee_role'],
            'total_hours' => $totalHours,
            'lunch_hours' => $lunchHours,
            'unpaid_hours' => $unpaidHours,
            'paid_hours' => $paidHours,
            'vacation_accrued' => $vacationAccrued,
            'approved_vacation_hours' => $approvedVacationHours
        ];
    }

    send_success_response($reports);
}

function handle_get_employees() {
    require_admin();

    $db = get_db_connection();

    // Get all users with roles and vacation data
    $sql = "SELECT
        u.id AS user_id,
        u.employee_code,
        u.first_name,
        u.middle_name,
        u.last_name,
        u.email,
        u.mobile_phone,
        u.phone_number,
        u.start_date AS hire_date,
        u.status,
        e.id AS employee_id,
        e.vacation_days_total,
        e.vacation_days_used,
        va.cumulative_accrued AS vacation_hours_accrued,
        GROUP_CONCAT(r.short_name ORDER BY r.id SEPARATOR ', ') AS role_short_names
    FROM users u
    LEFT JOIN employees_timetrackpro e ON e.user_id = u.id
    LEFT JOIN (
        SELECT employee_id, cumulative_accrued
        FROM vacation_accruals_timetrackpro va1
        WHERE accrual_date = (
            SELECT MAX(accrual_date)
            FROM vacation_accruals_timetrackpro va2
            WHERE va2.employee_id = va1.employee_id
        )
    ) va ON va.employee_id = e.id
    LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = 'App\\\\Models\\\\Iam\\\\Personnel\\\\User'
    LEFT JOIN roles r ON r.id = mhr.role_id
    GROUP BY u.id
    ORDER BY u.id";

    $employees = $db->query($sql)->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    foreach ($employees as $emp) {
        $roleNames = $emp['role_short_names'] ?? '';
        $adminRoles = ['admin', 'master_admin'];
        $rolesArray = array_filter(array_map('trim', explode(',', $roleNames)));
        $isAdmin = !empty(array_intersect($rolesArray, $adminRoles));

        // Use accrued hours if available, otherwise fall back to vacation_days_total
        $accruedHours = $emp['vacation_hours_accrued'] ?? 0;
        $usedHours = $emp['vacation_days_used'] ?? 0;
        $remainingHours = max(0, $accruedHours - $usedHours);

        $result[] = [
            'id' => $emp['employee_id'],
            'user_id' => $emp['user_id'],
            'employee_code' => $emp['employee_code'],
            'first_name' => $emp['first_name'],
            'middle_name' => $emp['middle_name'],
            'last_name' => $emp['last_name'],
            'email' => $emp['email'],
            'phone' => $emp['mobile_phone'] ?? $emp['phone_number'],
            'hire_date' => $emp['hire_date'],
            'role' => $isAdmin ? 'admin' : 'employee',
            'role_short_names' => $roleNames,
            'is_active' => $emp['status'] === 'Active',
            'vacation_days_total' => $emp['vacation_days_total'] ?? 0,
            'vacation_days_used' => $usedHours,
            'vacation_days_remaining' => $remainingHours,
            'vacation_hours_accrued' => $accruedHours
        ];
    }

    send_success_response($result);
}

function handle_get_employee() {
    require_admin();

    if (!isset($_GET['id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();

    $sql = "SELECT
        u.id AS user_id,
        u.employee_code,
        u.first_name,
        u.middle_name,
        u.last_name,
        u.email,
        u.mobile_phone,
        u.phone_number,
        u.start_date AS hire_date,
        u.status,
        e.id AS employee_id,
        e.vacation_days_total,
        e.vacation_days_used,
        GROUP_CONCAT(r.short_name ORDER BY r.id SEPARATOR ', ') AS role_short_names
    FROM employees_timetrackpro e
    JOIN users u ON e.user_id = u.id
    LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = 'App\\\\Models\\\\Iam\\\\Personnel\\\\User'
    LEFT JOIN roles r ON r.id = mhr.role_id
    WHERE e.id = ?
    GROUP BY u.id";

    $stmt = $db->query($sql, [$_GET['id']]);
    $employee = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    $roleNames = $employee['role_short_names'] ?? '';
    $adminRoles = ['admin', 'master_admin'];
    $rolesArray = array_filter(array_map('trim', explode(',', $roleNames)));
    $isAdmin = !empty(array_intersect($rolesArray, $adminRoles));

    $result = [
        'id' => $employee['employee_id'],
        'user_id' => $employee['user_id'],
        'employee_code' => $employee['employee_code'],
        'first_name' => $employee['first_name'],
        'middle_name' => $employee['middle_name'],
        'last_name' => $employee['last_name'],
        'email' => $employee['email'],
        'phone' => $employee['mobile_phone'] ?? $employee['phone_number'],
        'hire_date' => $employee['hire_date'],
        'role' => $isAdmin ? 'admin' : 'employee',
        'role_short_names' => $roleNames,
        'is_active' => $employee['status'] === 'Active',
        'vacation_days_total' => $employee['vacation_days_total'],
        'vacation_days_used' => $employee['vacation_days_used'],
        'vacation_days_remaining' => $employee['vacation_days_total'] - $employee['vacation_days_used']
    ];

    send_success_response($result);
}

function handle_update_employee() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();

    // Get employee to find user_id
    $employee = $db->get('employees_timetrackpro', '*', ['id' => $data['id']]);
    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    // Update users table fields
    $userUpdateData = [];
    if (isset($data['first_name'])) $userUpdateData['first_name'] = $data['first_name'];
    if (isset($data['last_name'])) $userUpdateData['last_name'] = $data['last_name'];
    if (isset($data['middle_name'])) $userUpdateData['middle_name'] = $data['middle_name'];
    if (isset($data['email'])) $userUpdateData['email'] = $data['email'];
    if (isset($data['phone'])) $userUpdateData['mobile_phone'] = $data['phone'];
    if (isset($data['hire_date'])) $userUpdateData['start_date'] = $data['hire_date'];
    if (isset($data['is_active'])) $userUpdateData['status'] = $data['is_active'] ? 'Active' : 'Inactive';

    if (!empty($userUpdateData)) {
        $userUpdateData['updated_at'] = date('Y-m-d H:i:s');
        $db->update('users', $userUpdateData, ['id' => $employee['user_id']]);
    }

    // Update employees_timetrackpro table fields (vacation data only)
    $empUpdateData = [];
    if (isset($data['vacation_days_total'])) $empUpdateData['vacation_days_total'] = $data['vacation_days_total'];
    if (isset($data['vacation_days_used'])) $empUpdateData['vacation_days_used'] = $data['vacation_days_used'];

    if (!empty($empUpdateData)) {
        $db->update('employees_timetrackpro', $empUpdateData, ['id' => $data['id']]);
    }

    // Fetch updated employee
    handle_get_employee();
}

function handle_delete_employee() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();
    $employee = $db->get('employees_timetrackpro', 'user_id', ['id' => $data['id']]);
    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    // Delete from employees_timetrackpro (will cascade due to FK)
    $db->delete('employees_timetrackpro', ['id' => $data['id']]);

    // Optionally delete from users table
    // $db->delete('users', ['id' => $employee['user_id']]);

    send_success_response(null, 'Employee deleted successfully');
}

function handle_get_all_time_entries() {
    require_admin();

    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');
    $employeeId = $_GET['employee_id'] ?? null;

    $where = [
        'clock_in[>=]' => $startDate . ' 00:00:00',
        'clock_in[<=]' => $endDate . ' 23:59:59',
        'ORDER' => ['clock_in' => 'DESC']
    ];

    if ($employeeId) {
        $where['employee_id'] = $employeeId;
    }

    $db = get_db_connection();
    $entries = $db->select('time_entries_timetrackpro', '*', $where);

    foreach ($entries as &$entry) {
        $sql = "SELECT
            CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS employee_name,
            u.employee_code AS employee_number
        FROM employees_timetrackpro e
        JOIN users u ON e.user_id = u.id
        WHERE e.id = ?";

        $stmt = $db->query($sql, [$entry['employee_id']]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($employee) {
            $entry['employee_name'] = $employee['employee_name'];
            $entry['employee_number'] = $employee['employee_number'];
        }
    }

    send_success_response($entries);
}

function handle_get_all_vacation_requests() {
    require_admin();

    $status = $_GET['status'] ?? null;

    $where = ['ORDER' => ['created_at' => 'DESC']];

    if ($status) {
        $where['status'] = $status;
    }

    $db = get_db_connection();
    $requests = $db->select('vacation_requests_timetrackpro', '*', $where);

    foreach ($requests as &$request) {
        $sql = "SELECT
            CONCAT(u.first_name, ' ', COALESCE(u.last_name, '')) AS employee_name,
            u.employee_code AS employee_number
        FROM employees_timetrackpro e
        JOIN users u ON e.user_id = u.id
        WHERE e.id = :employee_id";

        $stmt = $db->pdo->prepare($sql);
        $stmt->execute(['employee_id' => $request['employee_id']]);
        $employee = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($employee) {
            $request['employee_name'] = $employee['employee_name'];
            $request['employee_number'] = $employee['employee_number'];
        }

        if ($request['approved_by']) {
            $stmt = $db->pdo->prepare($sql);
            $stmt->execute(['employee_id' => $request['approved_by']]);
            $approver = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($approver) {
                $request['approved_by_name'] = $approver['employee_name'];
            }
        }
    }

    send_success_response($requests);
}

function handle_approve_vacation() {
    $admin = require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests_timetrackpro', '*', ['id' => $data['id']]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] !== 'pending') {
        send_error_response('Can only approve pending requests', 400);
    }

    // Get admin's employee ID
    $adminEmployee = $db->get('employees_timetrackpro', 'id', ['user_id' => $admin['id']]);

    $db->update('vacation_requests_timetrackpro', [
        'status' => 'approved',
        'approved_by' => $adminEmployee,
        'approved_at' => date('Y-m-d H:i:s')
    ], [
        'id' => $data['id']
    ]);

    $db->update('employees_timetrackpro', [
        'vacation_days_used[+]' => $request['days_requested']
    ], [
        'id' => $request['employee_id']
    ]);

    $updatedRequest = $db->get('vacation_requests_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Vacation request approved');
}

function handle_deny_vacation() {
    $admin = require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests_timetrackpro', '*', ['id' => $data['id']]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] !== 'pending') {
        send_error_response('Can only deny pending requests', 400);
    }

    // Get admin's employee ID
    $adminEmployee = $db->get('employees_timetrackpro', 'id', ['user_id' => $admin['id']]);

    $db->update('vacation_requests_timetrackpro', [
        'status' => 'denied',
        'approved_by' => $adminEmployee,
        'approved_at' => date('Y-m-d H:i:s'),
        'denial_reason' => $data['denial_reason'] ?? null
    ], [
        'id' => $data['id']
    ]);

    $updatedRequest = $db->get('vacation_requests_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Vacation request denied');
}

function handle_get_work_schedules() {
    require_admin();

    $employeeId = $_GET['employee_id'] ?? null;

    if (!$employeeId) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();
    $schedules = $db->select('work_schedules_timetrackpro', '*', [
        'employee_id' => $employeeId,
        'ORDER' => ['day_of_week' => 'ASC']
    ]);

    send_success_response($schedules);
}

function handle_save_work_schedule() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['employee_id', 'day_of_week', 'start_time', 'end_time'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $db = get_db_connection();
    $existing = $db->get('work_schedules_timetrackpro', 'id', [
        'employee_id' => $data['employee_id'],
        'day_of_week' => $data['day_of_week']
    ]);

    $scheduleData = [
        'employee_id' => $data['employee_id'],
        'day_of_week' => $data['day_of_week'],
        'start_time' => $data['start_time'],
        'end_time' => $data['end_time'],
        'is_working_day' => $data['is_working_day'] ?? true
    ];

    if ($existing) {
        $db->update('work_schedules_timetrackpro', $scheduleData, [
            'employee_id' => $data['employee_id'],
            'day_of_week' => $data['day_of_week']
        ]);
        $scheduleId = $existing;
    } else {
        $db->insert('work_schedules_timetrackpro', $scheduleData);
        $scheduleId = $db->id();
    }

    $schedule = $db->get('work_schedules_timetrackpro', '*', ['id' => $scheduleId]);

    send_success_response($schedule, 'Work schedule saved successfully');
}

function handle_get_employee_time_events() {
    require_admin();

    if (!isset($_GET['employee_id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $employeeId = $_GET['employee_id'];
    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();
    $entries = $db->select('time_entry_events_timetrackpro', '*', [
        'employee_id' => $employeeId,
        'timestamp[>=]' => $startDate . ' 00:00:00',
        'timestamp[<=]' => $endDate . ' 23:59:59',
        'ORDER' => ['timestamp' => 'ASC']
    ]);

    send_success_response($entries);
}

function handle_update_time_event() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Event ID is required', 400);
    }

    $db = get_db_connection();
    $event = $db->get('time_entry_events_timetrackpro', '*', ['id' => $data['id']]);

    if (!$event) {
        send_error_response('Event not found', 404);
    }

    $updateData = [];
    if (isset($data['entry_type'])) $updateData['entry_type'] = $data['entry_type'];
    if (isset($data['timestamp'])) $updateData['timestamp'] = $data['timestamp'];
    if (isset($data['notes'])) $updateData['notes'] = $data['notes'];

    if (!empty($updateData)) {
        $db->update('time_entry_events_timetrackpro', $updateData, ['id' => $data['id']]);
    }

    $updatedEvent = $db->get('time_entry_events_timetrackpro', '*', ['id' => $data['id']]);

    send_success_response($updatedEvent, 'Time event updated successfully');
}

function handle_delete_time_event() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Event ID is required', 400);
    }

    $db = get_db_connection();
    $event = $db->get('time_entry_events_timetrackpro', 'id', ['id' => $data['id']]);

    if (!$event) {
        send_error_response('Event not found', 404);
    }

    $db->delete('time_entry_events_timetrackpro', ['id' => $data['id']]);

    send_success_response(null, 'Time event deleted successfully');
}

function handle_create_time_event_admin() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['employee_id', 'entry_type', 'timestamp'];
    foreach ($required as $field) {
        if (!isset($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $validTypes = ['clock_in', 'clock_out', 'lunch_out', 'lunch_in', 'unpaid_out', 'unpaid_in'];
    if (!in_array($data['entry_type'], $validTypes)) {
        send_error_response('Invalid entry type', 400);
    }

    $db = get_db_connection();

    $insertData = [
        'employee_id' => $data['employee_id'],
        'entry_type' => $data['entry_type'],
        'timestamp' => $data['timestamp'],
        'notes' => $data['notes'] ?? null
    ];

    $db->insert('time_entry_events_timetrackpro', $insertData);
    $entryId = $db->id();

    $entry = $db->get('time_entry_events_timetrackpro', '*', ['id' => $entryId]);

    send_success_response($entry, 'Time event created successfully', 201);
}

function handle_get_employee_daily_breakdown() {
    require_admin();

    if (!isset($_GET['employee_id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $employeeId = $_GET['employee_id'];
    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();
    $events = $db->select('time_entry_events_timetrackpro', '*', [
        'employee_id' => $employeeId,
        'timestamp[>=]' => $startDate . ' 00:00:00',
        'timestamp[<=]' => $endDate . ' 23:59:59',
        'ORDER' => ['timestamp' => 'ASC']
    ]);

    $dailyData = [];

    foreach ($events as $event) {
        $date = date('Y-m-d', strtotime($event['timestamp']));

        if (!isset($dailyData[$date])) {
            $dailyData[$date] = [
                'date' => $date,
                'clock_in' => null,
                'lunch_start' => null,
                'lunch_end' => null,
                'unpaid_start' => null,
                'unpaid_end' => null,
                'clock_out' => null,
                'total_hours' => 0,
                'total_unpaid' => 0,
                'total_paid' => 0
            ];
        }

        $time = date('H:i:s', strtotime($event['timestamp']));

        switch ($event['entry_type']) {
            case 'clock_in':
                if (!$dailyData[$date]['clock_in']) {
                    $dailyData[$date]['clock_in'] = $time;
                }
                break;
            case 'clock_out':
                $dailyData[$date]['clock_out'] = $time;
                break;
            case 'lunch_out':
                if (!$dailyData[$date]['lunch_start']) {
                    $dailyData[$date]['lunch_start'] = $time;
                }
                break;
            case 'lunch_in':
                $dailyData[$date]['lunch_end'] = $time;
                break;
            case 'unpaid_out':
                if (!$dailyData[$date]['unpaid_start']) {
                    $dailyData[$date]['unpaid_start'] = $time;
                }
                break;
            case 'unpaid_in':
                $dailyData[$date]['unpaid_end'] = $time;
                break;
        }
    }

    foreach ($dailyData as $date => &$dayData) {
        $dayEvents = array_filter($events, function($e) use ($date) {
            return date('Y-m-d', strtotime($e['timestamp'])) === $date;
        });

        $totalMinutes = 0;
        $lunchMinutes = 0;
        $unpaidMinutes = 0;

        $currentClockIn = null;
        $currentLunchOut = null;
        $currentUnpaidOut = null;

        foreach ($dayEvents as $event) {
            $timestamp = strtotime($event['timestamp']);

            switch ($event['entry_type']) {
                case 'clock_in':
                    $currentClockIn = $timestamp;
                    break;
                case 'clock_out':
                    if ($currentClockIn) {
                        $minutes = ($timestamp - $currentClockIn) / 60;
                        $totalMinutes += $minutes;
                        $currentClockIn = null;
                    }
                    break;
                case 'lunch_out':
                    $currentLunchOut = $timestamp;
                    break;
                case 'lunch_in':
                    if ($currentLunchOut) {
                        $minutes = ($timestamp - $currentLunchOut) / 60;
                        $lunchMinutes += $minutes;
                        $currentLunchOut = null;
                    }
                    break;
                case 'unpaid_out':
                    $currentUnpaidOut = $timestamp;
                    break;
                case 'unpaid_in':
                    if ($currentUnpaidOut) {
                        $minutes = ($timestamp - $currentUnpaidOut) / 60;
                        $unpaidMinutes += $minutes;
                        $currentUnpaidOut = null;
                    }
                    break;
            }
        }

        $dayData['total_hours'] = round($totalMinutes / 60, 2);
        $dayData['total_unpaid'] = round(($lunchMinutes + $unpaidMinutes) / 60, 2);
        $dayData['total_paid'] = round(($totalMinutes - $lunchMinutes - $unpaidMinutes) / 60, 2);
    }

    $result = array_values($dailyData);

    send_success_response($result);
}
