export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: '0.0.0.0',
  instanceId: process.env.INSTANCE_ID || 'api-local',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'commerce',
    user: process.env.DB_USER || 'commerce',
    password: process.env.DB_PASSWORD || 'commerce',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
};
