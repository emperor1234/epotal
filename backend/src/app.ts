import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiRouter } from './routes/index';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

// Serverless Postgres can take several seconds to resume after idling.
// Keep this above the normal cold-start window so readiness does not flap.
const READINESS_TIMEOUT_MS = 10_000;

async function withTimeout<T>(operation: Promise<T>): Promise<T> {
  return Promise.race([
    operation,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Dependency check timed out')), READINESS_TIMEOUT_MS)),
  ]);
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));

  // Global rate limit as a baseline defense; the reveal endpoint in
  // particular spends real money (credits + verification-provider calls)
  // per request, so it's worth guarding even before auth resolves.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/ready', async (_req, res) => {
    const checks = await Promise.allSettled([
      // A bare SELECT 1 only proves transport/authentication. Query an actual
      // application model so a fresh database without migrations is not
      // incorrectly reported as ready.
      withTimeout(prisma.user.count()),
      withTimeout(redis.ping()),
    ]);
    const dependencies = {
      database: checks[0].status === 'fulfilled' ? 'ok' : 'unavailable',
      redis: checks[1].status === 'fulfilled' ? 'ok' : 'unavailable',
    };
    const ready = Object.values(dependencies).every((status) => status === 'ok');
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', dependencies });
  });

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
