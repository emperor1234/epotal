import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { IngestionSource, ScrapedCandidate, ScrapeTarget } from './ingestion-source.interface';

interface OverpassElement {
  tags?: Record<string, string>;
}

const RESULT_LIMIT = 50;

// Replaces GoogleMapsIngestionSource: queries the free, public Overpass API
// (OpenStreetMap) instead of scraping Google Maps' JS-rendered SPA. No
// headless browser needed — Overpass is a plain JSON HTTP API. Coverage is
// community-sourced, so it's weaker than Google Maps for very small/new
// businesses, but there's no key, no card, no rate-limit risk at this
// volume. Like Maps, this gives businesses, not people — the orchestrator
// still hands each result's domain to CompanySiteIngestionSource for staff.
export class OverpassPlacesIngestionSource implements IngestionSource {
  readonly name = 'overpass-places';

  async *streamCandidates(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]> {
    let elements: OverpassElement[];
    try {
      elements = await this.query(this.buildQuery(target));
    } catch (err) {
      logger.warn({ err, target }, 'Overpass query failed');
      return;
    }

    const businesses = elements
      .map((element) => this.toCandidate(element))
      .filter((candidate): candidate is ScrapedCandidate => candidate !== null);

    if (businesses.length > 0) yield businesses;
  }

  private buildQuery(target: ScrapeTarget): string {
    const country = escapeOverpassString(target.country);
    const industry = escapeOverpassString(target.industry ?? target.keywords?.[0] ?? target.jobTitle ?? 'professional');
    // admin_level=2 = country boundary in OSM's convention. Matching by
    // "name:en" is a best-effort approximation — some countries are indexed
    // under a different tag; this is the same "isolated parser, expect to
    // maintain it" tradeoff the original scraping design called out.
    return `
      [out:json][timeout:25];
      area["name"~"^${country}$",i]["boundary"="administrative"]["admin_level"="2"]->.country;
      (
        nwr["name"~"${industry}",i]["office"](area.country);
        nwr["name"~"${industry}",i]["shop"](area.country);
        nwr["name"~"${industry}",i]["amenity"](area.country);
        nwr["office"~"${industry}",i](area.country);
        nwr["craft"~"${industry}",i](area.country);
      );
      out center ${RESULT_LIMIT} tags;
    `;
  }

  private async query(overpassQl: string): Promise<OverpassElement[]> {
    // The query itself is bounded by Overpass's own [timeout:25] directive,
    // but that only bounds server-side execution — an unreachable endpoint
    // or a stalled connection has no client-side bound without this, and
    // would hang the whole search job indefinitely (sources run sequentially).
    const response = await fetch(env.OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQl)}`,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      throw new Error(`Overpass responded ${response.status}`);
    }
    const body = (await response.json()) as { elements?: OverpassElement[] };
    return body.elements ?? [];
  }

  private toCandidate(element: OverpassElement): ScrapedCandidate | null {
    const tags = element.tags ?? {};
    if (!tags.name) return null;
    const website = tags.website ?? tags['contact:website'];
    return {
      fullName: '',
      companyName: tags.name,
      companyDomain: website ? safeHostname(website) : undefined,
      sourceType: 'places',
      sourceUrl: env.OVERPASS_API_URL,
    };
  }
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return undefined;
  }
}

function escapeOverpassString(value: string): string {
  return value.replace(/["\\]/g, '');
}
