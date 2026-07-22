import { ScrapedCandidate } from './ingestion-source.interface';

// Deliberately isolated, single-purpose parsers (SYSTEM_DESIGN.md Section 6.1):
// when a source changes its markup/response shape, only these need to change,
// not the ingestion sources that call them.

export function extractStaffFromPageHtml(html: string): { fullName: string; jobTitle?: string }[] {
  const results: { fullName: string; jobTitle?: string }[] = [];
  const cardMatches = html.matchAll(
    /<[^>]+class="[^"]*(?:team-member|staff-card|person)[^"]*"[^>]*>[\s\S]{0,400}?<\/[^>]+>/gi,
  );

  for (const block of cardMatches) {
    const nameMatch = /<h\d[^>]*>([^<]{2,60})<\/h\d>/i.exec(block[0]);
    const titleMatch = /<p[^>]*>([^<]{2,80})<\/p>/i.exec(block[0]);
    if (nameMatch) {
      results.push({ fullName: decodeHtmlEntities(nameMatch[1]).trim(), jobTitle: titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : undefined });
    }
  }

  return results;
}

// Search-result titles (SearXNG, and any search backend) are commonly
// "Name - Title - Company" or "Name | Title". Used against both the result
// title and its snippet/content text.
export function parseNameTitleFromSnippet(text: string): Pick<ScrapedCandidate, 'fullName' | 'jobTitle'> | null {
  const parts = text.split(/\s[-|]\s/);
  if (parts.length === 0) return null;
  const fullName = decodeHtmlEntities(parts[0]).trim();
  if (!/^[A-Z][a-zA-Z'.-]+(\s+[A-Z][a-zA-Z'.-]+){1,3}$/.test(fullName)) return null;
  return { fullName, jobTitle: parts[1] ? decodeHtmlEntities(parts[1]).trim() : undefined };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
