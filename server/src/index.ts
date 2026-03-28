import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { pool } from './db.js';
import { publisher, subscriber } from './redis.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

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
