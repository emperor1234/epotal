import { IngestionSource, ScrapedCandidate, ScrapeTarget } from './ingestion-source.interface';
import { extractBusinessesFromMapsHtml } from './parsers';
import { ProxiedHttpClient } from './proxied-http-client';

export class GoogleMapsIngestionSource implements IngestionSource {
  readonly name = 'google-maps';

  constructor(private readonly http: ProxiedHttpClient) {}

  async *streamCandidates(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]> {
    const query = `${target.industry} in ${target.country}`;
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

    // Maps is a JS-rendered, scroll-paginated SPA, not `?start=`-style
    // pagination — needs a headless browser (see ProxiedHttpClient.fetchViaHeadlessBrowser).
    const html = await this.http.fetch(url, { renderJs: true });
    const businesses = extractBusinessesFromMapsHtml(html);

    // Maps gives businesses, not people — each result's website feeds into
    // CompanySiteIngestionSource via the orchestrator to get actual staff names.
    yield businesses.map((business) => ({
      fullName: '',
      companyName: business.name,
      companyDomain: business.website ? safeHostname(business.website) : undefined,
      sourceType: 'google_maps' as const,
      sourceUrl: url,
    }));
  }
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
