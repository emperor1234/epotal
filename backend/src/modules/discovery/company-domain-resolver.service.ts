import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { inferCompanyName, parseNameTitleFromSnippet } from './ingestion/parsers';

const SEARCH_TIMEOUT_MS = 12_000;
const EXCLUDED_HOSTS = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|github|wikipedia|crunchbase|bloomberg|zoominfo|yellowpages)\.(com|org)$/i;

type SearchResult = { title?: string; url?: string; content?: string };

export class CompanyDomainResolver {
  async resolve(input: { fullName: string; jobTitle?: string | null }): Promise<{ companyName: string; domain: string } | null> {
    const companyName = inferCompanyName(input.jobTitle) ?? (await this.findCompanyName(input.fullName));
    if (!companyName) return null;

    const results = await this.search(`"${companyName}" official website`);
    const companyTokens = companyName.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    const matchingDomains: string[] = [];
    for (const result of results) {
      if (!result.url) continue;
      const domain = this.safeCompanyHostname(result.url);
      // Do not turn the first news/directory result into an email domain.
      // Require the hostname to contain a meaningful company-name token.
      const compactDomain = domain?.replace(/[^a-z0-9]/g, '') ?? '';
      if (domain && companyTokens.some((token) => compactDomain.includes(token))) matchingDomains.push(domain);
    }
    const domain = [...new Set(matchingDomains)].sort(
      (a, b) => Number(!a.endsWith('.com')) - Number(!b.endsWith('.com')) || a.split('.').length - b.split('.').length || a.length - b.length,
    )[0];
    return domain ? { companyName, domain } : null;
  }

  private async findCompanyName(fullName: string): Promise<string | null> {
    const results = await this.search(`"${fullName}" company`);
    for (const result of results) {
      const parsed = parseNameTitleFromSnippet(result.title ?? '') ?? parseNameTitleFromSnippet(result.content ?? '');
      if (parsed?.fullName.toLowerCase() === fullName.toLowerCase() && parsed.companyName) return parsed.companyName;
    }
    return null;
  }

  private async search(query: string): Promise<SearchResult[]> {
    const configured = new URL(env.SEARXNG_URL);
    const bases = [configured];
    if (configured.port) {
      const publicBase = new URL(configured);
      publicBase.port = '';
      bases.push(publicBase);
    }

    for (const base of bases) {
      const url = new URL('/search', base);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
        if (!response.ok) continue;
        const body = (await response.json()) as { results?: SearchResult[] };
        return body.results ?? [];
      } catch (err) {
        logger.warn({ baseUrl: base.origin, query, err }, 'Company-domain lookup failed');
      }
    }
    return [];
  }

  private safeCompanyHostname(value: string): string | null {
    try {
      const hostname = new URL(value).hostname.replace(/^www\./, '').toLowerCase();
      return EXCLUDED_HOSTS.test(hostname) ? null : hostname;
    } catch {
      return null;
    }
  }
}
