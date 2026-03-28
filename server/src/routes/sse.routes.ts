import { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { subscriber, publisher } from '../redis.js';
import { CHANNEL, BroadcastEvent } from '../utils/broadcast.js';
import { config } from '../config.js';

const clients = new Set<{
  id: string;
  send: (event: BroadcastEvent) => void;
}>();

// Subscribe to Redis channel and fan out to SSE clients
let subscribed = false;

async function ensureSubscribed() {
  if (subscribed) {
    return;
  }
  subscribed = true;

  await subscriber.subscribe(CHANNEL);

  subscriber.on('message', (_channel, message) => {
    const event: BroadcastEvent = JSON.parse(message);
    console.log(`[${config.instanceId}] Received event: ${event.type} (from ${event.instanceId}), forwarding to ${clients.size} clients`);

    for (const client of clients) {
      client.send(event);
    }
  });
}

const sseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/events', async (request: FastifyRequest, reply) => {
    await ensureSubscribed();

    // SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Instance-Id': config.instanceId,
    });

    const clientId = `${config.instanceId}-${Date.now()}`;

    const client = {
      id: clientId,
      send: (event: BroadcastEvent) => {
        reply.raw.write(`id: ${event.id}\n`);
        reply.raw.write(`event: ${event.type}\n`);
        reply.raw.write(`data: ${JSON.stringify(event.data)}\n\n`);
      },
    };

    clients.add(client);
    console.log(`[${config.instanceId}] SSE client connected: ${clientId} (total: ${clients.size})`);

    // Replay missed events on reconnection
    const lastEventId = request.headers['last-event-id'];
    if (lastEventId) {
      const allEvents = await publisher.zrange('commerce:event_log', 0, -1);
      let replaying = false;

      for (const raw of allEvents) {
        const event: BroadcastEvent = JSON.parse(raw);
        if (replaying) {
          client.send(event);
        }
        if (event.id === lastEventId) {
          replaying = true;
        }
      }
    }

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 30_000);

    // Cleanup on disconnect
    request.raw.on('close', () => {
      clients.delete(client);
      clearInterval(heartbeat);
      console.log(`[${config.instanceId}] SSE client disconnected: ${clientId} (total: ${clients.size})`);
    });
  });
};

export default sseRoutes;
