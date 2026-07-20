import { prisma } from '../../../lib/prisma';

export class CompanyPatternCacheService {
  async getPattern(companyDomain: string): Promise<{ template: string; confidence: number } | null> {
    const company = await prisma.company.findUnique({
      where: { domain: companyDomain },
      include: { emailPattern: true },
    });
    if (!company?.emailPattern) return null;
    return { template: company.emailPattern.template, confidence: company.emailPattern.confidence };
  }

  // Called once a reveal confirms a mailbox as 'valid' — each confirmation
  // makes the *next* guess for this domain skip straight to the known
  // pattern instead of trying all templates cold (SYSTEM_DESIGN.md Section 5).
  async recordConfirmedPattern(companyDomain: string, template: string): Promise<void> {
    const company = await prisma.company.upsert({
      where: { domain: companyDomain },
      create: { domain: companyDomain, name: companyDomain },
      update: {},
    });

    const existing = await prisma.companyEmailPattern.findUnique({ where: { companyId: company.id } });

    if (!existing) {
      await prisma.companyEmailPattern.create({
        data: { companyId: company.id, template, confidence: 0.75, sampleSize: 1 },
      });
      return;
    }

    if (existing.template === template) {
      const sampleSize = existing.sampleSize + 1;
      await prisma.companyEmailPattern.update({
        where: { companyId: company.id },
        data: { sampleSize, confidence: Math.min(0.98, existing.confidence + 0.02) },
      });
    } else {
      // Conflicting pattern observed for the same domain — a company may use
      // more than one convention. Keep the higher-confidence one but don't
      // overwrite blindly.
      if (existing.confidence < 0.6) {
        await prisma.companyEmailPattern.update({
          where: { companyId: company.id },
          data: { template, confidence: 0.6, sampleSize: 1 },
        });
      }
    }
  }
}
