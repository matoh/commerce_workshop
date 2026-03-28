import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { config } from '../config.js';
import { Database } from './types.js';

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    max: 10,
  }),
});

export const db = new Kysely<Database>({ dialect });
