import { logger } from '../../../../lib/logger';
import { IngestionSource, ScrapedCandidate, ScrapeTarget } from '../ingestion-source.interface';
import { ProxiedHttpClient } from '../proxied-http-client';
import { DirectoryCrawlProgressService } from './directory-crawl-progress.service';
import { DirectoryDefinition, DirectoryListing } from './directory-definition.interface';

export class DirectoryIngestionSource implements IngestionSource {
  readonly name: string;

  constructor(
    private readonly definition: DirectoryDefinition,
    private readonly http: ProxiedHttpClient,
    private readonly progress: DirectoryCrawlProgressService,
  ) {
    this.name = `directory:${definition.id}`;
  }

  async *streamCandidates(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]> {
    const industrySlug = this.definition.industrySlug(target.industry);
    const locationSlug = this.definition.locationSlug(target.country);
    const key = { directoryId: this.definition.id, industrySlug, locationSlug };

    let page = await this.progress.getResumePage(key); // resumes mid-crawl after a restart
    let consecutiveEmptyPages = 0;

    while (consecutiveEmptyPages < 2) {
      const url = this.definition.buildListingUrl({ industrySlug, locationSlug, page });
      const html = await this.http.fetch(url);

      if (this.looksBlocked(html)) {
        logger.warn({ directory: this.definition.id, page }, 'Blocked — rotating identity');
        await this.http.rotateIdentity();
        continue; // retry the same page under a new identity, don't advance the cursor
      }

      const listings = this.definition.extractListings(html);
      if (listings.length === 0) {
        consecutiveEmptyPages += 1;
      } else {
        consecutiveEmptyPages = 0;
        yield listings.map((listing) => this.toCandidate(listing, url));
      }

      // Checkpoint after every page — what makes a mid-crawl crash resumable.
      await this.progress.saveResumePage(key, page + 1);

      if (!this.definition.hasNextPage(html)) break;
      page += 1;
    }

    await this.progress.markComplete(key);
  }

  private toCandidate(listing: DirectoryListing, sourceUrl: string): ScrapedCandidate {
    return {
      fullName: '',
      companyName: listing.businessName,
      companyDomain: listing.website ? safeHostname(listing.website) : undefined,
      sourceType: 'directory',
      sourceUrl,
    };
  }

  private looksBlocked(html: string): boolean {
    return html.length < 500 || /captcha|access denied/i.test(html);
  }
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}
