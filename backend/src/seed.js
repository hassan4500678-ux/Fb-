import bcrypt from 'bcryptjs';
import { pool, withTransaction } from './db.js';

function walletNumber(seed) {
  return seed.padEnd(16, '0').slice(0, 16);
}

try {
  await withTransaction(async (client) => {
    const adminPassword = await bcrypt.hash('Hassan', 12);
    const admin = await client.query(
      `INSERT INTO admins (name, email, password_hash, badge)
       VALUES ('Hassan Khan', 'hassanullahkhan989@gmail.com', $1, 'OG')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, badge = EXCLUDED.badge
       RETURNING id`,
      [adminPassword],
    );

    const employeePassword = await bcrypt.hash('Employee123', 12);
    const employees = [
      ['Ali Raza', 'ali.raza@faizanbrothers.com', 'Biscuit', 500000, 'Retail Route A', 2022, 'Fire'],
      ['Bilal Khan', 'bilal.khan@faizanbrothers.com', 'Cake', 420000, 'Retail Route B', 2021, 'Medal'],
      ['Danish Ahmed', 'danish.ahmed@faizanbrothers.com', 'Piper', 800000, 'Wholesale Route', 2020, 'Star'],
      ['Usman Shah', 'usman.shah@faizanbrothers.com', 'Rider', 350000, 'Delivery Route', 2023, 'Star'],
    ];

    for (let index = 0; index < employees.length; index += 1) {
      const [name, email, category, target, pjp, joiningYear, badge] = employees[index];
      const employee = await client.query(
        `INSERT INTO employees (name, email, password_hash, category, monthly_target, pjp, joining_year, badge)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (email) DO UPDATE SET category = EXCLUDED.category, monthly_target = EXCLUDED.monthly_target
         RETURNING id`,
        [name, email, employeePassword, category, target, pjp, joiningYear, badge],
      );

      await client.query(
        `INSERT INTO employee_wallets (employee_id, wallet_number, current_month, current_year, points, coins, monthly_coins, yearly_coins, lifetime_coins)
         VALUES ($1,$2,extract(month from now())::int,extract(year from now())::int,$3,$4,$4,$4,$4)
         ON CONFLICT (employee_id) DO NOTHING`,
        [employee.rows[0].id, walletNumber(String(44440000 + index)), 30 + index * 10, 100 + index * 25],
      );

      await client.query(
        `INSERT INTO employee_monthly_targets
          (employee_id, category, target_month, target_year, monthly_target, assigned_by_admin_id, is_active)
         VALUES ($1,$2,extract(month from now())::int,extract(year from now())::int,$3,$4,true)
         ON CONFLICT DO NOTHING`,
        [employee.rows[0].id, category, target, admin.rows[0].id],
      );
    }
  });

  console.log('Seeded admin login and starter employees.');
} finally {
  await pool.end();
}
