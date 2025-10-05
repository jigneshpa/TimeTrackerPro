<?php

namespace Api\Controllers;

use Api\Utils\Database;
use Api\Utils\Response;
use Api\Utils\JWT;

class AuthController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function login()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (!isset($data['email']) || !isset($data['password'])) {
            Response::error('Email and password are required', 400);
        }

        $user = $this->db->get('users', '*', [
            'email' => $data['email'],
            'status' => 'Active'
        ]);

        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::error('Invalid credentials', 401);
        }

        $userRoles = $this->db->select('model_has_roles', [
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

        $employee = $this->db->get('employees_timetrackpro', '*', [
            'user_id' => $user['id'],
            'is_active' => true
        ]);

        if (!$employee) {
            $employee = [
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

            $this->db->insert('employees_timetrackpro', $employee);
            $employeeId = $this->db->id();
            $employee = $this->db->get('employees_timetrackpro', '*', ['id' => $employeeId]);
        }

        unset($user['password']);
        $employee['roles'] = $userRoles;

        $token = JWT::encode([
            'user_id' => $employee['id'],
            'email' => $employee['email'],
            'role' => $employee['role']
        ]);

        Response::success([
            'token' => $token,
            'user' => $employee
        ], 'Login successful');
    }

    public function register()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        $required = ['email', 'password', 'first_name', 'last_name', 'employee_code'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                Response::error("Field '$field' is required", 400);
            }
        }

        $existing = $this->db->get('users', 'id', ['email' => $data['email']]);
        if ($existing) {
            Response::error('Email already exists', 400);
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

        $this->db->insert('users', $userInsertData);
        $userId = $this->db->id();

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

        $this->db->insert('employees_timetrackpro', $employeeInsertData);
        $employeeId = $this->db->id();

        $employee = $this->db->get('employees_timetrackpro', '*', ['id' => $employeeId]);

        $token = JWT::encode([
            'user_id' => $employee['id'],
            'email' => $employee['email'],
            'role' => $employee['role']
        ]);

        Response::success([
            'token' => $token,
            'user' => $employee
        ], 'Registration successful', 201);
    }

    public function me()
    {
        $token = JWT::getTokenFromHeader();

        if (!$token) {
            Response::error('Authentication required', 401);
        }

        $payload = JWT::decode($token);

        if (!$payload) {
            Response::error('Invalid or expired token', 401);
        }

        $employee = $this->db->get('employees_timetrackpro', '*', [
            'id' => $payload['user_id'],
            'is_active' => true
        ]);

        if (!$employee) {
            Response::error('User not found', 404);
        }

        unset($employee['password_hash']);

        Response::success($employee);
    }
}
