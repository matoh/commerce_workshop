import Redis from 'ioredis';
import { config } from './config.js';

export const publisher = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  lazyConnect: true,
});

export const subscriber = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  lazyConnect: true,
});
