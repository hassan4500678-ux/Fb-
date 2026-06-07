import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import bcrypt from 'bcryptjs';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import pino from 'pino';
import pinoHttp from 'pino-http';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { z } from 'zod';
import { authRequired, adminOnly, signToken } from './auth.js';
import { config } from './config.js';
import { query, withTransaction } from './db.js';
import {
  coinsForPoints,
  dailyFixedTarget,
  incentiveFor,
  kpiPercentage,
  salaryNet,
  SALARY_DEFAULTS,
  workingDays,
} from './calculations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(__dirname, '..', config.uploadDir);
mkdirSync(uploadRoot, { recursive: true });

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });
const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));
app.use('/uploads', express.static(uploadRoot, { maxAge: '7d', immutable: true }));

const upload = multer({
  dest: uploadRoot,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image uploads are allowed'));
    cb(null, true);
  },
});

const employeeSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(4).optional(),
  category: z.enum(['Biscuit', 'Cake', 'Piper', 'Rider']),
  monthlyTarget: z.coerce.number().nonnegative().default(0),
  pjp: z.string().optional().nullable(),
  joiningYear: z.coerce.number().int().min(2000).max(2100),
  badge: z.enum(['Star', 'Medal', 'Fire', 'OG']).optional(),
});

const nowKarachi = () =>
  new Date(new Date().toLocaleString('en-US', { timeZone: config.timezone }));

const todayIso = () => nowKarachi().toISOString().slice(0, 10);

function walletNumber() {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
}

async function ensureWallet(client, employeeId) {
  const existing = await client.query('SELECT * FROM employee_wallets WHERE employee_id = $1', [employeeId]);
  if (existing.rowCount) return existing.rows[0];
  const today = nowKarachi();
  const result = await client.query(
    `INSERT INTO employee_wallets
       (employee_id, wallet_number, current_month, current_year)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [employeeId, walletNumber(), today.getMonth() + 1, today.getFullYear()],
  );
  return result.rows[0];
}

async function holidayDates(year, month) {
  const result = await query(
    'SELECT holiday_date::text AS holiday_date FROM holidays WHERE year = $1 AND month = $2',
    [year, month],
  );
  return result.rows.map((row) => row.holiday_date);
}

async function activeTarget(employeeId, year, month) {
  const result = await query(
    `SELECT monthly_target
     FROM employee_monthly_targets
     WHERE employee_id = $1 AND target_year = $2 AND target_month = $3
     ORDER BY is_active DESC, assigned_at DESC
     LIMIT 1`,
    [employeeId, year, month],
  );
  return Number(result.rows[0]?.monthly_target ?? 0);
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function xlsxBuffer(rows) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.folder('xl').file('workbook.xml', `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  zip.folder('xl').folder('_rels').file('workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);
  const cells = rows
    .map((row, r) => `<row r="${r + 1}">${row
      .map((cell, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${escapeXml(String(cell))}</t></is></c>`)
      .join('')}</row>`)
    .join('');
  zip.folder('xl').folder('worksheets').file('sheet1.xml', `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${cells}</sheetData>
</worksheet>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'Faizan & Brothers EMS API' }));

