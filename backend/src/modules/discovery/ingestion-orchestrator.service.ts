import { logger } from '../../lib/logger';
import { CompanySiteIngestionSource } from './ingestion/company-site.source';
import { DirectoryIngestionSource } from './ingestion/directories/directory.source';
import { OverpassPlacesIngestionSource } from './ingestion/overpass-places.source';
import { SearxngSearchIngestionSource } from './ingestion/searxng-search.source';
import { ScrapedCandidate, ScrapeTarget } from './ingestion/ingestion-source.interface';

export class IngestionOrchestrator {
  constructor(
    private readonly directories: DirectoryIngestionSource[],
    private readonly places: OverpassPlacesIngestionSource,
    private readonly companySite: CompanySiteIngestionSource,
    private readonly searchEngine: SearxngSearchIngestionSource,
  ) {}

  async *run(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]> {
    // Directories are the expensive, exhaustive path — only run them when
    // explicitly requested. A 'quick' search stays fast; nothing about the
    // request shape should silently trigger an hours-long crawl.
    if (target.mode === 'full_directory') {
      for (const directory of this.directories) {
        for await (const listings of directory.streamCandidates(target)) {
          yield* this.resolveStaffForEach(listings);
        }
      }
    }

    for await (const businesses of this.places.streamCandidates(target)) {
      yield* this.resolveStaffForEach(businesses);
    }

    for await (const batch of this.searchEngine.streamCandidates(target)) {
      yield batch;
    }
  }

  private async *resolveStaffForEach(candidates: ScrapedCandidate[]): AsyncGenerator<ScrapedCandidate[]> {
    for (const candidate of candidates) {
      if (!candidate.companyDomain) {
        yield [candidate]; // no site to pull staff from — still a useful business-level record
        continue;
      }
      try {
        const staff = await this.companySite.extractStaff(candidate.companyDomain);
        yield staff.length > 0 ? staff : [candidate];
      } catch (err) {
        logger.warn({ domain: candidate.companyDomain, err }, 'Company-site scrape failed');
        yield [candidate];
      }
    }
  }
}
