import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { IngestionSource, ScrapedCandidate, ScrapeTarget } from './ingestion-source.interface';
import { extractPublicEmail, parseNameTitleFromSnippet } from './parsers';

const MAX_PAGES_PER_QUERY = 5;
const SEARCH_TIMEOUT_MS = 15_000;

interface SearxngResult {
  title: string;
  url: string;
  content?: string;
}

type UnresponsiveEngine = [engine: string, reason: string];

interface SearxngResponse {
  results?: SearxngResult[];
  unresponsive_engines?: UnresponsiveEngine[];
}

interface BraveSearchResponse {
  web?: { results?: Array<{ title: string; url: string; description?: string }> };
}

// Replaces GoogleSearchIngestionSource: queries a self-hosted SearXNG
// instance's JSON API instead of scraping Google's HTML directly. No
// proxy pool, no block-detection/retry loop, no artificial delay needed —
// it's a normal authenticated-by-network-location API call to infra you
// run yourself. Requires SearXNG's settings.yml to have `json` enabled
// under `search.formats` (disabled by default) — see backend/README.md.
export class SearxngSearchIngestionSource implements IngestionSource {
  readonly name = 'searxng-search';
  private preferredBaseUrl = new URL(env.SEARXNG_URL);

  async *streamCandidates(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]> {
    for (const query of this.buildQueryVariants(target)) {
      for (let page = 1; page <= MAX_PAGES_PER_QUERY; page += 1) {
        const results = await this.search(query, page);
        if (results.length === 0) break; // exhausted this query variant

        const candidates = results
          .map((result) => this.toCandidate(result))
          .filter((candidate): candidate is ScrapedCandidate => candidate !== null);

        if (candidates.length > 0) yield candidates;
      }
    }
  }

  private buildQueryVariants(target: ScrapeTarget): string[] {
    const quote = (value: string) => `"${value.replace(/["\\]/g, ' ').trim()}"`;
    // Jobs enqueued by an older deployment may predate the required-keywords
    // contract, so retain a safe fallback while requiring keywords on every
    // new API request.
    const keywords = target.keywords?.length ? target.keywords : [target.jobTitle ?? target.industry ?? 'professional'];
    const base = [target.industry && quote(target.industry), quote(target.country), target.company && quote(target.company)]
      .filter(Boolean)
      .join(' ');
    const exclusions = (target.excludedKeywords ?? []).map((keyword) => `-${quote(keyword)}`).join(' ');
    const keywordRoles = `(${keywords.map(quote).join(' OR ')})`;
    const titleTerms = target.jobTitle
      ? target.includeRelatedTitles
        ? `(${quote(target.jobTitle)} OR manager OR director OR head OR lead OR executive)`
        : quote(target.jobTitle)
      : keywordRoles;
    const seniorityTerm = target.seniority && target.seniority !== 'Any' ? quote(target.seniority) : '';
    const roleTerms = `${titleTerms} ${seniorityTerm}`.trim();
    const sources = new Set(target.sources ?? ['linkedin', 'facebook', 'instagram', 'x', 'web']);
    const selectedSites = [
      sources.has('linkedin') && 'site:linkedin.com/in',
      sources.has('facebook') && 'site:facebook.com',
      sources.has('instagram') && 'site:instagram.com',
      sources.has('x') && '(site:x.com OR site:twitter.com)',
    ].filter(Boolean).join(' OR ');
    const keywordScope = sources.has('web') || !selectedSites ? '' : `(${selectedSites})`;
    const focusedRoles = keywords;
    return [
      // Only public search-result metadata is consumed. We never sign in to,
      // bypass access controls on, or fetch profile pages from these services.
      sources.has('linkedin') && `site:linkedin.com/in ${base} ${roleTerms} ${exclusions}`,
      sources.has('facebook') && `site:facebook.com ${base} ${roleTerms} ${exclusions}`,
      sources.has('instagram') && `site:instagram.com ${base} ${roleTerms} ${exclusions}`,
      sources.has('x') && `(site:x.com OR site:twitter.com) ${base} ${roleTerms} ${exclusions}`,
      sources.has('web') && `${base} ${roleTerms} ("our team" OR "meet the team") ${exclusions}`,
      // Find addresses people have intentionally published on public pages.
      // extractPublicEmail still requires the local part to match the parsed
      // person's name, preventing unrelated addresses in a result snippet
      // from being attached to the contact.
      sources.has('web') && `${base} ${roleTerms} ("@gmail.com" OR "@yahoo.com" OR "@outlook.com" OR "@icloud.com" OR "@proton.me") ${exclusions}`,
      ...focusedRoles.flatMap((role) => [
        sources.has('linkedin') && `site:linkedin.com/in ${base} ${quote(role)} ${exclusions}`,
        sources.has('web') && `${base} ${quote(role)} ("team" OR "leadership") ${exclusions}`,
      ]),
      ...keywords.map((keyword) => `${keywordScope} ${base} ${quote(keyword)} ${exclusions}`),
    ].filter((query): query is string => Boolean(query));
  }

