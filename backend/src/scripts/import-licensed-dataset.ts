import { createReadStream } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { parse } from 'csv-parse';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getComplianceTier } from '../modules/suppression/suppression.service';
import { buildCanonicalContactKey, normalizeDomain } from '../modules/discovery/entity-resolution.service';

type RawRow = Record<string, unknown>;
type ImportRow = {
  fullName?: string;
  jobTitle?: string;
  companyName: string;
  companyDomain: string;
  industry?: string;
  country?: string;
  sizeRange?: string;
  sourceUrl?: string;
};

const args = readArgs(process.argv.slice(2));
const config = z.object({
  file: z.string().min(1),
  name: z.string().min(1),
  source: z.string().url(),
  license: z.string().url(),
  licenseName: z.string().min(1),
  format: z.enum(['csv', 'ndjson']).optional(),
}).parse(args);
const filePath = resolve(config.file);
const format = config.format ?? (filePath.endsWith('.ndjson') || filePath.endsWith('.jsonl') ? 'ndjson' : 'csv');

async function main() {
  const datasetImport = await prisma.datasetImport.create({
    data: { name: config.name, sourceUrl: config.source, licenseUrl: config.license, licenseName: config.licenseName, filePath, format },
  });
  let processed = 0;
  let imported = 0;
  let rejected = 0;
  try {
    for await (const raw of streamRows(filePath, format)) {
      processed += 1;
      const row = normalizeRow(raw);
      if (!row) {
        rejected += 1;
      } else {
        await importRow(row, datasetImport.id);
        imported += 1;
      }
      if (processed % 500 === 0) {
        await prisma.datasetImport.update({ where: { id: datasetImport.id }, data: { processed, imported, rejected } });
        process.stdout.write(`\rProcessed ${processed.toLocaleString()} rows`);
      }
    }
    await prisma.datasetImport.update({
      where: { id: datasetImport.id },
      data: { status: 'completed', processed, imported, rejected, completedAt: new Date() },
    });
    process.stdout.write(`\nImported ${imported.toLocaleString()} of ${processed.toLocaleString()} rows (${rejected.toLocaleString()} rejected).\n`);
  } catch (error) {
    await prisma.datasetImport.update({
      where: { id: datasetImport.id },
      data: { status: 'failed', processed, imported, rejected, error: error instanceof Error ? error.message : String(error), completedAt: new Date() },
    });
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function importRow(row: ImportRow, datasetImportId: string) {
  const company = await prisma.company.upsert({
    where: { domain: row.companyDomain },
    create: { domain: row.companyDomain, name: row.companyName, industry: row.industry, country: row.country, sizeRange: row.sizeRange },
    update: { name: row.companyName, industry: row.industry ?? undefined, country: row.country ?? undefined, sizeRange: row.sizeRange ?? undefined },
  });
  await prisma.companySourceEvidence.upsert({
    where: { companyId_sourceUrl: { companyId: company.id, sourceUrl: row.sourceUrl ?? config.source } },
    create: { companyId: company.id, datasetImportId, sourceUrl: row.sourceUrl ?? config.source, licenseUrl: config.license },
    update: { lastSeenAt: new Date(), datasetImportId, licenseUrl: config.license },
  });
  if (!row.fullName) return;

  const [firstName, ...nameParts] = row.fullName.split(/\s+/);
  const canonicalKey = buildCanonicalContactKey({ fullName: row.fullName, companyDomain: row.companyDomain });
  if (!canonicalKey) return;
  const sourceUrl = row.sourceUrl ?? config.source;
  const contact = await prisma.contact.upsert({
    where: { canonicalKey },
    create: {
      fullName: row.fullName,
      firstName,
      lastName: nameParts.at(-1) ?? '',
      jobTitle: row.jobTitle,
      companyId: company.id,
      country: row.country,
      industry: row.industry,
      complianceTier: getComplianceTier(row.country ?? ''),
      sourceType: 'licensed_dataset',
      sourceUrl,
      canonicalKey,
      emailAvailability: 'likely_work_email',
    },
    update: {
      jobTitle: row.jobTitle ?? undefined,
      companyId: company.id,
      country: row.country ?? undefined,
      industry: row.industry ?? undefined,
      lastSeenAt: new Date(),
      refreshedAt: new Date(),
    },
  });
  const evidence = await prisma.contactSourceEvidence.createMany({
    data: [{ contactId: contact.id, sourceType: 'licensed_dataset', sourceUrl }],
    skipDuplicates: true,
  });
  if (evidence.count) await prisma.contact.update({ where: { id: contact.id }, data: { sourceCount: { increment: 1 } } });
  else await prisma.contactSourceEvidence.update({ where: { contactId_sourceUrl: { contactId: contact.id, sourceUrl } }, data: { lastSeenAt: new Date() } });
}

async function* streamRows(path: string, kind: 'csv' | 'ndjson'): AsyncGenerator<RawRow> {
  if (kind === 'csv') {
    const parser = createReadStream(path).pipe(parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true, trim: true }));
    for await (const row of parser) yield row as RawRow;
    return;
  }
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of lines) if (line.trim()) yield JSON.parse(line) as RawRow;
}

function normalizeRow(raw: RawRow): ImportRow | null {
  const value = (...keys: string[]) => {
    for (const key of keys) {
      const found = raw[key];
      if (typeof found === 'string' && found.trim()) return found.trim();
    }
    return undefined;
  };
  const fullName = value('full_name', 'fullName', 'person_name', 'employee_name');
  const companyName = value('company_name', 'companyName', 'company', 'organization_name') ?? (!fullName ? value('name') : undefined);
  const companyDomain = normalizeDomain(value('company_domain', 'companyDomain', 'domain', 'website', 'company_website'));
  if (!companyName || !companyDomain) return null;
  return {
    fullName,
    jobTitle: value('job_title', 'jobTitle', 'title', 'position'),
    companyName,
    companyDomain,
    industry: value('industry', 'company_industry'),
    country: value('country', 'company_country', 'location_country'),
    sizeRange: value('size_range', 'sizeRange', 'company_size', 'employee_count_range'),
    sourceUrl: value('source_url', 'sourceUrl', 'profile_url', 'url'),
  };
}

function readArgs(values: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index]?.replace(/^--/, '').replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    const value = values[index + 1];
    if (key && value) result[key] = value;
  }
  return result;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
