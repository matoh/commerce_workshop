import { publisher } from '../redis.js';
import { config } from '../config.js';

const CHANNEL = 'commerce:events';
let eventCounter = 0;

export interface BroadcastEvent {
  id: string;
  type: string;
  data: unknown;
  instanceId: string;
  timestamp: string;
}

export async function broadcast(type: string, data: unknown) {
  eventCounter++;
  const event: BroadcastEvent = {
    id: `${config.instanceId}-${eventCounter}`,
    type,
    data,
    instanceId: config.instanceId,
    timestamp: new Date().toISOString(),
  };

  console.log(`[${config.instanceId}] Broadcasting ${type}`, data);

  // Publish to Redis for all instances
  await publisher.publish(CHANNEL, JSON.stringify(event));

  // Store in sorted set for replay (keep last 1000 events)
  const score = Date.now();
  await publisher.zadd('commerce:event_log', score, JSON.stringify(event));
  await publisher.zremrangebyrank('commerce:event_log', 0, -1001);
}

export { CHANNEL };
