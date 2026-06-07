import 'dotenv/config';

const required = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5432/faizan_brothers_ems'),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-this-secret-before-release'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 8080}`,
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  timezone: 'Asia/Karachi',
};

export const isProduction = config.env === 'production';
