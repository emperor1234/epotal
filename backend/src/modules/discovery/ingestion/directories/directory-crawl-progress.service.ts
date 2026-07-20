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
    await prisma.directoryCrawlProgress.update({
      where: { directoryId_industrySlug_locationSlug: key },
      data: { status: 'complete' },
    });
  }
}
