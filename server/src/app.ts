import Fastify from 'fastify';
import cors from '@fastify/cors';
import { sql } from 'kysely';
import { config } from './config.js';
import { db, pool } from './db/index.js';
import { publisher } from './redis.js';
import { errorHandler } from './middleware/errors.js';
import routes from './routes/index.js';

export async function buildApp() {
  const app = Fastify({ logger: false });

  app.setErrorHandler(errorHandler);

  await app.register(cors, { origin: true });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Instance-Id', config.instanceId);
  });

  await app.register(routes);

  app.get('/api/health', async () => {
    const result = await sql<{ now: string }>`SELECT NOW() AS now`.execute(db);
    const redisOk = publisher.status === 'ready' ? 'connected' : publisher.status;

    return {
      status: 'ok',
      instanceId: config.instanceId,
      timestamp: result.rows[0].now,
      redis: redisOk,
      connections: {
        db: pool.totalCount,
        dbIdle: pool.idleCount,
      },
    };
  });

  return app;
}
