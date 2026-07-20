import { CompanyPatternCacheService } from './company-pattern-cache.service';
import { EmailVerificationService } from './email-verification.service';

export interface EmailCandidateInput {
  fullName: string;
  companyDomain?: string;
}

export interface EmailResolutionResult {
  email: string;
  confidence: number;
  pattern?: string;
  verificationStatus: 'valid' | 'catch_all' | 'unknown';
}

interface PatternTemplate {
  id: string;
  build: (first: string, last: string) => string;
  weight: number;
}

// Weights are approximate industry norms for first.last-style corporate
// email conventions; CompanyPatternCacheService recalibrates per-domain
// confidence from actual confirmed reveals over time.
const PATTERN_TEMPLATES: PatternTemplate[] = [
  { id: '{first}.{last}', build: (f, l) => `${f}.${l}`, weight: 0.45 },
  { id: '{first}{last}', build: (f, l) => `${f}${l}`, weight: 0.2 },
  { id: '{f}{last}', build: (f, l) => `${f[0]}${l}`, weight: 0.15 },
  { id: '{first}', build: (f) => f, weight: 0.08 },
  { id: '{last}.{first}', build: (f, l) => `${l}.${f}`, weight: 0.05 },
  { id: '{f}.{last}', build: (f, l) => `${f[0]}.${l}`, weight: 0.04 },
  { id: '{first}_{last}', build: (f, l) => `${f}_${l}`, weight: 0.03 },
];

function normalize(part: string): string {
  return part
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (José -> jose)
    .replace(/[^a-z0-9]/g, '');
}

export class PatternGuessResolver {
  readonly name = 'pattern-guess';

  constructor(
    private readonly patternCache: CompanyPatternCacheService,
    private readonly verifier: EmailVerificationService,
  ) {}

  async resolve(input: EmailCandidateInput): Promise<EmailResolutionResult | null> {
    if (!input.companyDomain) return null;

    const [firstRaw, ...restRaw] = input.fullName.trim().split(/\s+/);
    const first = normalize(firstRaw ?? '');
    const last = normalize(restRaw[restRaw.length - 1] ?? '');
    if (!first) return null;

    const known = await this.patternCache.getPattern(input.companyDomain);
    const candidates = known
      ? [{ id: known.template, build: this.templateBuilder(known.template), weight: 1 }]
      : [...PATTERN_TEMPLATES].sort((a, b) => b.weight - a.weight);

    for (const template of candidates) {
      const localPart = template.build(first, last);
      if (!localPart) continue;

      const candidateEmail = `${localPart}@${input.companyDomain}`;
      const verification = await this.verifier.verify(candidateEmail);

      if (verification.status === 'valid') {
        await this.patternCache.recordConfirmedPattern(input.companyDomain, template.id);
        return {
          email: candidateEmail,
          confidence: known ? 0.95 : 0.75,
          pattern: template.id,
          verificationStatus: 'valid',
        };
      }

      if (verification.status === 'catch_all') {
        // Domain accepts anything — we can't be certain this exact mailbox
        // exists. Keep trying other templates first on the unknown-pattern
        // branch; if this *is* the known pattern, just return it.
        if (known) {
          return {
            email: candidateEmail,
            confidence: 0.55,
            pattern: template.id,
            verificationStatus: 'catch_all',
          };
        }
        continue;
      }
      // 'unknown'/invalid -> try next template
    }

    return null;
  }

  private templateBuilder(templateId: string): (f: string, l: string) => string {
    const found = PATTERN_TEMPLATES.find((t) => t.id === templateId);
    if (found) return found.build;
    return (f, l) => templateId.replace('{first}', f).replace('{last}', l);
  }
}
