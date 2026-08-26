import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { inferCompanyName, parseNameTitleFromSnippet } from './ingestion/parsers';

const SEARCH_TIMEOUT_MS = 12_000;
const EXCLUDED_HOSTS = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|github|wikipedia|crunchbase|bloomberg|zoominfo|yellowpages)\.(com|org)$/i;

type SearchResult = { title?: string; url?: string; content?: string };
type BraveSearchResponse = { web?: { results?: Array<{ title: string; url: string; description?: string }> } };

export class CompanyDomainResolver {
  async resolve(input: { fullName: string; jobTitle?: string | null; companyName?: string | null }): Promise<{ companyName: string; domain: string } | null> {
    const companyName = cleanCompanyName(input.companyName) ?? inferCompanyName(input.jobTitle) ?? (await this.findCompanyName(input.fullName));
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
    // Prefer the managed API for predictable production results. SearXNG is
    // retained as a self-hosted fallback when Brave is unavailable or empty.
    const braveResults = await this.searchBrave(query);
    if (braveResults.length) return braveResults;

    const configured = new URL(env.SEARXNG_URL);
    const bases: URL[] = [];
    if (configured.port) {
      const publicBase = new URL(configured);
      publicBase.port = '';
      if (publicBase.protocol === 'http:') publicBase.protocol = 'https:';
      bases.push(publicBase);
      const httpPublicBase = new URL(publicBase);
      httpPublicBase.protocol = 'http:';
      bases.push(httpPublicBase);
    }
    bases.push(configured);

    for (const base of bases) {
      const url = new URL('/search', base);
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) });
        if (!response.ok) continue;
        const body = (await response.json()) as { results?: SearchResult[] };
        if (body.results?.length) return body.results;
      } catch (err) {
        logger.warn({ baseUrl: base.origin, query, err }, 'Company-domain lookup failed');
      }
    }
    return [];
  }

  private async searchBrave(query: string): Promise<SearchResult[]> {
    if (!env.BRAVE_SEARCH_API_KEY) return [];
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '20');
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY },
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        logger.warn({ query, status: response.status }, 'Brave company-domain lookup failed');
        return [];
      }
      const body = (await response.json()) as BraveSearchResponse;
      return (body.web?.results ?? []).map((result) => ({ title: result.title, url: result.url, content: result.description }));
    } catch (err) {
      logger.warn({ query, err }, 'Brave company-domain lookup failed');
      return [];
    }
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

function cleanCompanyName(value?: string | null): string | null {
  const cleaned = value
    ?.replace(/\s+(?:on LinkedIn|\| LinkedIn).*$/i, '')
    .replace(/\s+(?:specializing|providing|offering|offers|based in)\b.*$/i, '')
    .trim();
  return cleaned && cleaned.length >= 2 && cleaned.length <= 120 ? cleaned : null;
}