app.post(
  '/api/auth/login',
  asyncRoute(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const admin = await query('SELECT *, $1::text AS role FROM admins WHERE lower(email) = lower($2)', [
      'admin',
      body.email,
    ]);
    const employee = admin.rowCount
      ? { rowCount: 0, rows: [] }
      : await query("SELECT *, 'employee'::text AS role FROM employees WHERE lower(email) = lower($1)", [body.email]);
    const user = admin.rows[0] ?? employee.rows[0];
    if (!user || !(await bcrypt.compare(body.password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.role === 'employee' && user.status !== 'active') {
      return res.status(403).json({ error: 'Employee account is not active' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        category: user.category,
        badge: user.badge,
        profileImageUrl: user.profile_image_url,
      },
    });
  }),
);

app.get('/api/me', authRequired, (req, res) => res.json({ user: req.user }));

app.get(
  '/api/dashboard/admin',
  authRequired,
  adminOnly,
  asyncRoute(async (_req, res) => {
    const date = todayIso();
    const [totals, attendance, wallet, kpi, employees] = await Promise.all([
      query("SELECT count(*)::int AS total FROM employees WHERE status = 'active'"),
      query(
        `SELECT
          count(*) FILTER (WHERE status = 'present')::int AS present,
          count(*) FILTER (WHERE status = 'absent')::int AS absent,
          count(*) FILTER (WHERE status = 'half_day')::int AS half_day,
          count(*) FILTER (WHERE status = 'checked_out')::int AS checked_out,
          count(*) FILTER (WHERE status = 'holiday')::int AS holiday
         FROM attendance
         WHERE attendance_date = $1`,
        [date],
      ),
      query('SELECT coalesce(sum(wallet_balance),0)::float AS balance, coalesce(sum(coins),0)::int AS coins FROM employee_wallets'),
      query(
        `SELECT coalesce(sum(achieved),0)::float AS achieved, coalesce(sum(target),0)::float AS target
         FROM kpi_entries
         WHERE date_trunc('month', kpi_date) = date_trunc('month', $1::date)`,
        [date],
      ),
      query(
        `SELECT e.id, e.name, e.category, e.badge, e.profile_image_url,
          coalesce(a.status::text, 'absent') AS attendance_status,
          to_char(a.check_in_at AT TIME ZONE $2, 'HH24:MI') AS check_in_time,
          to_char(a.check_out_at AT TIME ZONE $2, 'HH24:MI') AS check_out_time
         FROM employees e
         LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = $1
         WHERE e.status = 'active'
         ORDER BY e.name
         LIMIT 12`,
        [date, config.timezone],
      ),
    ]);

    const kpiRow = kpi.rows[0];
    const attendanceRow = attendance.rows[0];
    res.set('Cache-Control', 'private, max-age=10');
    return res.json({
      header: 'Welcome to Faizan & Brothers',
      cards: {
        totalEmployees: totals.rows[0].total,
        present: attendanceRow.present,
        absent: attendanceRow.absent,
        halfDay: attendanceRow.half_day,
        kpiSummary: {
          achieved: kpiRow.achieved,
          target: kpiRow.target,
          percentage: kpiPercentage(kpiRow.achieved, kpiRow.target),
        },
        incentiveSummary: incentiveFor('Biscuit', kpiPercentage(kpiRow.achieved, kpiRow.target)),
        walletSummary: wallet.rows[0],
        monthlyTrends: [],
        liveOfficeStatus: {
          totalEmployees: totals.rows[0].total,
          presentToday: attendanceRow.present,
          checkedIn: attendanceRow.present + attendanceRow.half_day,
          checkedOut: attendanceRow.checked_out,
          halfDay: attendanceRow.half_day,
          absent: attendanceRow.absent,
          holiday: attendanceRow.holiday,
          activeEmployees: totals.rows[0].total,
          employees: employees.rows,
        },
      },
    });
  }),
);

app.get(
  '/api/dashboard/employee',
  authRequired,
  asyncRoute(async (req, res) => {
    if (req.user.role !== 'employee') return res.status(403).json({ error: 'Employee access required' });
    const today = nowKarachi();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const [wallet, attendance, kpi, holidays] = await Promise.all([
      query('SELECT * FROM employee_wallets WHERE employee_id = $1', [req.user.id]),
      query(
        `SELECT * FROM attendance
         WHERE employee_id = $1 AND attendance_date >= date_trunc('month', $2::date)
         ORDER BY attendance_date DESC`,
        [req.user.id, todayIso()],
      ),
      query(
        `SELECT coalesce(sum(achieved),0)::float AS achieved, coalesce(sum(target),0)::float AS target
         FROM kpi_entries
         WHERE employee_id = $1 AND date_trunc('month', kpi_date) = date_trunc('month', $2::date)`,
        [req.user.id, todayIso()],
      ),
      holidayDates(year, month),
    ]);
    const target = (await activeTarget(req.user.id, year, month)) || Number(kpi.rows[0].target);
    const achieved = Number(kpi.rows[0].achieved);
    const days = workingDays(year, month, holidays);
    res.set('Cache-Control', 'private, max-age=15');
    return res.json({
      employee: req.user,
      wallet: wallet.rows[0] ?? null,
      attendanceSummary: {
        present: attendance.rows.filter((row) => row.status === 'present' || row.status === 'checked_out').length,
        halfDay: attendance.rows.filter((row) => row.status === 'half_day').length,
        absent: attendance.rows.filter((row) => row.status === 'absent').length,
      },
      kpiSummary: {
        monthlyTarget: target,
        achieved,
        remaining: Math.max(0, target - achieved),
        percentage: kpiPercentage(achieved, target),
        dailyFixed: dailyFixedTarget(target, days),
        dailyLive: dailyFixedTarget(Math.max(0, target - achieved), Math.max(1, days - today.getDate())),
      },
    });
  }),
);

app.get(
  '/api/office-status',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const date = req.query.date ?? todayIso();
    const result = await query(
      `SELECT e.id, e.name, e.category, e.badge, e.profile_image_url,
        coalesce(a.status::text, 'absent') AS attendance_status,
        to_char(a.check_in_at AT TIME ZONE $2, 'HH24:MI') AS check_in_time,
        to_char(a.check_out_at AT TIME ZONE $2, 'HH24:MI') AS check_out_time,
        coalesce(round((sum(k.achieved) / nullif(sum(k.target),0)) * 100, 2), 0)::float AS kpi_progress
       FROM employees e
       LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = $1
       LEFT JOIN kpi_entries k ON k.employee_id = e.id AND date_trunc('month', k.kpi_date) = date_trunc('month', $1::date)
       WHERE e.status = 'active'
       GROUP BY e.id, a.status, a.check_in_at, a.check_out_at
       ORDER BY e.name`,
      [date, config.timezone],
    );
    res.json({ date, employees: result.rows });
  }),
);

