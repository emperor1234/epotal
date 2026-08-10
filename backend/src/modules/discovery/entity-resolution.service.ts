import { createHash } from 'node:crypto';

export function buildCanonicalContactKey(input: { fullName: string; companyDomain?: string; companyName?: string }): string | null {
  const companyIdentity = normalizeDomain(input.companyDomain) ?? normalizeText(input.companyName);
  if (!companyIdentity) return null;
  const name = normalizeText(input.fullName);
  if (!name) return null;
  return createHash('sha256').update(`${name}|${companyIdentity}`).digest('hex');
}

export function normalizeDomain(value?: string): string | null {
  if (!value) return null;
  try {
    const parsed = value.includes('://') ? new URL(value) : new URL(`https://${value}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

function normalizeText(value?: string): string | null {
  const normalized = value?.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return normalized || null;
}
