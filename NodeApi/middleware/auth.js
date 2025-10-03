import { verifyToken, getTokenFromHeader } from '../utils/jwt.js';
import { sendError } from '../utils/response.js';
import { dbB } from '../config/database.js';

export const authenticate = async (req, res, next) => {
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
      return sendError(res, 'User not found or inactive', 401);
    }

    const employee = employees[0];
    req.employee = employee;
    next();
  } catch (error) {
    return sendError(res, 'Authentication failed', 401);
  }
};

export const requireAdmin = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.employee.role !== 'admin') {
      return sendError(res, 'Admin access required', 403);
    }
    next();
  });
};
