<?php

function handle_get_time_reports() {
    require_admin();

    $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
    $endDate = $_GET['end_date'] ?? date('Y-m-d');

    $db = get_db_connection();

    $employees = $db->select('employees_timetrackpro', '*', [
        'is_active' => true,
        'ORDER' => ['first_name' => 'ASC']
    ]);

    $reports = [];

    foreach ($employees as $emp) {
        $events = $db->select('time_entry_events_timetrackpro', '*', [
            'employee_id' => $emp['id'],
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

        $vacationRequests = $db->select('vacation_requests_timetrackpro', '*', [
            'employee_id' => $emp['id'],
            'start_date[>=]' => $startDate,
            'end_date[<=]' => $endDate,
            'status' => 'approved'
        ]);

        $vacationHours = 0;
        foreach ($vacationRequests as $req) {
            $vacationHours += $req['days_requested'] * 8;
        }

        $reports[] = [
            'employee_id' => $emp['id'],
            'employee_name' => $emp['first_name'] . ' ' . $emp['last_name'],
            'employee_number' => $emp['employee_number'],
            'total_hours' => $totalHours,
            'lunch_hours' => $lunchHours,
            'unpaid_hours' => $unpaidHours,
            'paid_hours' => $paidHours,
            'vacation_hours' => $vacationHours
        ];
    }

    send_success_response($reports);
}

function handle_get_employees() {
    require_admin();

    $db = get_db_connection();
    $employees = $db->select('employees_timetrackpro', [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'employee_number',
        'phone',
        'hire_date',
        'is_active',
        'vacation_days_total',
        'vacation_days_used',
        'created_at',
        'updated_at'
    ], [
        'ORDER' => ['created_at' => 'DESC']
    ]);

    foreach ($employees as &$employee) {
        $employee['vacation_days_remaining'] = $employee['vacation_days_total'] - $employee['vacation_days_used'];
    }

    send_success_response($employees);
}

function handle_get_employee() {
    require_admin();

    if (!isset($_GET['id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();
    $employee = $db->get('employees_timetrackpro', [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'employee_number',
        'phone',
        'hire_date',
        'is_active',
        'vacation_days_total',
        'vacation_days_used',
        'created_at',
        'updated_at'
    ], [
        'id' => $_GET['id']
    ]);

    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    $employee['vacation_days_remaining'] = $employee['vacation_days_total'] - $employee['vacation_days_used'];

    send_success_response($employee);
}

function handle_create_employee() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['email', 'password', 'first_name', 'last_name'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $db = get_db_connection();
    $existing = $db->get('users', 'id', ['email' => $data['email']]);
    if ($existing) {
        send_error_response('Email already exists', 400);
    }

    $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);
    $uniqueId = 'USR' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
    $employeeCode = $data['employee_number'] ?? ('EMP' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT));

    $userInsertData = [
        'unique_id' => $uniqueId,
        'employee_code' => $employeeCode,
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'] ?? '',
        'email' => $data['email'],
        'password' => $passwordHash,
        'mobile_phone' => $data['phone'] ?? null,
        'start_date' => $data['hire_date'] ?? date('Y-m-d'),
        'status' => ($data['is_active'] ?? true) ? 'Active' : 'Inactive',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('users', $userInsertData);
    $userId = $db->id();

    $insertData = [
        'user_id' => $userId,
        'email' => $data['email'],
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'] ?? '',
        'role' => $data['role'] ?? 'employee',
        'employee_number' => $employeeCode,
        'phone' => $data['phone'] ?? null,
        'hire_date' => $data['hire_date'] ?? date('Y-m-d'),
        'vacation_days_total' => $data['vacation_days_total'] ?? 0,
        'is_active' => $data['is_active'] ?? true
    ];

    $db->insert('employees_timetrackpro', $insertData);
    $employeeId = $db->id();

    $employee = $db->get('employees_timetrackpro', [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'employee_number',
        'phone',
        'hire_date',
        'is_active',
        'vacation_days_total',
        'vacation_days_used',
        'created_at',
        'updated_at'
    ], ['id' => $employeeId]);

    send_success_response($employee, 'Employee created successfully', 201);
}

function handle_update_employee() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();
    $employee = $db->get('employees_timetrackpro', 'id', ['id' => $data['id']]);
    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    $updateData = [];
    if (isset($data['email'])) {
        $existing = $db->get('employees_timetrackpro', 'id', [
            'email' => $data['email'],
            'id[!]' => $data['id']
        ]);
        if ($existing) {
            send_error_response('Email already exists', 400);
        }
        $updateData['email'] = $data['email'];
    }

    if (isset($data['password']) && !empty($data['password'])) {
        $updateData['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT);
    }

    if (isset($data['first_name'])) $updateData['first_name'] = $data['first_name'];
    if (isset($data['last_name'])) $updateData['last_name'] = $data['last_name'];
    if (isset($data['role'])) $updateData['role'] = $data['role'];
    if (isset($data['employee_number'])) $updateData['employee_number'] = $data['employee_number'];
    if (isset($data['phone'])) $updateData['phone'] = $data['phone'];
    if (isset($data['hire_date'])) $updateData['hire_date'] = $data['hire_date'];
    if (isset($data['vacation_days_total'])) $updateData['vacation_days_total'] = $data['vacation_days_total'];
    if (isset($data['is_active'])) $updateData['is_active'] = $data['is_active'];

    if (!empty($updateData)) {
        $db->update('employees_timetrackpro', $updateData, ['id' => $data['id']]);
    }

    $updatedEmployee = $db->get('employees_timetrackpro', [
        'id',
        'email',
        'first_name',
        'last_name',
        'role',
        'employee_number',
        'phone',
        'hire_date',
        'is_active',
        'vacation_days_total',
        'vacation_days_used',
        'created_at',
        'updated_at'
    ], ['id' => $data['id']]);

    send_success_response($updatedEmployee, 'Employee updated successfully');
}

function handle_delete_employee() {
    require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();
    $employee = $db->get('employees_timetrackpro', 'id', ['id' => $data['id']]);
    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    $db->delete('employees_timetrackpro', ['id' => $data['id']]);

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
        $employee = $db->get('employees_timetrackpro', [
            'first_name',
            'last_name',
            'employee_number'
        ], [
            'id' => $entry['employee_id']
        ]);
        $entry['employee_name'] = $employee['first_name'] . ' ' . $employee['last_name'];
        $entry['employee_number'] = $employee['employee_number'];
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
        $employee = $db->get('employees_timetrackpro', [
            'first_name',
            'last_name',
            'employee_number'
        ], [
            'id' => $request['employee_id']
        ]);
        $request['employee_name'] = $employee['first_name'] . ' ' . $employee['last_name'];
        $request['employee_number'] = $employee['employee_number'];

        if ($request['approved_by']) {
            $approver = $db->get('employees_timetrackpro', [
                'first_name',
                'last_name'
            ], [
                'id' => $request['approved_by']
            ]);
            $request['approved_by_name'] = $approver['first_name'] . ' ' . $approver['last_name'];
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

    $db->update('vacation_requests_timetrackpro', [
        'status' => 'approved',
        'approved_by' => $admin['id'],
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

    $db->update('vacation_requests_timetrackpro', [
        'status' => 'denied',
        'approved_by' => $admin['id'],
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
