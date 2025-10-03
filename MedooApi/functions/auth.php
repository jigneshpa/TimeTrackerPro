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

    $dbB = get_db_connection_b();
    $employee = $dbB->get('employees', '*', [
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

    $dbA = get_db_connection_a();
    $user = $dbA->get('users', '*', ['email' => $data['email']]);

    if (!$user || !password_verify($data['password'], $user['password'])) {
        send_error_response('Invalid credentials', 401);
    }

    $dbB = get_db_connection_b();
    $employee = $dbB->get('employees', '*', [
        'email' => $data['email'],
        'is_active' => true
    ]);

    if (!$employee) {
        $insertData = [
            'email' => $data['email'],
            'first_name' => $user['name'] ?? 'User',
            'last_name' => '',
            'role' => 'employee',
            'is_active' => true
        ];
        $dbB->insert('employees', $insertData);
        $employeeId = $dbB->id();
        $employee = $dbB->get('employees', '*', ['id' => $employeeId]);
    }

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

    $required = ['email', 'password', 'first_name', 'last_name'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            send_error_response("Field '$field' is required", 400);
        }
    }

    $dbA = get_db_connection_a();
    $existingUser = $dbA->get('users', 'id', ['email' => $data['email']]);
    if ($existingUser) {
        send_error_response('Email already exists', 400);
    }

    $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT);

    $dbA->insert('users', [
        'email' => $data['email'],
        'password' => $passwordHash,
        'name' => $data['first_name'] . ' ' . $data['last_name']
    ]);

    $dbB = get_db_connection_b();
    $insertData = [
        'email' => $data['email'],
        'first_name' => $data['first_name'],
        'last_name' => $data['last_name'],
        'role' => $data['role'] ?? 'employee',
        'employee_number' => $data['employee_number'] ?? null,
        'phone' => $data['phone'] ?? null,
        'hire_date' => $data['hire_date'] ?? date('Y-m-d'),
        'vacation_days_total' => $data['vacation_days_total'] ?? 0,
        'is_active' => true
    ];

    $dbB->insert('employees', $insertData);
    $employeeId = $dbB->id();

    $employee = $dbB->get('employees', '*', ['id' => $employeeId]);

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

    $dbB = get_db_connection_b();
    $employee = $dbB->get('employees', '*', [
        'id' => $payload['user_id'],
        'is_active' => true
    ]);

    if (!$employee) {
        send_error_response('User not found', 404);
    }

    send_success_response($employee);
}
