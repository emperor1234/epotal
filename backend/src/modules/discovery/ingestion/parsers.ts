import { ScrapedCandidate } from './ingestion-source.interface';

// Deliberately isolated, single-purpose parsers (SYSTEM_DESIGN.md Section 6.1):
// when Google/a directory changes markup, only these need to change, not the
// scrapers that call them. Track "candidates extracted per page fetched" as
// an external metric and alert when it drops toward zero.

const CHALLENGE_MARKERS = [/id="captcha"/i, /Our systems have detected unusual traffic/i, /consent\.google\.com/i, /Access Denied/i];

export function looksBlocked(html: string): boolean {
  if (html.length < 200) return true;
  return CHALLENGE_MARKERS.some((marker) => marker.test(html));
}

// Extracts (name, title-ish snippet) pairs out of Google's search result
// HTML. Real Google markup uses obfuscated, frequently-rotated class names,
// so production parsing needs a maintained selector map; this extracts from
// the semantically stable bits (heading text + snippet paragraphs) that
// survive most markup churn.
export function extractCandidatesFromSearchHtml(html: string, sourceUrl: string): ScrapedCandidate[] {
  const results: ScrapedCandidate[] = [];
  const headingMatches = html.matchAll(/<h3[^>]*>([^<]{2,120})<\/h3>/gi);

  for (const match of headingMatches) {
    const text = decodeHtmlEntities(match[1]).trim();
    const parsed = parseNameTitleFromSnippet(text);
    if (parsed) {
      results.push({ ...parsed, sourceType: 'google_search', sourceUrl });
    }
  }

  return results;
}

export function extractBusinessesFromMapsHtml(html: string): { name: string; website?: string }[] {
  const results: { name: string; website?: string }[] = [];
  const nameMatches = html.matchAll(/"name":"([^"]{2,100})"/g);
  for (const match of nameMatches) {
    results.push({ name: decodeHtmlEntities(match[1]) });
  }
  return results;
}

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

function parseNameTitleFromSnippet(text: string): { fullName: string; jobTitle?: string } | null {
  // Google/LinkedIn snippet titles are commonly "Name - Title - Company" or "Name | Title".
  const parts = text.split(/\s[-|]\s/);
  if (parts.length === 0) return null;
  const fullName = parts[0].trim();
  if (!/^[A-Z][a-zA-Z'.-]+(\s+[A-Z][a-zA-Z'.-]+){1,3}$/.test(fullName)) return null;
  return { fullName, jobTitle: parts[1]?.trim() };
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}
