<?php

function authenticate_user() {
    $token = get_token_from_header();

    if (!$token) {
        send_error_response('Authentication required', 401);
    }

    $payload = jwt_decode($token);

    if (!$payload) {
        send_error_response('Invalid or expired token', 401);
    }

    $db = get_db_connection();
    $employee = $db->get('employees_timetrackpro', '*', [
        'id' => $payload['user_id'],
        'is_active' => true
    ]);

    if (!$employee) {
        send_error_response('User not found or inactive', 401);
    }

    return $employee;
}

function require_admin() {
    $employee = authenticate_user();

    if ($employee['role'] !== 'admin') {
        send_error_response('Admin access required', 403);
    }

    return $employee;
}

function handle_login() {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['email']) || !isset($data['password'])) {
        send_error_response('Email and password are required', 400);
    }

    $db = get_db_connection();
    $user = $db->get('users', '*', [
        'email' => $data['email'],
        'status' => 'Active'
    ]);

    if (!$user || !password_verify($data['password'], $user['password'])) {
        send_error_response('Invalid credentials', 401);
    }

    $userRoles = $db->select('model_has_roles', [
        '[>]roles' => ['role_id' => 'id']
    ], [
        'roles.id',
        'roles.name',
        'roles.short_name',
        'roles.color'
    ], [
        'model_has_roles.model_id' => $user['id'],
        'model_has_roles.model_type' => 'App\\Models\\Iam\\Personnel\\User'
    ]);

    $primaryRole = !empty($userRoles) && isset($userRoles[0]['short_name']) ? $userRoles[0]['short_name'] : 'employee';

    $employee = $db->get('employees_timetrackpro', '*', [
        'user_id' => $user['id'],
        'is_active' => true
    ]);

    if (!$employee) {
        $employeeData = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'] ?? '',
            'role' => $primaryRole,
            'employee_number' => $user['employee_code'],
            'phone' => $user['mobile_phone'] ?? $user['phone_number'],
            'hire_date' => $user['start_date'],
            'is_active' => true,
            'vacation_days_total' => 0,
            'vacation_days_used' => 0
        ];

        $db->insert('employees_timetrackpro', $employeeData);
        $employeeId = $db->id();
        $employee = $db->get('employees_timetrackpro', '*', ['id' => $employeeId]);
    }

    unset($user['password']);
    $employee['roles'] = $userRoles;

    $token = jwt_encode([
        'user_id' => $employee['id'],
        'email' => $employee['email'],
        'role' => $employee['role']
    ]);

    send_success_response([
        'token' => $token,
        'user' => $employee
    ], 'Login successful');
}

function handle_register() {
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['email', 'password', 'first_name', 'last_name', 'employee_code'];
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

    $userInsertData = [
        'unique_id' => $uniqueId,
        'employee_code' => $data['employee_code'],
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'] ?? '',
        'email' => $data['email'],
        'password' => $passwordHash,
        'mobile_phone' => $data['phone'] ?? null,
        'start_date' => $data['hire_date'] ?? date('Y-m-d'),
        'status' => 'Active',
        'created_at' => date('Y-m-d H:i:s'),
        'updated_at' => date('Y-m-d H:i:s')
    ];

    $db->insert('users', $userInsertData);
    $userId = $db->id();

    $employeeInsertData = [
        'user_id' => $userId,
        'email' => $data['email'],
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'] ?? '',
        'role' => $data['role'] ?? 'employee',
        'employee_number' => $data['employee_code'],
        'phone' => $data['phone'] ?? null,
        'hire_date' => $data['hire_date'] ?? date('Y-m-d'),
        'vacation_days_total' => $data['vacation_days_total'] ?? 0,
        'is_active' => true
    ];

    $db->insert('employees_timetrackpro', $employeeInsertData);
    $employeeId = $db->id();

    $employee = $db->get('employees_timetrackpro', '*', ['id' => $employeeId]);

    $token = jwt_encode([
        'user_id' => $employee['id'],
        'email' => $employee['email'],
        'role' => $employee['role']
    ]);

    send_success_response([
        'token' => $token,
        'user' => $employee
    ], 'Registration successful', 201);
}

function handle_me() {
    $token = get_token_from_header();

    if (!$token) {
        send_error_response('Authentication required', 401);
    }

    $payload = jwt_decode($token);

    if (!$payload) {
        send_error_response('Invalid or expired token', 401);
    }

    $db = get_db_connection();
    $employee = $db->get('employees_timetrackpro', '*', [
        'id' => $payload['user_id'],
        'is_active' => true
    ]);

    if (!$employee) {
        send_error_response('User not found', 404);
    }

    send_success_response($employee);
}
