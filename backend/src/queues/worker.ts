import 'dotenv/config';
import { Worker } from 'bullmq';
import { logger } from '../lib/logger';
import { redis } from '../lib/redis';
import { runSearch } from '../modules/discovery/search.service';
import { SEARCH_QUEUE_NAME, SearchJobData } from './search.queue';

const worker = new Worker<SearchJobData>(
  SEARCH_QUEUE_NAME,
  async (job) => {
    logger.info({ jobId: job.id, target: job.data.target }, 'Starting search job');
    const count = await runSearch(job.data.searchQueryId, job.data.target);
    logger.info({ jobId: job.id, count }, 'Search job completed');
    return { count };
  },
  { connection: redis, concurrency: 3 },
);

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Search job failed');
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Search job acknowledged complete');
});

logger.info('Search worker started');

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
