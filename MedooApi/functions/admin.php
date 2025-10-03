<?php

function handle_get_employees() {
    require_admin();

    $db = get_db_connection();
    $employees = $db->select('employees', [
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
    $employee = $db->get('employees', [
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

    $dbA = get_db_connection_a();
    $existingUser = $dbA->get('users', 'id', ['email' => $data['email']]);
    if ($existingUser) {
        send_error_response('Email already exists in users database', 400);
    }

    $dbB = get_db_connection_b();
    $existingEmployee = $dbB->get('employees', 'id', ['email' => $data['email']]);
    if ($existingEmployee) {
        send_error_response('Email already exists', 400);
    }

    $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);

    $dbA->insert('users', [
        'email' => $data['email'],
        'password' => $passwordHash,
        'name' => $data['first_name'] . ' ' . $data['last_name']
    ]);

    $insertData = [
        'email' => $data['email'],
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'role' => $data['role'] ?? 'employee',
        'employee_number' => $data['employee_number'] ?? null,
        'phone' => $data['phone'] ?? null,
        'hire_date' => $data['hire_date'] ?? date('Y-m-d'),
        'vacation_days_total' => $data['vacation_days_total'] ?? 0,
        'is_active' => $data['is_active'] ?? true
    ];

    $dbB->insert('employees', $insertData);
    $employeeId = $dbB->id();

    $employee = $dbB->get('employees', [
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
    $employee = $db->get('employees', 'id', ['id' => $data['id']]);
    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    $updateData = [];
    if (isset($data['email'])) {
        $existing = $db->get('employees', 'id', [
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
        $db->update('employees', $updateData, ['id' => $data['id']]);
    }

    $updatedEmployee = $db->get('employees', [
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
    $employee = $db->get('employees', 'id', ['id' => $data['id']]);
    if (!$employee) {
        send_error_response('Employee not found', 404);
    }

    $db->delete('employees', ['id' => $data['id']]);

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
    $entries = $db->select('time_entries', '*', $where);

    foreach ($entries as &$entry) {
        $employee = $db->get('employees', [
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
    $requests = $db->select('vacation_requests', '*', $where);

    foreach ($requests as &$request) {
        $employee = $db->get('employees', [
            'first_name',
            'last_name',
            'employee_number'
        ], [
            'id' => $request['employee_id']
        ]);
        $request['employee_name'] = $employee['first_name'] . ' ' . $employee['last_name'];
        $request['employee_number'] = $employee['employee_number'];

        if ($request['approved_by']) {
            $approver = $db->get('employees', [
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
    $request = $db->get('vacation_requests', '*', ['id' => $data['id']]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] !== 'pending') {
        send_error_response('Can only approve pending requests', 400);
    }

    $db->update('vacation_requests', [
        'status' => 'approved',
        'approved_by' => $admin['id'],
        'approved_at' => date('Y-m-d H:i:s')
    ], [
        'id' => $data['id']
    ]);

    $db->update('employees', [
        'vacation_days_used[+]' => $request['days_requested']
    ], [
        'id' => $request['employee_id']
    ]);

    $updatedRequest = $db->get('vacation_requests', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Vacation request approved');
}

function handle_deny_vacation() {
    $admin = require_admin();
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['id'])) {
        send_error_response('Request ID is required', 400);
    }

    $db = get_db_connection();
    $request = $db->get('vacation_requests', '*', ['id' => $data['id']]);

    if (!$request) {
        send_error_response('Request not found', 404);
    }

    if ($request['status'] !== 'pending') {
        send_error_response('Can only deny pending requests', 400);
    }

    $db->update('vacation_requests', [
        'status' => 'denied',
        'approved_by' => $admin['id'],
        'approved_at' => date('Y-m-d H:i:s'),
        'denial_reason' => $data['denial_reason'] ?? null
    ], [
        'id' => $data['id']
    ]);

    $updatedRequest = $db->get('vacation_requests', '*', ['id' => $data['id']]);

    send_success_response($updatedRequest, 'Vacation request denied');
}

function handle_get_work_schedules() {
    require_admin();

    $employeeId = $_GET['employee_id'] ?? null;

    if (!$employeeId) {
        send_error_response('Employee ID is required', 400);
    }

    $db = get_db_connection();
    $schedules = $db->select('work_schedules', '*', [
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
    $existing = $db->get('work_schedules', 'id', [
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
        $db->update('work_schedules', $scheduleData, [
            'employee_id' => $data['employee_id'],
            'day_of_week' => $data['day_of_week']
        ]);
        $scheduleId = $existing;
    } else {
        $db->insert('work_schedules', $scheduleData);
        $scheduleId = $db->id();
    }

    $schedule = $db->get('work_schedules', '*', ['id' => $scheduleId]);

    send_success_response($schedule, 'Work schedule saved successfully');
}
