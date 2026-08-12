import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { logger } from '../../lib/logger';
import { extractPublicEmail } from './ingestion/parsers';

const MAX_SOURCE_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 15_000;

export class PublicEmailResolver {
  async resolve(fullName: string, sourceUrls: string[]): Promise<{ email: string; sourceUrl: string } | null> {
    for (const sourceUrl of [...new Set(sourceUrls)].slice(0, 5)) {
      try {
        const page = await this.fetchPublicPage(sourceUrl);
        const email = extractPublicEmail(page.body, fullName);
        if (email) return { email, sourceUrl: page.url };
      } catch (err) {
        logger.warn({ sourceUrl, err }, 'Public email source refresh failed');
      }
    }
    return null;
  }

  private async fetchPublicPage(value: string, redirects = 0): Promise<{ body: string; url: string }> {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported source URL protocol');
    await assertPublicHostname(url.hostname);
    const response = await fetch(url, {
      redirect: 'manual',
      headers: { 'User-Agent': 'ReachIQ/1.0 public-contact-evidence-refresh' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status >= 300 && response.status < 400) {
      if (redirects >= MAX_REDIRECTS) throw new Error('Too many source redirects');
      const location = response.headers.get('location');
      if (!location) throw new Error('Source redirect has no location');
      return this.fetchPublicPage(new URL(location, url).toString(), redirects + 1);
    }
    if (!response.ok) throw new Error(`Public source responded ${response.status}`);
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_SOURCE_BYTES) throw new Error('Public source response is too large');
    const body = (await response.text()).slice(0, MAX_SOURCE_BYTES);
    return { body, url: url.toString() };
  }
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) throw new Error('Private source host is not allowed');
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Private source address is not allowed');
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  return normalized === '::1'
    || normalized === '::'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || normalized.startsWith('fe80:')
    || /^127\./.test(normalized)
    || /^10\./.test(normalized)
    || /^192\.168\./.test(normalized)
    || /^169\.254\./.test(normalized)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
    || normalized.startsWith('0.');
}
