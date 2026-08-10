import { prisma } from '../../lib/prisma';
import { getComplianceTier } from '../suppression/suppression.service';
import { createIngestionOrchestrator } from './ingestion.factory';
import { ScrapedCandidate, ScrapeTarget } from './ingestion/ingestion-source.interface';
import { buildCanonicalContactKey } from './entity-resolution.service';

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
  const started = await prisma.searchQuery.updateMany({
    where: { id: searchQueryId, status: 'queued' },
    data: { status: 'running' },
  });
  if (started.count === 0) return 0; // cancelled while waiting in the queue

  const orchestrator = createIngestionOrchestrator();
  let persisted = 0;

  try {
    for await (const batch of orchestrator.run(target)) {
      if (await searchWasCancelled(searchQueryId)) return persisted;
      for (const candidate of batch) {
        if (!candidate.fullName) continue; // business-only record with no staff resolved yet
        const linked = await persistCandidate(searchQueryId, candidate, target);
        if (linked) persisted += 1;
      }
    }

    await prisma.searchQuery.updateMany({
      where: { id: searchQueryId, status: { not: 'cancelled' } },
      data: { status: 'completed', resultCount: persisted },
    });
  } catch (err) {
    await prisma.searchQuery.updateMany({ where: { id: searchQueryId, status: { not: 'cancelled' } }, data: { status: 'failed' } });
    throw err;
  }

  return persisted;
}

async function searchWasCancelled(searchQueryId: string): Promise<boolean> {
  const search = await prisma.searchQuery.findUnique({ where: { id: searchQueryId }, select: { status: true } });
  return search?.status === 'cancelled';
}

async function persistCandidate(searchQueryId: string, candidate: ScrapedCandidate, target: ScrapeTarget): Promise<boolean> {
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

  const canonicalKey = buildCanonicalContactKey(candidate);
  const contact = await prisma.contact.upsert({
    where: canonicalKey
      ? { canonicalKey }
      : { sourceType_sourceUrl_fullName: { sourceType: candidate.sourceType, sourceUrl: candidate.sourceUrl, fullName: candidate.fullName } },
    create: {
      fullName: candidate.fullName,
      firstName,
      lastName,
      jobTitle: candidate.jobTitle,
      companyId: company?.id,
      companyNameHint: candidate.companyName,
      country: target.country,
      industry: target.industry,
      complianceTier: getComplianceTier(target.country),
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      canonicalKey,
      emailAvailability: company ? 'likely_work_email' : 'needs_company',
    },
    update: {
      jobTitle: candidate.jobTitle ?? undefined,
      companyId: company?.id ?? undefined,
      companyNameHint: candidate.companyName ?? undefined,
      emailAvailability: company ? 'likely_work_email' : undefined,
      lastSeenAt: new Date(),
      refreshedAt: new Date(),
    },
  });

  const evidence = await prisma.contactSourceEvidence.createMany({
    data: [{ contactId: contact.id, sourceType: candidate.sourceType, sourceUrl: candidate.sourceUrl }],
    skipDuplicates: true,
  });
  if (evidence.count > 0) await prisma.contact.update({ where: { id: contact.id }, data: { sourceCount: { increment: 1 } } });
  else await prisma.contactSourceEvidence.update({ where: { contactId_sourceUrl: { contactId: contact.id, sourceUrl: candidate.sourceUrl } }, data: { lastSeenAt: new Date() } });

  const result = await prisma.searchResult.createMany({
    data: [{ searchQueryId, contactId: contact.id }],
    skipDuplicates: true,
  });
  return result.count > 0;
}