app.get(
  '/api/employees',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const status = req.query.status ?? 'active';
    const result = await query(
      `SELECT id, name, email, category, monthly_target, pjp, joining_year, badge, status,
        profile_image_url, profile_image_updated_at, created_at
       FROM employees
       WHERE status = $1
       ORDER BY name`,
      [status],
    );
    res.json({ employees: result.rows });
  }),
);

app.post(
  '/api/employees',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = employeeSchema.extend({ password: z.string().min(4) }).parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);
    const employee = await withTransaction(async (client) => {
      const result = await client.query(
        `INSERT INTO employees
          (name, email, password_hash, category, monthly_target, pjp, joining_year, badge)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id, name, email, category, monthly_target, pjp, joining_year, badge, status`,
        [body.name, body.email, passwordHash, body.category, body.monthlyTarget, body.pjp, body.joiningYear, body.badge ?? 'Star'],
      );
      await ensureWallet(client, result.rows[0].id);
      return result.rows[0];
    });
    res.status(201).json({ employee });
  }),
);

app.patch(
  '/api/employees/:id',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = employeeSchema.partial().parse(req.body);
    const updates = [];
    const values = [];
    const map = {
      name: 'name',
      email: 'email',
      category: 'category',
      monthlyTarget: 'monthly_target',
      pjp: 'pjp',
      joiningYear: 'joining_year',
      badge: 'badge',
    };
    for (const [key, column] of Object.entries(map)) {
      if (body[key] !== undefined) {
        values.push(body[key]);
        updates.push(`${column} = $${values.length}`);
      }
    }
    if (body.password) {
      values.push(await bcrypt.hash(body.password, 12));
      updates.push(`password_hash = $${values.length}`);
    }
    if (!updates.length) return res.status(400).json({ error: 'No employee fields to update' });
    values.push(req.params.id);
    const result = await query(
      `UPDATE employees SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING id, name, email, category, monthly_target, pjp, joining_year, badge, status`,
      values,
    );
    res.json({ employee: result.rows[0] });
  }),
);

