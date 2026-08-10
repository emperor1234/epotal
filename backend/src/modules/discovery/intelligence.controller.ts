import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/requireAuth';
import { asyncHandler } from '../../utils/asyncHandler';
import { enqueueSearchJob } from '../../queues/search.queue';
import { createSearchQuery } from './search.service';
import { buildCanonicalContactKey, normalizeDomain } from './entity-resolution.service';

export const intelligenceRouter = Router();
intelligenceRouter.use(requireAuth);

const decisionMakerSchema = z.object({
  company: z.string().trim().min(1).max(120),
  industry: z.string().trim().min(1).max(120).default('Business'),
  country: z.string().trim().min(1).max(120),
  roles: z.array(z.string().trim().min(1).max(80)).min(1).max(12).default(['Founder', 'CEO', 'Director', 'Head']),
  sources: z.array(z.enum(['linkedin', 'facebook', 'instagram', 'x', 'web'])).min(1).optional(),
});

intelligenceRouter.post('/decision-makers', asyncHandler(async (req, res) => {
  const input = decisionMakerSchema.parse(req.body);
  const target = {
    industry: input.industry,
    country: input.country,
    company: input.company,
    seniority: 'Executive',
    keywords: input.roles,
    sources: input.sources,
    includeRelatedTitles: true,
    mode: 'quick' as const,
  };
  const searchQuery = await createSearchQuery(req.userId!, target);
  await enqueueSearchJob({ searchQueryId: searchQuery.id, userId: req.userId!, target });
  res.status(202).json({ searchQuery });
}));

const bulkRecordSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().max(160).optional(),
  companyName: z.string().trim().max(160).optional(),
  companyDomain: z.string().trim().max(255).optional(),
  country: z.string().trim().max(120).optional(),
  industry: z.string().trim().max(120).optional(),
  sourceUrl: z.string().url(),
});

intelligenceRouter.post('/bulk-enrich', asyncHandler(async (req, res) => {
  const records = z.array(bulkRecordSchema).min(1).max(50).parse(req.body?.records);
  const contacts = [];
  for (const record of records) {
    const domain = normalizeDomain(record.companyDomain);
    const company = domain
      ? await prisma.company.upsert({
          where: { domain },
          create: { domain, name: record.companyName ?? domain, country: record.country, industry: record.industry },
          update: { name: record.companyName ?? undefined, country: record.country ?? undefined, industry: record.industry ?? undefined },
        })
      : null;
    const [firstName, ...nameParts] = record.fullName.split(/\s+/);
    const canonicalKey = buildCanonicalContactKey({ ...record, companyDomain: domain ?? undefined });
    const contact = await prisma.contact.upsert({
      where: canonicalKey
        ? { canonicalKey }
        : { sourceType_sourceUrl_fullName: { sourceType: 'user_import', sourceUrl: record.sourceUrl, fullName: record.fullName } },
      create: {
        fullName: record.fullName,
        firstName,
        lastName: nameParts.at(-1) ?? '',
        jobTitle: record.jobTitle,
        companyId: company?.id,
        country: record.country,
        industry: record.industry,
        sourceType: 'user_import',
        sourceUrl: record.sourceUrl,
        canonicalKey,
        emailAvailability: company ? 'likely_work_email' : 'needs_company',
      },
      update: {
        jobTitle: record.jobTitle ?? undefined,
        companyId: company?.id ?? undefined,
        country: record.country ?? undefined,
        industry: record.industry ?? undefined,
        lastSeenAt: new Date(),
      },
      include: { company: true },
    });
    const evidence = await prisma.contactSourceEvidence.createMany({
      data: [{ contactId: contact.id, sourceType: 'user_import', sourceUrl: record.sourceUrl }],
      skipDuplicates: true,
    });
    if (evidence.count) await prisma.contact.update({ where: { id: contact.id }, data: { sourceCount: { increment: 1 } } });
    contacts.push(contact);
  }
  res.status(201).json({ contacts, imported: contacts.length });
}));
