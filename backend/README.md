# ReachIQ Backend (Express)

Express + TypeScript port of the ReachIQ backend from `SYSTEM_DESIGN.md` (originally spec'd for NestJS — this is the same architecture on Express).

## Stack

- Express 5, TypeScript
- PostgreSQL via Prisma 5
- Redis via ioredis (cache + BullMQ transport)
- BullMQ for async search jobs
- Zod for request validation
- Pino for structured logging

## Layout

```
src/
  app.ts                 # Express app (middleware, routes, error handling)
  server.ts              # HTTP server entrypoint
  config/env.ts           # Zod-validated environment config
  lib/                     # prisma, redis, logger, encryption, ApiError
  middleware/              # requireAuth, errorHandler
  routes/index.ts          # mounts all module routers under /api
  modules/
    auth/                  # sign-up/in, refresh-token rotation, /me
    credits/                # credit wallet + reservation saga (reveal billing)
    suppression/             # suppression list + country compliance tiers
    discovery/
      ingestion/              # IngestionSource interface + Google Search/Maps,
                               # company-site, and directory scrapers
      ingestion-orchestrator.service.ts
      email-resolution/        # pattern-guess resolver + email verification
      search.service.ts        # persists scraped candidates as Contacts
      search.controller.ts
    contacts/                # contact reveal saga, listing, AI summary
    ai/                      # BYOK OpenAI key storage + description generation
queues/
    search.queue.ts           # BullMQ queue definition
    worker.ts                 # standalone worker process (run separately)
```

## Running locally

Requires a local Postgres and Redis (or point `DATABASE_URL`/`REDIS_URL` at hosted ones).

```bash
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, and ENCRYPTION_KEY_BASE64 (32 random bytes, base64):
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

npm run prisma:migrate   # creates tables
npm run dev               # API server on :4000
npm run worker             # separate process: consumes the search queue
```

## API surface

All routes are mounted under `/api` and (except `/api/auth/*`) require `Authorization: Bearer <accessToken>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/sign-up` | Create account, returns access + refresh tokens |
| POST | `/api/auth/sign-in` | Sign in |
| POST | `/api/auth/refresh` | Rotate a refresh token for a new access token |
| POST | `/api/auth/sign-out` | Revoke a refresh token |
| GET | `/api/me` | Current user + wallet |
| POST | `/api/searches` | Enqueue a search job (industry/country/keywords/seniority) |
| GET | `/api/searches/:id` | Poll search job status |
| GET | `/api/searches/:id/results` | Fetch matched contacts for a completed search |
| GET | `/api/contacts/:id` | Contact detail |
| GET | `/api/contacts/:id/summary` | AI (or templated) professional summary |
| POST | `/api/contacts/:id/reveal` | Reveal an email (credit-gated saga) |
| GET | `/api/credits/wallet` | Credit balance |
| GET/PUT/DELETE | `/api/ai/key` | Manage BYOK OpenAI key (AES-256-GCM at rest) |
| GET/POST/DELETE | `/api/suppression` | Manage the suppression list |

## Notes on scope

This ports the architecture and working logic from the design doc's TypeScript
snippets (pattern-guess algorithm, verification caching, credit reservation
saga, directory crawl checkpointing, BYOK encryption) faithfully. Two pieces
are intentionally left as documented seams rather than fully implemented,
matching the design doc itself:

- **Headless-browser rendering** (`ProxiedHttpClient.fetchViaHeadlessBrowser`) —
  needed for JS-rendered pages like Google Maps. Wire up Playwright/Puppeteer
  here for your deployment target.
- **Real proxy pool** (`ingestion/proxied-http-client.ts`) — ships with an
  in-memory placeholder; swap in a residential proxy vendor before scraping
  at any real volume (see `SYSTEM_DESIGN.md` Section 3.1 for the buy-vs-build
  tradeoff against Google's official Search/Places APIs).
