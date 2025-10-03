import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import db from '../config/database.js';

const router = express.Router();

router.get('/balance', authenticate, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const [employees] = await db.query(
      'SELECT vacation_days_total, vacation_days_used FROM employees WHERE id = ?',
      [employeeId]
    );

    const balance = employees[0];
    balance.vacation_days_remaining = balance.vacation_days_total - balance.vacation_days_used;

    sendSuccess(res, balance);
  } catch (error) {
    console.error('Get vacation balance error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/requests', authenticate, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const [requests] = await db.query(
      'SELECT * FROM vacation_requests WHERE employee_id = ? ORDER BY created_at DESC',
      [employeeId]
    );

    for (const request of requests) {
      if (request.approved_by) {
        const [approvers] = await db.query(
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
    console.error('Get vacation requests error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/requests', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, days_requested, request_type, notes } = req.body;
    const employeeId = req.employee.id;

    if (!start_date || !end_date || !days_requested) {
      return sendError(res, 'Start date, end date, and days requested are required', 400);
    }

    const [employees] = await db.query(
      'SELECT vacation_days_total, vacation_days_used FROM employees WHERE id = ?',
      [employeeId]
    );

    const balance = employees[0];
    const remainingDays = balance.vacation_days_total - balance.vacation_days_used;

    if (days_requested > remainingDays) {
      return sendError(res, 'Insufficient vacation days available', 400);
    }

    const [result] = await db.query(
      `INSERT INTO vacation_requests (employee_id, start_date, end_date, days_requested, request_type, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, start_date, end_date, days_requested, request_type || 'vacation', notes || null, 'pending']
    );

    const [requests] = await db.query('SELECT * FROM vacation_requests WHERE id = ?', [result.insertId]);

    sendSuccess(res, requests[0], 'Vacation request created successfully', 201);
  } catch (error) {
    console.error('Create vacation request error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.put('/requests', authenticate, async (req, res) => {
  try {
    const { id, start_date, end_date, days_requested, request_type, notes } = req.body;
    const employeeId = req.employee.id;

    if (!id) {
      return sendError(res, 'Request ID is required', 400);
    }

    const [requests] = await db.query(
      'SELECT * FROM vacation_requests WHERE id = ? AND employee_id = ?',
      [id, employeeId]
    );

    if (requests.length === 0) {
      return sendError(res, 'Request not found', 404);
    }

    if (requests[0].status !== 'pending') {
      return sendError(res, 'Can only update pending requests', 400);
    }

    const updates = [];
    const values = [];

    if (start_date) {
      updates.push('start_date = ?');
      values.push(start_date);
    }
    if (end_date) {
      updates.push('end_date = ?');
      values.push(end_date);
    }
    if (days_requested) {
      updates.push('days_requested = ?');
      values.push(days_requested);
    }
    if (request_type) {
      updates.push('request_type = ?');
      values.push(request_type);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE vacation_requests SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [updatedRequests] = await db.query('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    sendSuccess(res, updatedRequests[0], 'Request updated successfully');
  } catch (error) {
    console.error('Update vacation request error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/requests/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.body;
    const employeeId = req.employee.id;

    if (!id) {
      return sendError(res, 'Request ID is required', 400);
    }

    const [requests] = await db.query(
      'SELECT * FROM vacation_requests WHERE id = ? AND employee_id = ?',
      [id, employeeId]
    );

    if (requests.length === 0) {
      return sendError(res, 'Request not found', 404);
    }

    if (requests[0].status === 'cancelled') {
      return sendError(res, 'Request already cancelled', 400);
    }

    await db.query('UPDATE vacation_requests SET status = ? WHERE id = ?', ['cancelled', id]);

    const [updatedRequests] = await db.query('SELECT * FROM vacation_requests WHERE id = ?', [id]);

    sendSuccess(res, updatedRequests[0], 'Request cancelled successfully');
  } catch (error) {
    console.error('Cancel vacation request error:', error);
    sendError(res, 'Server error', 500);
  }
});

export default router;
