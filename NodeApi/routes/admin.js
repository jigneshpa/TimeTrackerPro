import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { dbA, dbB } from '../config/database.js';

const router = express.Router();

router.get('/employees', requireAdmin, async (req, res) => {
  try {
    const [employees] = await dbB.query(
      `SELECT id, email, first_name, last_name, role, employee_number, phone, hire_date,
              is_active, vacation_days_total, vacation_days_used, created_at, updated_at
       FROM employees
       ORDER BY created_at DESC`
    );

    employees.forEach(emp => {
      emp.vacation_days_remaining = emp.vacation_days_total - emp.vacation_days_used;
    });

    sendSuccess(res, employees);
  } catch (error) {
    console.error('Get employees error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/employee', requireAdmin, async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return sendError(res, 'Employee ID is required', 400);
    }

    const [employees] = await dbB.query(
      `SELECT id, email, first_name, last_name, role, employee_number, phone, hire_date,
              is_active, vacation_days_total, vacation_days_used, created_at, updated_at
       FROM employees
       WHERE id = ?`,
      [id]
    );

    if (employees.length === 0) {
      return sendError(res, 'Employee not found', 404);
    }

    const employee = employees[0];
    employee.vacation_days_remaining = employee.vacation_days_total - employee.vacation_days_used;

    sendSuccess(res, employee);
  } catch (error) {
    console.error('Get employee error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/employees', requireAdmin, async (req, res) => {
  try {
    const { email, password, first_name, last_name, role, employee_number, phone, hire_date, vacation_days_total, is_active } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return sendError(res, 'Email, password, first name, and last name are required', 400);
    }

    const [existingUsers] = await dbA.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return sendError(res, 'Email already exists in users database', 400);
    }

    const [existingEmployees] = await dbB.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existingEmployees.length > 0) {
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
        is_active !== undefined ? is_active : true
      ]
    );

    const [employees] = await dbB.query(
      `SELECT id, email, first_name, last_name, role, employee_number, phone, hire_date,
              is_active, vacation_days_total, vacation_days_used, created_at, updated_at
       FROM employees
       WHERE id = ?`,
      [result.insertId]
    );

    sendSuccess(res, employees[0], 'Employee created successfully', 201);
  } catch (error) {
    console.error('Create employee error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.put('/employees', requireAdmin, async (req, res) => {
  try {
    const { id, email, password, first_name, last_name, role, employee_number, phone, hire_date, vacation_days_total, is_active } = req.body;

    if (!id) {
      return sendError(res, 'Employee ID is required', 400);
    }

    const [employees] = await dbB.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return sendError(res, 'Employee not found', 404);
    }

    const updates = [];
    const values = [];

    if (email) {
      const [existing] = await dbB.query('SELECT id FROM employees WHERE email = ? AND id != ?', [email, id]);
      if (existing.length > 0) {
        return sendError(res, 'Email already exists', 400);
      }
      updates.push('email = ?');
      values.push(email);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(passwordHash);
    }

    if (first_name) {
      updates.push('first_name = ?');
      values.push(first_name);
    }
    if (last_name) {
      updates.push('last_name = ?');
      values.push(last_name);
    }
    if (role) {
      updates.push('role = ?');
      values.push(role);
    }
    if (employee_number !== undefined) {
      updates.push('employee_number = ?');
      values.push(employee_number);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (hire_date) {
      updates.push('hire_date = ?');
      values.push(hire_date);
    }
    if (vacation_days_total !== undefined) {
      updates.push('vacation_days_total = ?');
      values.push(vacation_days_total);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (updates.length > 0) {
      values.push(id);
      await dbB.query(
        `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [updatedEmployees] = await dbB.query(
      `SELECT id, email, first_name, last_name, role, employee_number, phone, hire_date,
              is_active, vacation_days_total, vacation_days_used, created_at, updated_at
       FROM employees
       WHERE id = ?`,
      [id]
    );

    sendSuccess(res, updatedEmployees[0], 'Employee updated successfully');
  } catch (error) {
    console.error('Update employee error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.delete('/employees', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return sendError(res, 'Employee ID is required', 400);
    }

    const [employees] = await dbB.query('SELECT id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return sendError(res, 'Employee not found', 404);
    }

    await dbB.query('DELETE FROM employees WHERE id = ?', [id]);

    sendSuccess(res, null, 'Employee deleted successfully');
  } catch (error) {
    console.error('Delete employee error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/time-entries', requireAdmin, async (req, res) => {
  try {
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.end_date || new Date().toISOString().split('T')[0];
    const employeeId = req.query.employee_id;

    let query = `SELECT * FROM time_entries WHERE clock_in >= ? AND clock_in <= ?`;
    const params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];

    if (employeeId) {
      query += ' AND employee_id = ?';
      params.push(employeeId);
    }

    query += ' ORDER BY clock_in DESC';

    const [entries] = await dbB.query(query, params);

    for (const entry of entries) {
      const [employees] = await dbB.query(
        'SELECT first_name, last_name, employee_number FROM employees WHERE id = ?',
        [entry.employee_id]
      );
      if (employees.length > 0) {
        entry.employee_name = `${employees[0].first_name} ${employees[0].last_name}`;
        entry.employee_number = employees[0].employee_number;
      }
    }

    sendSuccess(res, entries);
  } catch (error) {
    console.error('Get all time entries error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/vacation-requests', requireAdmin, async (req, res) => {
  try {
    const status = req.query.status;

    let query = 'SELECT * FROM vacation_requests';
    const params = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [requests] = await dbB.query(query, params);

    for (const request of requests) {
      const [employees] = await dbB.query(
        'SELECT first_name, last_name, employee_number FROM employees WHERE id = ?',
        [request.employee_id]
      );
      if (employees.length > 0) {
        request.employee_name = `${employees[0].first_name} ${employees[0].last_name}`;
        request.employee_number = employees[0].employee_number;
      }

      if (request.approved_by) {
        const [approvers] = await dbB.query(
          'SELECT first_name, last_name FROM employees WHERE id = ?',
          [request.approved_by]
        );
        if (approvers.length > 0) {
          request.approved_by_name = `${approvers[0].first_name} ${approvers[0].last_name}`;
        }
      }
    }

    sendSuccess(res, requests);
  } catch (error) {
    console.error('Get all vacation requests error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/vacation-requests/approve', requireAdmin, async (req, res) => {
  try {
    const { id } = req.body;
    const adminId = req.employee.id;

    if (!id) {
      return sendError(res, 'Request ID is required', 400);
    }

    const [requests] = await dbB.query('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    if (requests.length === 0) {
      return sendError(res, 'Request not found', 404);
    }

    if (requests[0].status !== 'pending') {
      return sendError(res, 'Can only approve pending requests', 400);
    }

    const approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await dbB.query(
      'UPDATE vacation_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?',
      ['approved', adminId, approvedAt, id]
    );

    await dbB.query(
      'UPDATE employees SET vacation_days_used = vacation_days_used + ? WHERE id = ?',
      [requests[0].days_requested, requests[0].employee_id]
    );

    const [updatedRequests] = await dbB.query('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    sendSuccess(res, updatedRequests[0], 'Vacation request approved');
  } catch (error) {
    console.error('Approve vacation error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/vacation-requests/deny', requireAdmin, async (req, res) => {
  try {
    const { id, denial_reason } = req.body;
    const adminId = req.employee.id;

    if (!id) {
      return sendError(res, 'Request ID is required', 400);
    }

    const [requests] = await dbB.query('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    if (requests.length === 0) {
      return sendError(res, 'Request not found', 404);
    }

    if (requests[0].status !== 'pending') {
      return sendError(res, 'Can only deny pending requests', 400);
    }

    const approvedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await dbB.query(
      'UPDATE vacation_requests SET status = ?, approved_by = ?, approved_at = ?, denial_reason = ? WHERE id = ?',
      ['denied', adminId, approvedAt, denial_reason || null, id]
    );

    const [updatedRequests] = await dbB.query('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    sendSuccess(res, updatedRequests[0], 'Vacation request denied');
  } catch (error) {
    console.error('Deny vacation error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/work-schedules', requireAdmin, async (req, res) => {
  try {
    const employeeId = req.query.employee_id;

    if (!employeeId) {
      return sendError(res, 'Employee ID is required', 400);
    }

    const [schedules] = await dbB.query(
      'SELECT * FROM work_schedules WHERE employee_id = ? ORDER BY day_of_week ASC',
      [employeeId]
    );

    sendSuccess(res, schedules);
  } catch (error) {
    console.error('Get work schedules error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/work-schedules', requireAdmin, async (req, res) => {
  try {
    const { employee_id, day_of_week, start_time, end_time, is_working_day } = req.body;

    if (!employee_id || day_of_week === undefined || !start_time || !end_time) {
      return sendError(res, 'Employee ID, day of week, start time, and end time are required', 400);
    }

    const [existing] = await dbB.query(
      'SELECT id FROM work_schedules WHERE employee_id = ? AND day_of_week = ?',
      [employee_id, day_of_week]
    );

    let scheduleId;

    if (existing.length > 0) {
      await dbB.query(
        'UPDATE work_schedules SET start_time = ?, end_time = ?, is_working_day = ? WHERE employee_id = ? AND day_of_week = ?',
        [start_time, end_time, is_working_day !== undefined ? is_working_day : true, employee_id, day_of_week]
      );
      scheduleId = existing[0].id;
    } else {
      const [result] = await dbB.query(
        'INSERT INTO work_schedules (employee_id, day_of_week, start_time, end_time, is_working_day) VALUES (?, ?, ?, ?, ?)',
        [employee_id, day_of_week, start_time, end_time, is_working_day !== undefined ? is_working_day : true]
      );
      scheduleId = result.insertId;
    }

    const [schedules] = await dbB.query('SELECT * FROM work_schedules WHERE id = ?', [scheduleId]);

    sendSuccess(res, schedules[0], 'Work schedule saved successfully');
  } catch (error) {
    console.error('Save work schedule error:', error);
    sendError(res, 'Server error', 500);
  }
});

export default router;
