import { prisma } from '../../lib/prisma';

// Country -> compliance tier lookup (SYSTEM_DESIGN.md Section 3.2). This is a
// deliberately small starter table — extend as new jurisdictions are reviewed.
const COMPLIANCE_TIER_BY_COUNTRY: Record<string, 'STANDARD' | 'CAUTION' | 'RESTRICTED'> = {
  'United States': 'STANDARD',
  'United Kingdom': 'STANDARD',
  Canada: 'CAUTION', // CASL — narrower implied consent than CAN-SPAM
  Germany: 'CAUTION', // GDPR/EU — legitimate-interest basis required
  France: 'CAUTION',
  'European Union': 'CAUTION',
};

export function getComplianceTier(country: string | null | undefined): 'STANDARD' | 'CAUTION' | 'RESTRICTED' {
  if (!country) return 'STANDARD';
  return COMPLIANCE_TIER_BY_COUNTRY[country] ?? 'STANDARD';
}

// Checked before every reveal, independent of which ingestion source supplied
// the contact — once suppressed, always suppressed (Section 3.3).
export async function isSuppressed(email: string): Promise<boolean> {
  const entry = await prisma.suppressionEntry.findUnique({ where: { email: email.toLowerCase() } });
  return entry !== null;
}

export async function addSuppression(email: string, reason: string) {
  return prisma.suppressionEntry.upsert({
    where: { email: email.toLowerCase() },
    create: { email: email.toLowerCase(), reason },
    update: { reason },
  });
}

export async function removeSuppression(email: string) {
  await prisma.suppressionEntry.deleteMany({ where: { email: email.toLowerCase() } });
}

export async function listSuppressions() {
  return prisma.suppressionEntry.findMany({ orderBy: { createdAt: 'desc' } });
}
