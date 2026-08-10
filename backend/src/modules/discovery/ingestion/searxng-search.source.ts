import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { IngestionSource, ScrapedCandidate, ScrapeTarget } from './ingestion-source.interface';
import { parseNameTitleFromSnippet } from './parsers';

const MAX_PAGES_PER_QUERY = 3;
const SEARCH_TIMEOUT_MS = 15_000;

interface SearxngResult {
  title: string;
  url: string;
  content?: string;
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
    const base = `"${target.industry}" "${target.country}"`;
    return [
      // Only public search-result metadata is consumed. We never sign in to,
      // bypass access controls on, or fetch profile pages from these services.
      `site:linkedin.com/in ${base}`,
      `site:facebook.com ${base} (founder OR director OR manager OR CEO)`,
      `site:instagram.com ${base} (founder OR director OR manager OR CEO)`,
      `(site:x.com OR site:twitter.com) ${base} (founder OR director OR manager OR CEO)`,
      `${base} "our team" OR "meet the team"`,
      ...(target.keywords ?? []).map((keyword) => `${base} "${keyword}"`),
    ];
  }

  private toCandidate(result: SearxngResult): ScrapedCandidate | null {
    const parsed = parseNameTitleFromSnippet(result.title) ?? parseNameTitleFromSnippet(result.content ?? '');
    if (!parsed) return null;
    return { ...parsed, sourceType: 'search_engine', sourceUrl: result.url };
  }

  private async search(query: string, page: number): Promise<SearxngResult[]> {
    const configuredUrl = this.preferredBaseUrl;
    const response = await this.fetchSearch(configuredUrl, query, page);

    // Coolify commonly exposes the service through its generated hostname on
    // port 80 even if the container itself listens on 8080. Recover from an
    // accidentally configured container port instead of making every search
    // silently empty (the previous production configuration did exactly this).
    if (!response && configuredUrl.port) {
      const publicUrl = new URL(configuredUrl);
      publicUrl.port = '';
      logger.warn({ configuredUrl: configuredUrl.origin, fallbackUrl: publicUrl.origin }, 'Retrying SearXNG on its public port');
      const fallbackResponse = await this.fetchSearch(publicUrl, query, page);
      if (fallbackResponse?.ok) this.preferredBaseUrl = publicUrl;
      return this.readResults(fallbackResponse, query, page);
    }

    return this.readResults(response, query, page);
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

    const body = (await response.json()) as { results?: SearxngResult[] };
    return body.results ?? [];
  }
}
