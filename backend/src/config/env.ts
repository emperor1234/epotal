import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  ENCRYPTION_KEY_BASE64: z.string().min(1),

  ZEROBOUNCE_API_KEY: z.string().optional().default(''),

  SCRAPE_DELAY_MIN_MS: z.coerce.number().default(1500),
  SCRAPE_DELAY_MAX_MS: z.coerce.number().default(4000),

  // Self-hosted SearXNG instance (search step) — must have `json` enabled
  // under `search.formats` in its settings.yml (disabled by default).
  SEARXNG_URL: z.string().url(),
  // Public Overpass API (places/business step) — free, no key needed.
  OVERPASS_API_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),

  REVEAL_CREDIT_COST: z.coerce.number().default(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
