import { ScrapedCandidate } from './ingestion-source.interface';
import { extractStaffFromPageHtml } from './parsers';
import { ProxiedHttpClient } from './proxied-http-client';

const STAFF_PAGE_PATHS = ['/team', '/about', '/about-us', '/leadership'];

export class CompanySiteIngestionSource {
  constructor(private readonly http: ProxiedHttpClient) {}

  async extractStaff(companyDomain: string): Promise<ScrapedCandidate[]> {
    for (const path of STAFF_PAGE_PATHS) {
      const url = `https://${companyDomain}${path}`;
      try {
        const html = await this.http.fetch(url);
        const staff = extractStaffFromPageHtml(html);
        if (staff.length > 0) {
          return staff.map((person) => ({
            ...person,
            companyDomain,
            sourceType: 'company_site' as const,
            sourceUrl: url,
          }));
        }
      } catch {
        continue; // this path doesn't exist on this site — try the next one
      }
    }
    return [];
  }
}
