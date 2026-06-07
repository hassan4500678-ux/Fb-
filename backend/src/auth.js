import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export async function authRequired(req, res, next) {
  try {
    const header = req.get('authorization') ?? '';
    const [, token] = header.match(/^Bearer\s+(.+)$/i) ?? [];
    if (!token) return res.status(401).json({ error: 'Missing bearer token' });

    const payload = jwt.verify(token, config.jwtSecret);
    const table = payload.role === 'admin' ? 'admins' : 'employees';
    const result = await query(
      `SELECT id, name, email, badge, profile_image_url, profile_image_updated_at
       ${payload.role === 'employee' ? ', category, status' : ''}
       FROM ${table}
       WHERE id = $1`,
      [payload.sub],
    );

    if (!result.rowCount) return res.status(401).json({ error: 'Invalid token user' });
    if (payload.role === 'employee' && result.rows[0].status !== 'active') {
      return res.status(403).json({ error: 'Employee account is not active' });
    }

    req.user = { ...result.rows[0], role: payload.role };
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  return next();
}
