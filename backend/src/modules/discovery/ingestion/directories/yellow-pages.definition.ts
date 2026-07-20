import { DirectoryDefinition, DirectoryListing, slugify } from './directory-definition.interface';

export const yellowPagesDefinition: DirectoryDefinition = {
  id: 'yellowpages',
  industrySlug: (industry) => slugify(industry),
  locationSlug: (country) => slugify(country),
  buildListingUrl: ({ industrySlug, locationSlug, page }) =>
    `https://www.yellowpages.com/search?search_terms=${industrySlug}&geo_location_terms=${locationSlug}&page=${page + 1}`,
  hasNextPage: (html) => /rel="next"/i.test(html),
  extractListings: (html) => parseYellowPagesListings(html),
};

function parseYellowPagesListings(html: string): DirectoryListing[] {
  const listings: DirectoryListing[] = [];
  const cardMatches = html.matchAll(/<div[^>]+class="[^"]*result[^"]*"[^>]*>[\s\S]{0,600}?<\/div>/gi);

  for (const block of cardMatches) {
    const nameMatch = /class="business-name"[^>]*>(?:<span[^>]*>)?([^<]{2,100})/i.exec(block[0]);
    const siteMatch = /href="(https?:\/\/[^"]+)"[^>]*class="[^"]*track-visit-website/i.exec(block[0]);
    if (nameMatch) {
      listings.push({ businessName: nameMatch[1].trim(), website: siteMatch?.[1] });
    }
  }

  return listings;
}
