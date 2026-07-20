import { logger } from '../../../lib/logger';
import { IngestionSource, ScrapedCandidate, ScrapeTarget } from './ingestion-source.interface';
import { extractCandidatesFromSearchHtml, looksBlocked } from './parsers';
import { ProxiedHttpClient } from './proxied-http-client';

const MAX_PAGES_PER_QUERY = 5;

export class GoogleSearchIngestionSource implements IngestionSource {
  readonly name = 'google-search';

  constructor(private readonly http: ProxiedHttpClient) {}

  async *streamCandidates(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]> {
    for (const query of this.buildQueryVariants(target)) {
      let page = 0;
      while (page < MAX_PAGES_PER_QUERY) {
        const url = this.buildSearchUrl(query, page);
        const html = await this.http.fetch(url);

        if (looksBlocked(html)) {
          logger.warn({ query, page }, 'Blocked on Google Search — rotating identity');
          await this.http.rotateIdentity();
          continue; // retry the same page under a new identity, don't skip it
        }

        const candidates = extractCandidatesFromSearchHtml(html, url);
        if (candidates.length === 0) break; // exhausted this query variant
        yield candidates;
        page += 1;
      }
    }
  }

  private buildQueryVariants(target: ScrapeTarget): string[] {
    const base = `"${target.industry}" "${target.country}"`;
    return [
      `site:linkedin.com/in ${base}`, // Google's snippet only — never follow the link (Section 3.1)
      `${base} "our team" OR "meet the team"`,
      ...(target.keywords ?? []).map((keyword) => `${base} "${keyword}"`),
    ];
  }

  private buildSearchUrl(query: string, page: number): string {
    const params = new URLSearchParams({ q: query, start: String(page * 10) });
    return `https://www.google.com/search?${params.toString()}`;
  }
}
