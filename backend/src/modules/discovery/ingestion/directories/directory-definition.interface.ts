export interface DirectoryListing {
  businessName: string;
  website?: string;
  category?: string;
  address?: string;
}

export interface DirectoryDefinition {
  id: string;
  industrySlug(industry: string): string;
  locationSlug(country: string): string;
  buildListingUrl(params: { industrySlug: string; locationSlug: string; page: number }): string;
  hasNextPage(html: string): boolean;
  extractListings(html: string): DirectoryListing[];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
