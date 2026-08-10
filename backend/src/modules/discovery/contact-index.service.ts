import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { CompanyDomainResolver } from './company-domain-resolver.service';

const resolver = new CompanyDomainResolver();
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

export async function refreshStaleContactIndex(limit = 50): Promise<number> {
  const contacts = await prisma.contact.findMany({
    where: { refreshedAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } },
    include: { company: true },
    orderBy: { refreshedAt: 'asc' },
    take: limit,
  });
  let refreshed = 0;
  for (const contact of contacts) {
    let companyId = contact.companyId;
    let availability = contact.company ? 'likely_work_email' : 'needs_company';
    if (!contact.company) {
      const resolved = await resolver.resolve({ fullName: contact.fullName, jobTitle: contact.jobTitle, companyName: contact.companyNameHint });
      if (resolved) {
        const company = await prisma.company.upsert({
          where: { domain: resolved.domain },
          create: { domain: resolved.domain, name: resolved.companyName, country: contact.country, industry: contact.industry },
          update: {},
        });
        companyId = company.id;
        availability = 'likely_work_email';
      }
    }
    await prisma.contact.update({ where: { id: contact.id }, data: { companyId, emailAvailability: availability, refreshedAt: new Date() } });
    refreshed += 1;
  }
  return refreshed;
}

export function startContactIndexMaintenance(): () => void {
  const run = () => void refreshStaleContactIndex().then((count) => {
    if (count) logger.info({ count }, 'Refreshed stale contact-index records');
  }).catch((err) => logger.error({ err }, 'Contact-index refresh failed'));
  const timer = setInterval(run, REFRESH_INTERVAL_MS);
  timer.unref();
  run();
  return () => clearInterval(timer);
}
