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

    // Get user from users table
    $user = $db->get('users', '*', [
        'id' => $payload['user_id'],
        'status' => 'Active'
    ]);

    if (!$user) {
        send_error_response('User not found or inactive', 401);
    }

    // Get user roles
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

    // Get employee_id from employees_timetrackpro
    $employee = $db->get('employees_timetrackpro', 'id', [
        'user_id' => $user['id']
    ]);

    if (!$employee) {
        // Create employee record if it doesn't exist
        $employeeData = [
            'user_id' => $user['id'],
            'vacation_days_total' => 0,
            'vacation_days_used' => 0
        ];
        $db->insert('employees_timetrackpro', $employeeData);
        $employee = $db->id();
    }

    $user['employee_id'] = $employee;
    $user['roles'] = $userRoles;
    $user['role_short_names'] = array_column($userRoles, 'short_name');

    return $user;
}

function require_admin() {
    $user = authenticate_user();

    // Check if user has admin or master_admin role
    $adminRoles = ['admin', 'master_admin'];
    $hasAdminRole = !empty(array_intersect($user['role_short_names'], $adminRoles));

    if (!$hasAdminRole) {
        send_error_response('Admin access required', 403);
    }

    return $user;
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

    // Get user roles
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

    $roleShortNames = array_column($userRoles, 'short_name');
    $adminRoles = ['admin', 'master_admin'];
    $isAdmin = !empty(array_intersect($roleShortNames, $adminRoles));

    // Get or create employee vacation record
    $employee = $db->get('employees_timetrackpro', '*', [
        'user_id' => $user['id']
    ]);

    if (!$employee) {
        // Create employee vacation record if it doesn't exist
        $employeeData = [
            'user_id' => $user['id'],
            'vacation_days_total' => 0,
            'vacation_days_used' => 0
        ];

        $db->insert('employees_timetrackpro', $employeeData);
        $employeeId = $db->id();
        $employee = $db->get('employees_timetrackpro', '*', ['id' => $employeeId]);
    }

    unset($user['password']);

    // Build response user object
    $responseUser = [
        'id' => $employee['id'], // employee_timetrackpro ID
        'user_id' => $user['id'],
        'employee_code' => $user['employee_code'],
        'first_name' => $user['first_name'],
        'middle_name' => $user['middle_name'],
        'last_name' => $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['mobile_phone'] ?? $user['phone_number'],
        'hire_date' => $user['start_date'],
        'role' => $isAdmin ? 'admin' : 'employee',
        'roles' => $userRoles,
        'role_short_names' => implode(', ', $roleShortNames),
        'vacation_days_total' => $employee['vacation_days_total'],
        'vacation_days_used' => $employee['vacation_days_used'],
        'is_active' => $user['status'] === 'Active'
    ];

    $token = jwt_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => $responseUser['role']
    ]);

    send_success_response([
        'token' => $token,
        'user' => $responseUser
    ], 'Login successful');
}

function handle_register() {
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['email', 'password', 'first_name', 'employee_code'];
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

    // Create employee vacation record
    $employeeInsertData = [
        'user_id' => $userId,
        'vacation_days_total' => $data['vacation_days_total'] ?? 0,
        'vacation_days_used' => 0
    ];

    $db->insert('employees_timetrackpro', $employeeInsertData);
    $employeeId = $db->id();

    $user = $db->get('users', '*', ['id' => $userId]);
    $employee = $db->get('employees_timetrackpro', '*', ['id' => $employeeId]);

    $responseUser = [
        'id' => $employee['id'],
        'user_id' => $user['id'],
        'employee_code' => $user['employee_code'],
        'first_name' => $user['first_name'],
        'last_name' => $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['mobile_phone'],
        'hire_date' => $user['start_date'],
        'role' => 'employee',
        'vacation_days_total' => $employee['vacation_days_total'],
        'vacation_days_used' => $employee['vacation_days_used']
    ];

    $token = jwt_encode([
        'user_id' => $user['id'],
        'email' => $user['email'],
        'role' => 'employee'
    ]);

    send_success_response([
        'token' => $token,
        'user' => $responseUser
    ], 'Registration successful', 201);
}

function handle_me() {
    $user = authenticate_user();

    $db = get_db_connection();

    // Get employee vacation data
    $employee = $db->get('employees_timetrackpro', '*', [
        'user_id' => $user['id']
    ]);

    if (!$employee) {
        // Create if doesn't exist
        $employeeData = [
            'user_id' => $user['id'],
            'vacation_days_total' => 0,
            'vacation_days_used' => 0
        ];
        $db->insert('employees_timetrackpro', $employeeData);
        $employeeId = $db->id();
        $employee = $db->get('employees_timetrackpro', '*', ['id' => $employeeId]);
    }

    $adminRoles = ['admin', 'master_admin'];
    $isAdmin = !empty(array_intersect($user['role_short_names'], $adminRoles));

    $responseUser = [
        'id' => $employee['id'],
        'user_id' => $user['id'],
        'employee_code' => $user['employee_code'],
        'first_name' => $user['first_name'],
        'middle_name' => $user['middle_name'],
        'last_name' => $user['last_name'],
        'email' => $user['email'],
        'phone' => $user['mobile_phone'] ?? $user['phone_number'],
        'hire_date' => $user['start_date'],
        'role' => $isAdmin ? 'admin' : 'employee',
        'roles' => $user['roles'],
        'role_short_names' => implode(', ', $user['role_short_names']),
        'vacation_days_total' => $employee['vacation_days_total'],
        'vacation_days_used' => $employee['vacation_days_used'],
        'is_active' => $user['status'] === 'Active'
    ];

    send_success_response($responseUser);
}
