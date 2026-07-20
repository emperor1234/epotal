export interface ScrapeTarget {
  industry: string;
  country: string;
  seniority?: string;
  keywords?: string[];
  mode: 'quick' | 'full_directory';
}

export interface ScrapedCandidate {
  fullName: string;
  jobTitle?: string;
  companyName?: string;
  companyDomain?: string;
  sourceType: 'google_search' | 'google_maps' | 'company_site' | 'directory';
  sourceUrl: string;
}

export interface IngestionSource {
  readonly name: string;
  streamCandidates(target: ScrapeTarget): AsyncGenerator<ScrapedCandidate[]>;
}
