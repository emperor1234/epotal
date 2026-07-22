import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { IngestionSource, ScrapedCandidate, ScrapeTarget } from './ingestion-source.interface';
import { parseNameTitleFromSnippet } from './parsers';

const MAX_PAGES_PER_QUERY = 3;

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
      `site:linkedin.com/in ${base}`, // snippet only — never fetch the linked page (SYSTEM_DESIGN.md Section 3.1)
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
    const url = new URL('/search', env.SEARXNG_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('pageno', String(page));

    const response = await fetch(url.toString());
    if (!response.ok) {
      logger.warn({ query, page, status: response.status }, 'SearXNG request failed');
      return [];
    }

    const body = (await response.json()) as { results?: SearxngResult[] };
    return body.results ?? [];
  }
}