  private toCandidate(result: SearxngResult): ScrapedCandidate | null {
    const parsed = parseNameTitleFromSnippet(result.title) ?? parseNameTitleFromSnippet(result.content ?? '');
    if (!parsed) return null;
    return {
      ...parsed,
      companyDomain: publicCompanyHostname(result.url, parsed.companyName),
      publicEmail: extractPublicEmail(`${result.title} ${result.content ?? ''}`, parsed.fullName),
      sourceType: 'search_engine',
      sourceUrl: result.url,
    };
  }

  private async search(query: string, page: number): Promise<SearxngResult[]> {
    const configuredUrl = this.preferredBaseUrl;
    const response = await this.fetchSearch(configuredUrl, query, page);

    // Coolify commonly exposes the service through its generated hostname on
    // port 80 even if the container itself listens on 8080. Recover from an
    // accidentally configured container port instead of making every search
    // silently empty (the previous production configuration did exactly this).
    if (!response && configuredUrl.port) {
      const publicUrl = publicCoolifyUrl(configuredUrl);
      logger.warn({ configuredUrl: configuredUrl.origin, fallbackUrl: publicUrl.origin }, 'Retrying SearXNG on its public port');
      const fallbackResponse = await this.fetchSearch(publicUrl, query, page);
      if (fallbackResponse?.ok) this.preferredBaseUrl = publicUrl;
      if (fallbackResponse?.ok) return this.readResultsWithFallback(fallbackResponse, query, page);
      if (publicUrl.protocol === 'http:') {
        const httpsPublicUrl = new URL(publicUrl);
        httpsPublicUrl.protocol = 'https:';
        const httpsResponse = await this.fetchSearch(httpsPublicUrl, query, page);
        if (httpsResponse?.ok) this.preferredBaseUrl = httpsPublicUrl;
        return this.readResultsWithFallback(httpsResponse, query, page);
      }
      return this.readResultsWithFallback(fallbackResponse, query, page);
    }

    return this.readResultsWithFallback(response, query, page);
  }

  private async readResultsWithFallback(response: Response | null, query: string, page: number): Promise<SearxngResult[]> {
    const results = await this.readResults(response, query, page);
    return results.length > 0 || !env.BRAVE_SEARCH_API_KEY ? results : this.searchBrave(query, page);
  }

  private async searchBrave(query: string, page: number): Promise<SearxngResult[]> {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', '20');
    url.searchParams.set('offset', String(page - 1));
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY },
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });
      if (!response.ok) {
        logger.warn({ query, page, status: response.status }, 'Brave Search API request failed');
        return [];
      }
      const body = (await response.json()) as BraveSearchResponse;
      return (body.web?.results ?? []).map((result) => ({ title: result.title, url: result.url, content: result.description }));
    } catch (err) {
      logger.warn({ query, page, err }, 'Brave Search API request failed or timed out');
      return [];
    }
  }

  private async fetchSearch(baseUrl: URL, query: string, page: number): Promise<Response | null> {
    const url = new URL('/search', baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('pageno', String(page));
    return fetch(url.toString(), { signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS) }).catch((err) => {
      logger.warn({ baseUrl: baseUrl.origin, query, page, err }, 'SearXNG request failed or timed out');
      return null;
    });
  }

  private async readResults(response: Response | null, query: string, page: number): Promise<SearxngResult[]> {
    if (!response || !response.ok) {
      if (response) logger.warn({ query, page, status: response.status }, 'SearXNG request failed');
      return [];
    }

    const body = (await response.json()) as SearxngResponse;
    if ((body.results?.length ?? 0) === 0 && body.unresponsive_engines?.length) {
      logger.warn(
        { query, page, unresponsiveEngines: body.unresponsive_engines },
        'SearXNG returned no results because upstream engines are unavailable',
      );
    }
    return body.results ?? [];
  }
}

function publicCoolifyUrl(configured: URL): URL {
  const url = new URL(configured);
  url.port = '';
  return url;
}

const NON_COMPANY_HOSTS = /(^|\.)(linkedin|facebook|instagram|twitter|x|youtube|github|wikipedia|yellowpages)\.com$/i;

function publicCompanyHostname(value: string, companyName?: string): string | undefined {
  if (!companyName) return undefined;
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '').toLowerCase();
    const compactHostname = hostname.replace(/[^a-z0-9]/g, '');
    const companyTokens = companyName.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
    return NON_COMPANY_HOSTS.test(hostname) || !companyTokens.some((token) => compactHostname.includes(token)) ? undefined : hostname;
  } catch {
    return undefined;
  }
}
