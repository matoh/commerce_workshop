import { sql } from 'kysely';
import { config } from './config.js';
import { db } from './db/index.js';
import { publisher, subscriber } from './redis.js';
import { expireStale } from './services/reservation.service.js';
import { buildApp } from './app.js';

const app = await buildApp();

// Startup
async function start() {
  try {
    // Connect Redis
    await publisher.connect();
    await subscriber.connect();
    console.log(`[${config.instanceId}] Redis connected`);

    // Verify DB
    await sql`SELECT 1`.execute(db);
    console.log(`[${config.instanceId}] PostgreSQL connected`);

    // Background job: expire stale reservations every 60s
    setInterval(async () => {
      try {
        const expired = await expireStale();
        if (expired.length > 0) {
          console.log(`[${config.instanceId}] Expired ${expired.length} reservations`);
        }
      } catch (err) {
        console.error(`[${config.instanceId}] Reservation cleanup error:`, err);
      }
    }, 60_000);

    await app.listen({ port: config.port, host: config.host });
    console.log(`[${config.instanceId}] Server listening on port ${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async () => {
  console.log(`[${config.instanceId}] Shutting down...`);
  await app.close();
  await db.destroy();
  publisher.disconnect();
  subscriber.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
