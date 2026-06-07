CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE employee_category AS ENUM ('Biscuit', 'Cake', 'Piper', 'Rider');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employee_status AS ENUM ('active', 'suspended', 'deleted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'checked_out', 'holiday');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  badge TEXT DEFAULT 'OG',
  profile_image_url TEXT,
  profile_image_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  category employee_category NOT NULL,
  monthly_target NUMERIC(14,2) NOT NULL DEFAULT 0,
  pjp TEXT,
  joining_year INTEGER NOT NULL CHECK (joining_year BETWEEN 2000 AND 2100),
  badge TEXT DEFAULT 'Star',
  status employee_status NOT NULL DEFAULT 'active',
  profile_image_url TEXT,
  profile_image_updated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  category employee_category NOT NULL,
  target_month INTEGER NOT NULL CHECK (target_month BETWEEN 1 AND 12),
  target_year INTEGER NOT NULL CHECK (target_year BETWEEN 2000 AND 2100),
  monthly_target NUMERIC(14,2) NOT NULL CHECK (monthly_target >= 0),
  assigned_by_admin_id UUID NOT NULL REFERENCES admins(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, category, target_month, target_year, assigned_at)
);

CREATE INDEX IF NOT EXISTS employee_monthly_targets_lookup_idx
  ON employee_monthly_targets(employee_id, target_year, target_month, is_active);

CREATE TABLE IF NOT EXISTS holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  reason TEXT NOT NULL DEFAULT 'Friday Holiday',
  created_by_admin_id UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  attendance_date DATE NOT NULL,
  status attendance_status NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  half_day_warning BOOLEAN NOT NULL DEFAULT FALSE,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS attendance_date_status_idx ON attendance(attendance_date, status);

CREATE TABLE IF NOT EXISTS kpi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  category employee_category NOT NULL,
  kpi_date DATE NOT NULL,
  achieved NUMERIC(14,2) NOT NULL DEFAULT 0,
  target NUMERIC(14,2) NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  created_by_admin_id UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, category, kpi_date, source)
);

CREATE INDEX IF NOT EXISTS kpi_employee_date_idx ON kpi_entries(employee_id, kpi_date);

CREATE TABLE IF NOT EXISTS employee_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL UNIQUE REFERENCES employees(id),
  wallet_number CHAR(16) NOT NULL UNIQUE,
  wallet_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  coins INTEGER NOT NULL DEFAULT 0,
  rewards INTEGER NOT NULL DEFAULT 0,
  monthly_coins INTEGER NOT NULL DEFAULT 0,
  yearly_coins INTEGER NOT NULL DEFAULT 0,
  lifetime_coins INTEGER NOT NULL DEFAULT 0,
  current_month INTEGER NOT NULL,
  current_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  wallet_id UUID NOT NULL REFERENCES employee_wallets(id),
  transaction_month INTEGER NOT NULL CHECK (transaction_month BETWEEN 1 AND 12),
  transaction_year INTEGER NOT NULL CHECK (transaction_year BETWEEN 2000 AND 2100),
  points_delta INTEGER NOT NULL DEFAULT 0,
  coins_delta INTEGER NOT NULL DEFAULT 0,
  balance_delta NUMERIC(14,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_admin_id UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_filter_idx
  ON wallet_transactions(employee_id, transaction_year, transaction_month);

CREATE TABLE IF NOT EXISTS salary_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  salary_month INTEGER NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
  salary_year INTEGER NOT NULL CHECK (salary_year BETWEEN 2000 AND 2100),
  basic_salary NUMERIC(14,2) NOT NULL DEFAULT 20000,
  petrol NUMERIC(14,2) NOT NULL DEFAULT 11625,
  mobile NUMERIC(14,2) NOT NULL DEFAULT 500,
  bike_maintenance NUMERIC(14,2) NOT NULL DEFAULT 1000,
  daily_rounds NUMERIC(14,2) NOT NULL DEFAULT 2600,
  half_day_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
  absent_deduction NUMERIC(14,2) NOT NULL DEFAULT 0,
  kpi_incentive NUMERIC(14,2) NOT NULL DEFAULT 0,
  pc_incentive NUMERIC(14,2) NOT NULL DEFAULT 0,
  badge_bonus NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, salary_month, salary_year)
);

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  badge TEXT NOT NULL CHECK (badge IN ('Star', 'Medal', 'Fire', 'OG')),
  assigned_by_admin_id UUID NOT NULL REFERENCES admins(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submitted_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  title TEXT NOT NULL,
  sheet_url TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('kpi', 'salary', 'attendance', 'wallet', 'analytics')),
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  year INTEGER CHECK (year BETWEEN 2000 AND 2100),
  employee_id UUID REFERENCES employees(id),
  category employee_category,
  file_url TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_admin_id UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  title TEXT NOT NULL,
  certificate_url TEXT,
  approved_by TEXT NOT NULL DEFAULT 'Hassan Khan',
  generated_by_admin_id UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_admins_updated_at ON admins;
CREATE TRIGGER touch_admins_updated_at BEFORE UPDATE ON admins
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_employees_updated_at ON employees;
CREATE TRIGGER touch_employees_updated_at BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_targets_updated_at ON employee_monthly_targets;
CREATE TRIGGER touch_targets_updated_at BEFORE UPDATE ON employee_monthly_targets
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_attendance_updated_at ON attendance;
CREATE TRIGGER touch_attendance_updated_at BEFORE UPDATE ON attendance
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_kpi_entries_updated_at ON kpi_entries;
CREATE TRIGGER touch_kpi_entries_updated_at BEFORE UPDATE ON kpi_entries
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS touch_wallets_updated_at ON employee_wallets;
CREATE TRIGGER touch_wallets_updated_at BEFORE UPDATE ON employee_wallets
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
