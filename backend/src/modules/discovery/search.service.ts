import { prisma } from '../../lib/prisma';
import { getComplianceTier } from '../suppression/suppression.service';
import { createIngestionOrchestrator } from './ingestion.factory';
import { ScrapedCandidate, ScrapeTarget } from './ingestion/ingestion-source.interface';

export async function createSearchQuery(userId: string, target: ScrapeTarget) {
  return prisma.searchQuery.create({
    data: { userId, filters: target as object, status: 'queued' },
  });
}

// Runs the full ingestion pipeline for one search and persists every
// candidate with at least a name as a Contact row. This is what a BullMQ
// worker calls out-of-request (Section 9) — search fans out across scraping
// sources with multi-second-per-page latency, so it never runs inline on
// an HTTP request.
export async function runSearch(searchQueryId: string, target: ScrapeTarget): Promise<number> {
  await prisma.searchQuery.update({ where: { id: searchQueryId }, data: { status: 'running' } });

  const orchestrator = createIngestionOrchestrator();
  let persisted = 0;

  try {
    for await (const batch of orchestrator.run(target)) {
      for (const candidate of batch) {
        if (!candidate.fullName) continue; // business-only record with no staff resolved yet
        await persistCandidate(candidate, target);
        persisted += 1;
      }
    }

    await prisma.searchQuery.update({
      where: { id: searchQueryId },
      data: { status: 'completed', resultCount: persisted },
    });
  } catch (err) {
    await prisma.searchQuery.update({ where: { id: searchQueryId }, data: { status: 'failed' } });
    throw err;
  }

  return persisted;
}

async function persistCandidate(candidate: ScrapedCandidate, target: ScrapeTarget) {
  const [firstName, ...rest] = candidate.fullName.trim().split(/\s+/);
  const lastName = rest[rest.length - 1] ?? '';

  const company = candidate.companyDomain
    ? await prisma.company.upsert({
        where: { domain: candidate.companyDomain },
        create: {
          domain: candidate.companyDomain,
          name: candidate.companyName ?? candidate.companyDomain,
          industry: target.industry,
          country: target.country,
        },
        update: {},
      })
    : null;

  await prisma.contact.upsert({
    where: {
      sourceType_sourceUrl_fullName: {
        sourceType: candidate.sourceType,
        sourceUrl: candidate.sourceUrl,
        fullName: candidate.fullName,
      },
    },
    create: {
      fullName: candidate.fullName,
      firstName,
      lastName,
      jobTitle: candidate.jobTitle,
      companyId: company?.id,
      country: target.country,
      industry: target.industry,
      complianceTier: getComplianceTier(target.country),
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
    },
    update: {
      jobTitle: candidate.jobTitle ?? undefined,
    },
  });
}
