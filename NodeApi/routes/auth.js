import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, getTokenFromHeader } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { dbA, dbB } from '../config/database.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const [users] = await dbA.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const [employees] = await dbB.query(
      'SELECT * FROM employees WHERE email = ? AND is_active = true',
      [email]
    );

    let employee;
    if (employees.length === 0) {
      const [result] = await dbB.query(
        'INSERT INTO employees (email, first_name, last_name, role, is_active) VALUES (?, ?, ?, ?, ?)',
        [email, user.name || 'User', '', 'employee', true]
      );
      const [newEmployees] = await dbB.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
      employee = newEmployees[0];
    } else {
      employee = employees[0];
    }

    delete user.password;

    const token = generateToken({
      user_id: employee.id,
      email: employee.email,
      role: employee.role
    });

    sendSuccess(res, { token, user: employee }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, employee_number, phone, hire_date, vacation_days_total } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return sendError(res, 'Email, password, first name, and last name are required', 400);
    }

    const [existingUsers] = await dbA.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return sendError(res, 'Email already exists', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await dbA.query(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, passwordHash, `${first_name} ${last_name}`]
    );

    const [result] = await dbB.query(
      `INSERT INTO employees (email, first_name, last_name, role, employee_number, phone, hire_date, vacation_days_total, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        first_name,
        last_name,
        role || 'employee',
        employee_number || null,
        phone || null,
        hire_date || new Date().toISOString().split('T')[0],
        vacation_days_total || 0,
        true
      ]
    );

    const [employees] = await dbB.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    const employee = employees[0];

    const token = generateToken({
      user_id: employee.id,
      email: employee.email,
      role: employee.role
    });

    sendSuccess(res, { token, user: employee }, 'Registration successful', 201);
  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return sendError(res, 'Authentication required', 401);
    }

    const payload = verifyToken(token);

    if (!payload) {
      return sendError(res, 'Invalid or expired token', 401);
    }

    const [employees] = await dbB.query(
      'SELECT * FROM employees WHERE id = ? AND is_active = true',
      [payload.user_id]
    );

    if (employees.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const employee = employees[0];

    sendSuccess(res, employee);
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Server error', 500);
  }
});

export default router;
