import { app } from './app.js';
import { config } from './config.js';
import { pool } from './db.js';

const server = app.listen(config.port, () => {
  console.log(`Faizan & Brothers EMS API listening on port ${config.port}`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
