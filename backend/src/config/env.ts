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

  // Self-hosted Reacher HTTP backend. Leave empty to disable it and use the
  // optional ZeroBounce fallback instead.
  REACHER_URL: z.union([z.literal(''), z.string().url()]).default(''),
  ZEROBOUNCE_API_KEY: z.string().optional().default(''),

  SCRAPE_DELAY_MIN_MS: z.coerce.number().default(1500),
  SCRAPE_DELAY_MAX_MS: z.coerce.number().default(4000),

  // Self-hosted SearXNG fallback — must have `json` enabled under
  // `search.formats` in its settings.yml (disabled by default).
  SEARXNG_URL: z.string().url(),
  // Primary official search provider. When it is unavailable or returns no
  // results, discovery and company-domain resolution fall back to SearXNG.
  BRAVE_SEARCH_API_KEY: z.string().optional().default(''),
  // Public Overpass API (places/business step) — free, no key needed.
  OVERPASS_API_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),
  // Business directories and Overpass are supplemental and frequently block
  // datacenter traffic. Keep them off unless deployment infrastructure has
  // been prepared for those sources; local/imported contacts and public
  // search continue to work normally.
  ENABLE_BUSINESS_SOURCES: z.coerce.boolean().default(false),

  REVEAL_CREDIT_COST: z.coerce.number().default(1),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsed.data;
