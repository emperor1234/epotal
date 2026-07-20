import IORedis from 'ioredis';
import { env } from '../config/env';

// BullMQ requires maxRetriesPerRequest: null on its own Redis connections.
// This shared connection is used both for app-level caching and passed to
// BullMQ Queue/Worker constructors.
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export async function redisGet(key: string): Promise<string | null> {
  return redis.get(key);
}

export async function redisSetEx(key: string, ttlSeconds: number, value: string): Promise<void> {
  await redis.set(key, value, 'EX', ttlSeconds);
}
