import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error', err);
});
