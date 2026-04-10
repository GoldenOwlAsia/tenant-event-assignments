import type { ConnectionOptions } from 'bullmq';

export function getBullRedisConnection(): ConnectionOptions {
  return {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT),
  };
}
