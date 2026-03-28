import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { pool } from './db.js';
import { publisher, subscriber } from './redis.js';
import { errorHandler } from './middleware/errors.js';
import { productRoutes } from './routes/products.routes.js';
import { salesRoutes } from './routes/sales.routes.js';
import { reservationRoutes } from './routes/reservations.routes.js';
import { expireStale } from './services/reservation.service.js';

const app = Fastify({ logger: true });

app.setErrorHandler(errorHandler);

await app.register(cors, {
  origin: true,
});

// Add instance ID to all responses
app.addHook('onSend', async (_request, reply) => {
  reply.header('X-Instance-Id', config.instanceId);
});

// Register routes
await app.register(productRoutes);
await app.register(salesRoutes);
await app.register(reservationRoutes);

// Health check
app.get('/api/health', async () => {
  const dbResult = await pool.query('SELECT NOW() AS now');
  const redisOk = publisher.status === 'ready' ? 'connected' : publisher.status;

  return {
    status: 'ok',
    instanceId: config.instanceId,
    timestamp: dbResult.rows[0].now,
    redis: redisOk,
    connections: {
      db: pool.totalCount,
      dbIdle: pool.idleCount,
    },
  };
});

// Startup
async function start() {
  try {
    // Connect Redis
    await publisher.connect();
    await subscriber.connect();
    console.log(`[${config.instanceId}] Redis connected`);

    // Verify DB
    await pool.query('SELECT 1');
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
  await pool.end();
  publisher.disconnect();
  subscriber.disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