app.post('/api/employees/:id/suspend', authRequired, adminOnly, asyncRoute(async (req, res) => {
  const result = await query("UPDATE employees SET status = 'suspended', suspended_at = NOW() WHERE id = $1 RETURNING id, status", [req.params.id]);
  res.json({ employee: result.rows[0] });
}));

app.post('/api/employees/:id/restore', authRequired, adminOnly, asyncRoute(async (req, res) => {
  const result = await query("UPDATE employees SET status = 'active', suspended_at = NULL, deleted_at = NULL WHERE id = $1 RETURNING id, status", [req.params.id]);
  res.json({ employee: result.rows[0] });
}));

app.delete('/api/employees/:id', authRequired, adminOnly, asyncRoute(async (req, res) => {
  const result = await query("UPDATE employees SET status = 'deleted', deleted_at = NOW() WHERE id = $1 RETURNING id, status", [req.params.id]);
  res.json({ employee: result.rows[0] });
}));

app.post(
  '/api/profile-image',
  authRequired,
  upload.single('image'),
  asyncRoute(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Image file is required' });
    const table = req.user.role === 'admin' ? 'admins' : 'employees';
    const imageUrl = `${config.publicBaseUrl}/uploads/${req.file.filename}`;
    await query(`UPDATE ${table} SET profile_image_url = $1, profile_image_updated_at = NOW() WHERE id = $2`, [
      imageUrl,
      req.user.id,
    ]);
    res.json({ profileImageUrl: imageUrl, profileImageUpdatedAt: new Date().toISOString() });
  }),
);

app.delete('/api/profile-image', authRequired, asyncRoute(async (req, res) => {
  const table = req.user.role === 'admin' ? 'admins' : 'employees';
  await query(`UPDATE ${table} SET profile_image_url = NULL, profile_image_updated_at = NOW() WHERE id = $1`, [req.user.id]);
  res.json({ ok: true });
}));

app.post(
  '/api/attendance/check-in',
  authRequired,
  asyncRoute(async (req, res) => {
    if (req.user.role !== 'employee') return res.status(403).json({ error: 'Employee access required' });
    const now = nowKarachi();
    const date = todayIso();
    const savedHoliday = await query('SELECT 1 FROM holidays WHERE holiday_date = $1', [date]);
    if (savedHoliday.rowCount) return res.status(409).json({ error: 'Attendance is hidden on saved holidays' });
    const halfDay = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15);
    const status = halfDay ? 'half_day' : 'present';
    const result = await query(
      `INSERT INTO attendance (employee_id, attendance_date, status, check_in_at, half_day_warning)
       VALUES ($1, $2, $3, NOW(), $4)
       ON CONFLICT (employee_id, attendance_date)
       DO UPDATE SET status = EXCLUDED.status, check_in_at = coalesce(attendance.check_in_at, NOW()), half_day_warning = EXCLUDED.half_day_warning
       RETURNING *`,
      [req.user.id, date, status, halfDay],
    );
    res.json({ attendance: result.rows[0] });
  }),
);

app.post('/api/attendance/check-out', authRequired, asyncRoute(async (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({ error: 'Employee access required' });
  const result = await query(
    `UPDATE attendance SET status = 'checked_out', check_out_at = NOW()
     WHERE employee_id = $1 AND attendance_date = $2
     RETURNING *`,
    [req.user.id, todayIso()],
  );
  if (!result.rowCount) return res.status(409).json({ error: 'Check in before checking out' });
  res.json({ attendance: result.rows[0] });
}));

