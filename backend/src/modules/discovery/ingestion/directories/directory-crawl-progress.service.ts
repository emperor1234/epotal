import { prisma } from '../../../../lib/prisma';

type CrawlKey = { directoryId: string; industrySlug: string; locationSlug: string };

export class DirectoryCrawlProgressService {
  async getResumePage(key: CrawlKey): Promise<number> {
    const record = await prisma.directoryCrawlProgress.findUnique({
      where: { directoryId_industrySlug_locationSlug: key },
    });
    return record?.lastPage ?? 0;
  }

  async saveResumePage(key: CrawlKey, page: number): Promise<void> {
    await prisma.directoryCrawlProgress.upsert({
      where: { directoryId_industrySlug_locationSlug: key },
      create: { ...key, lastPage: page },
      update: { lastPage: page },
    });
  }

  async markComplete(key: CrawlKey): Promise<void> {
    // A directory can be blocked before the first successful page is
    // checkpointed. Upsert here so finishing/skipping that crawl is
    // idempotent instead of throwing P2025 for a missing progress row.
    await prisma.directoryCrawlProgress.upsert({
      where: { directoryId_industrySlug_locationSlug: key },
      create: { ...key, lastPage: 0, status: 'complete' },
      update: { status: 'complete' },
    });
  }
}
