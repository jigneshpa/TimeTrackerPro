import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sendSuccess, sendError } from '../utils/response.js';
import db from '../config/database.js';

const router = express.Router();

router.post('/clock-in', authenticate, async (req, res) => {
  try {
    const { notes } = req.body;
    const employeeId = req.employee.id;

    const [activeEntries] = await db.query(
      'SELECT id FROM time_entries WHERE employee_id = ? AND clock_out IS NULL AND status = ?',
      [employeeId, 'active']
    );

    if (activeEntries.length > 0) {
      return sendError(res, 'You already have an active time entry', 400);
    }

    const clockIn = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const [result] = await db.query(
      'INSERT INTO time_entries (employee_id, clock_in, notes, status) VALUES (?, ?, ?, ?)',
      [employeeId, clockIn, notes || null, 'active']
    );

    const [entries] = await db.query('SELECT * FROM time_entries WHERE id = ?', [result.insertId]);

    sendSuccess(res, entries[0], 'Clocked in successfully', 201);
  } catch (error) {
    console.error('Clock in error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.post('/clock-out', authenticate, async (req, res) => {
  try {
    const { break_duration } = req.body;
    const employeeId = req.employee.id;

    const [activeEntries] = await db.query(
      'SELECT * FROM time_entries WHERE employee_id = ? AND clock_out IS NULL AND status = ?',
      [employeeId, 'active']
    );

    if (activeEntries.length === 0) {
      return sendError(res, 'No active time entry found', 404);
    }

    const activeEntry = activeEntries[0];
    const clockOut = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await db.query(
      'UPDATE time_entries SET clock_out = ?, break_duration = ?, status = ? WHERE id = ?',
      [clockOut, break_duration || 0, 'completed', activeEntry.id]
    );

    const [entries] = await db.query('SELECT * FROM time_entries WHERE id = ?', [activeEntry.id]);

    sendSuccess(res, entries[0], 'Clocked out successfully');
  } catch (error) {
    console.error('Clock out error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/active', authenticate, async (req, res) => {
  try {
    const employeeId = req.employee.id;

    const [activeEntries] = await db.query(
      'SELECT * FROM time_entries WHERE employee_id = ? AND clock_out IS NULL AND status = ?',
      [employeeId, 'active']
    );

    const activeEntry = activeEntries.length > 0 ? activeEntries[0] : null;

    sendSuccess(res, activeEntry);
  } catch (error) {
    console.error('Get active entry error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/today', authenticate, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const today = new Date().toISOString().split('T')[0];

    const [entries] = await db.query(
      `SELECT * FROM time_entries
       WHERE employee_id = ?
       AND DATE(clock_in) = ?
       ORDER BY clock_in DESC`,
      [employeeId, today]
    );

    sendSuccess(res, entries);
  } catch (error) {
    console.error('Get today entries error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.get('/entries', authenticate, async (req, res) => {
  try {
    const employeeId = req.employee.id;
    const startDate = req.query.start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = req.query.end_date || new Date().toISOString().split('T')[0];

    const [entries] = await db.query(
      `SELECT * FROM time_entries
       WHERE employee_id = ?
       AND clock_in >= ?
       AND clock_in <= ?
       ORDER BY clock_in DESC`,
      [employeeId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]
    );

    sendSuccess(res, entries);
  } catch (error) {
    console.error('Get entries error:', error);
    sendError(res, 'Server error', 500);
  }
});

router.put('/entries', authenticate, async (req, res) => {
  try {
    const { id, clock_in, clock_out, break_duration, notes } = req.body;
    const employeeId = req.employee.id;

    if (!id) {
      return sendError(res, 'Entry ID is required', 400);
    }

    const [entries] = await db.query(
      'SELECT * FROM time_entries WHERE id = ? AND employee_id = ?',
      [id, employeeId]
    );

    if (entries.length === 0) {
      return sendError(res, 'Entry not found', 404);
    }

    const entry = entries[0];
    const updates = [];
    const values = [];

    if (clock_in) {
      updates.push('clock_in = ?');
      values.push(clock_in);
    }
    if (clock_out) {
      updates.push('clock_out = ?');
      values.push(clock_out);
    }
    if (break_duration !== undefined) {
      updates.push('break_duration = ?');
      values.push(break_duration);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (entry.status === 'completed') {
      updates.push('status = ?');
      values.push('edited');
    }

    if (updates.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE time_entries SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    const [updatedEntries] = await db.query('SELECT * FROM time_entries WHERE id = ?', [id]);

    sendSuccess(res, updatedEntries[0], 'Entry updated successfully');
  } catch (error) {
    console.error('Update entry error:', error);
    sendError(res, 'Server error', 500);
  }
});

export default router;