app.post(
  '/api/holidays',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = z.object({ dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1) }).parse(req.body);
    const inserted = [];
    for (const date of body.dates) {
      const parsed = new Date(`${date}T00:00:00Z`);
      const result = await query(
        `INSERT INTO holidays (holiday_date, month, year, created_by_admin_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (holiday_date) DO UPDATE SET reason = EXCLUDED.reason
         RETURNING *`,
        [date, parsed.getUTCMonth() + 1, parsed.getUTCFullYear(), req.user.id],
      );
      inserted.push(result.rows[0]);
    }
    res.json({ holidays: inserted });
  }),
);

app.get('/api/holidays', authRequired, asyncRoute(async (req, res) => {
  const month = Number(req.query.month ?? nowKarachi().getMonth() + 1);
  const year = Number(req.query.year ?? nowKarachi().getFullYear());
  const result = await query('SELECT * FROM holidays WHERE month = $1 AND year = $2 ORDER BY holiday_date', [month, year]);
  res.json({ holidays: result.rows });
}));

app.post(
  '/api/targets',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = z.object({
      employeeId: z.string().uuid(),
      category: z.enum(['Biscuit', 'Cake', 'Piper', 'Rider']),
      targetMonth: z.coerce.number().int().min(1).max(12),
      targetYear: z.coerce.number().int().min(2000).max(2100),
      monthlyTarget: z.coerce.number().nonnegative(),
    }).parse(req.body);
    const current = nowKarachi();
    const isActive = body.targetYear < current.getFullYear() ||
      (body.targetYear === current.getFullYear() && body.targetMonth <= current.getMonth() + 1);
    const result = await query(
      `INSERT INTO employee_monthly_targets
        (employee_id, category, target_month, target_year, monthly_target, assigned_by_admin_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [body.employeeId, body.category, body.targetMonth, body.targetYear, body.monthlyTarget, req.user.id, isActive],
    );
    res.status(201).json({ target: result.rows[0] });
  }),
);

app.post(
  '/api/kpi',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = z.object({
      employeeId: z.string().uuid(),
      category: z.enum(['Biscuit', 'Cake', 'Piper', 'Rider']),
      kpiDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      achieved: z.coerce.number().nonnegative(),
      target: z.coerce.number().nonnegative(),
    }).parse(req.body);
    const result = await query(
      `INSERT INTO kpi_entries (employee_id, category, kpi_date, achieved, target, created_by_admin_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (employee_id, category, kpi_date, source)
       DO UPDATE SET achieved = EXCLUDED.achieved, target = EXCLUDED.target
       RETURNING *`,
      [body.employeeId, body.category, body.kpiDate, body.achieved, body.target, req.user.id],
    );
    res.status(201).json({ kpi: result.rows[0] });
  }),
);

app.get('/api/kpi', authRequired, asyncRoute(async (req, res) => {
  const month = Number(req.query.month ?? nowKarachi().getMonth() + 1);
  const year = Number(req.query.year ?? nowKarachi().getFullYear());
  const filters = ['extract(month from k.kpi_date) = $1', 'extract(year from k.kpi_date) = $2'];
  const values = [month, year];
  if (req.query.employeeId) {
    values.push(req.query.employeeId);
    filters.push(`k.employee_id = $${values.length}`);
  }
  if (req.query.category) {
    values.push(req.query.category);
    filters.push(`k.category = $${values.length}`);
  }
  const result = await query(
    `SELECT e.name, e.profile_image_url, k.employee_id, k.category,
       sum(k.achieved)::float AS achieved, sum(k.target)::float AS target
     FROM kpi_entries k
     JOIN employees e ON e.id = k.employee_id
     WHERE ${filters.join(' AND ')}
     GROUP BY e.name, e.profile_image_url, k.employee_id, k.category
     ORDER BY achieved DESC`,
    values,
  );
  res.json({ kpis: result.rows.map((row) => ({ ...row, percentage: kpiPercentage(row.achieved, row.target) })) });
}));

app.post(
  '/api/wallet/transactions',
  authRequired,
  adminOnly,
  asyncRoute(async (req, res) => {
    const body = z.object({
      employeeId: z.string().uuid(),
      points: z.coerce.number().int().default(0),
      coins: z.coerce.number().int().optional(),
      balance: z.coerce.number().default(0),
      reason: z.string().min(2),
    }).parse(req.body);
    const today = nowKarachi();
    const result = await withTransaction(async (client) => {
      const wallet = await ensureWallet(client, body.employeeId);
      const coins = body.coins ?? coinsForPoints(body.points);
      const tx = await client.query(
        `INSERT INTO wallet_transactions
          (employee_id, wallet_id, transaction_month, transaction_year, points_delta, coins_delta, balance_delta, reason, created_by_admin_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [body.employeeId, wallet.id, today.getMonth() + 1, today.getFullYear(), body.points, coins, body.balance, body.reason, req.user.id],
      );
      await client.query(
        `UPDATE employee_wallets
         SET points = points + $1, coins = coins + $2, monthly_coins = monthly_coins + $2,
             yearly_coins = yearly_coins + $2, lifetime_coins = lifetime_coins + $2,
             wallet_balance = wallet_balance + $3, rewards = rewards + CASE WHEN $2 > 0 THEN 1 ELSE 0 END
         WHERE id = $4`,
        [body.points, coins, body.balance, wallet.id],
      );
      return tx.rows[0];
    });
    res.status(201).json({ transaction: result });
  }),
);

