import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { startSearchWorker } from './queues/worker';

async function main() {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`ReachIQ backend listening on port ${env.PORT}`);
  });

  const worker = startSearchWorker();

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close();
    await Promise.all([worker.close(), prisma.$disconnect(), redis.quit()]);
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
