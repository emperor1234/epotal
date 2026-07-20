import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { ScrapeTarget } from '../modules/discovery/ingestion/ingestion-source.interface';

export const SEARCH_QUEUE_NAME = 'search-jobs';

export type SearchJobData = {
  searchQueryId: string;
  userId: string;
  target: ScrapeTarget;
};

export const searchQueue = new Queue<SearchJobData>(SEARCH_QUEUE_NAME, { connection: redis });

export async function enqueueSearchJob(data: SearchJobData) {
  return searchQueue.add('run-search', data, {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86_400 },
  });
}