app.get('/api/wallet', authRequired, asyncRoute(async (req, res) => {
  const employeeId = req.user.role === 'admin' ? req.query.employeeId : req.user.id;
  if (!employeeId) return res.status(400).json({ error: 'employeeId is required for admin wallet lookup' });
  const [wallet, transactions] = await Promise.all([
    query('SELECT * FROM employee_wallets WHERE employee_id = $1', [employeeId]),
    query(
      `SELECT * FROM wallet_transactions
       WHERE employee_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [employeeId],
    ),
  ]);
  res.json({ wallet: wallet.rows[0] ?? null, transactions: transactions.rows });
}));

app.get('/api/leaderboard', authRequired, asyncRoute(async (req, res) => {
  const month = Number(req.query.month ?? nowKarachi().getMonth() + 1);
  const year = Number(req.query.year ?? nowKarachi().getFullYear());
  const result = await query(
    `SELECT e.id, e.name, e.category, e.badge, e.profile_image_url,
       coalesce(w.coins, 0)::int AS coins,
       coalesce(round((sum(k.achieved) / nullif(sum(k.target),0)) * 100, 2), 0)::float AS kpi_percentage
     FROM employees e
     LEFT JOIN employee_wallets w ON w.employee_id = e.id
     LEFT JOIN kpi_entries k ON k.employee_id = e.id
       AND extract(month from k.kpi_date) = $1 AND extract(year from k.kpi_date) = $2
     WHERE e.status = 'active'
     GROUP BY e.id, w.coins
     ORDER BY kpi_percentage DESC, coins DESC, e.name`,
    [month, year],
  );
  res.json({ leaderboard: result.rows.map((row, index) => ({ rank: index + 1, ...row })) });
}));

app.post('/api/salary/generate', authRequired, adminOnly, asyncRoute(async (req, res) => {
  const body = z.object({
    employeeId: z.string().uuid(),
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    pcIncentive: z.coerce.number().default(0),
    badgeBonus: z.coerce.number().default(0),
  }).parse(req.body);
  const [attendance, kpi, employee] = await Promise.all([
    query(
      `SELECT
        count(*) FILTER (WHERE status = 'half_day')::int AS half_days,
        count(*) FILTER (WHERE status = 'absent')::int AS absents
       FROM attendance
       WHERE employee_id = $1 AND extract(month from attendance_date) = $2 AND extract(year from attendance_date) = $3`,
      [body.employeeId, body.month, body.year],
    ),
    query(
      `SELECT coalesce(sum(achieved),0)::float AS achieved, coalesce(sum(target),0)::float AS target
       FROM kpi_entries
       WHERE employee_id = $1 AND extract(month from kpi_date) = $2 AND extract(year from kpi_date) = $3`,
      [body.employeeId, body.month, body.year],
    ),
    query('SELECT category FROM employees WHERE id = $1', [body.employeeId]),
  ]);
  const percentage = kpiPercentage(kpi.rows[0].achieved, kpi.rows[0].target);
  const kpiIncentive = incentiveFor(employee.rows[0]?.category ?? 'Rider', percentage);
  const salary = salaryNet({
    halfDays: attendance.rows[0].half_days,
    absents: attendance.rows[0].absents,
    kpiIncentive,
    pcIncentive: body.pcIncentive,
    badgeBonus: body.badgeBonus,
  });
  const result = await query(
    `INSERT INTO salary_runs
      (employee_id, salary_month, salary_year, basic_salary, petrol, mobile, bike_maintenance, daily_rounds,
       half_day_deduction, absent_deduction, kpi_incentive, pc_incentive, badge_bonus, net_salary)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (employee_id, salary_month, salary_year)
     DO UPDATE SET kpi_incentive = EXCLUDED.kpi_incentive, pc_incentive = EXCLUDED.pc_incentive,
       badge_bonus = EXCLUDED.badge_bonus, net_salary = EXCLUDED.net_salary
     RETURNING *`,
    [
      body.employeeId,
      body.month,
      body.year,
      SALARY_DEFAULTS.basicSalary,
      SALARY_DEFAULTS.petrol,
      SALARY_DEFAULTS.mobile,
      SALARY_DEFAULTS.bikeMaintenance,
      SALARY_DEFAULTS.dailyRounds,
      attendance.rows[0].half_days * SALARY_DEFAULTS.halfDayDeduction,
      attendance.rows[0].absents * SALARY_DEFAULTS.absentDeduction,
      kpiIncentive,
      body.pcIncentive,
      body.badgeBonus,
      salary.netSalary,
    ],
  );
  res.json({ salary: result.rows[0], kpiPercentage: percentage });
}));

app.get('/api/reports/:type.:format', authRequired, adminOnly, asyncRoute(async (req, res) => {
  const type = z.enum(['kpi', 'salary', 'attendance', 'wallet', 'analytics']).parse(req.params.type);
  const format = z.enum(['pdf', 'xlsx']).parse(req.params.format);
  const title = `Faizan & Brothers ${type.toUpperCase()} Report`;
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.pdf"`);
    const doc = new PDFDocument({ margin: 48 });
    doc.pipe(res);
    doc.fontSize(20).text(title);
    doc.moveDown().fontSize(11).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown().text('Data is sourced from PostgreSQL and filtered by the API query parameters.');
    doc.end();
    return;
  }
  const workbook = await xlsxBuffer([
    [title],
    ['Generated', new Date().toISOString()],
    ['Source', 'PostgreSQL'],
  ]);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
  res.end(workbook);
}));

app.post('/api/certificates', authRequired, adminOnly, asyncRoute(async (req, res) => {
  const body = z.object({ employeeId: z.string().uuid(), title: z.string().min(2) }).parse(req.body);
  const result = await query(
    `INSERT INTO certificates (employee_id, title, approved_by, generated_by_admin_id)
     VALUES ($1, $2, 'Hassan Khan', $3)
     RETURNING *`,
    [body.employeeId, body.title, req.user.id],
  );
  res.status(201).json({ certificate: result.rows[0], header: 'Faizan & Brothers LTD branch', footer: 'Approved by Hassan Khan' });
}));

app.use((error, req, res, _next) => {
  req.log?.error({ err: error }, 'request failed');
  if (error instanceof z.ZodError) return res.status(400).json({ error: 'Validation failed', issues: error.issues });
  return res.status(error.status ?? 500).json({ error: error.message ?? 'Unexpected server error' });
});

export { app };
