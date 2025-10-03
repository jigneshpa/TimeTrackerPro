import express from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, verifyToken, getTokenFromHeader } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/response.js';
import db from '../config/database.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400);
    }

    const [employees] = await db.query(
      'SELECT * FROM employees WHERE email = ? AND is_active = true',
      [email]
    );

    if (employees.length === 0) {
      return sendError(res, 'Invalid credentials', 401);
    }

    const employee = employees[0];
    const isPasswordValid = await bcrypt.compare(password, employee.password_hash);

    if (!isPasswordValid) {
      return sendError(res, 'Invalid credentials', 401);
    }

    delete employee.password_hash;

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

    const [existing] = await db.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing.length > 0) {
      return sendError(res, 'Email already exists', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO employees (email, password_hash, first_name, last_name, role, employee_number, phone, hire_date, vacation_days_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        passwordHash,
        first_name,
        last_name,
        role || 'employee',
        employee_number || null,
        phone || null,
        hire_date || new Date().toISOString().split('T')[0],
        vacation_days_total || 0
      ]
    );

    const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    const employee = employees[0];
    delete employee.password_hash;

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

    const [employees] = await db.query(
      'SELECT * FROM employees WHERE id = ? AND is_active = true',
      [payload.user_id]
    );

    if (employees.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const employee = employees[0];
    delete employee.password_hash;

    sendSuccess(res, employee);
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Server error', 500);
  }
});

export default router;
