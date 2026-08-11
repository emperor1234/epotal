import { ScrapedCandidate } from './ingestion-source.interface';

// Deliberately isolated, single-purpose parsers (SYSTEM_DESIGN.md Section 6.1):
// when a source changes its markup/response shape, only these need to change,
// not the ingestion sources that call them.

export function extractStaffFromPageHtml(html: string): { fullName: string; jobTitle?: string; publicEmail?: string }[] {
  const results: { fullName: string; jobTitle?: string; publicEmail?: string }[] = [];
  const cardMatches = html.matchAll(
    /<[^>]+class="[^"]*(?:team-member|staff-card|person)[^"]*"[^>]*>[\s\S]{0,400}?<\/[^>]+>/gi,
  );

  for (const block of cardMatches) {
    const nameMatch = /<h\d[^>]*>([^<]{2,60})<\/h\d>/i.exec(block[0]);
    const titleMatch = /<p[^>]*>([^<]{2,80})<\/p>/i.exec(block[0]);
    const fullName = nameMatch ? decodeHtmlEntities(nameMatch[1]).trim() : '';
    if (isPlausiblePersonName(fullName)) {
      results.push({
        fullName,
        jobTitle: titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : undefined,
        publicEmail: extractPublicEmail(block[0], fullName),
      });
    }
  }

  return results;
}

export function extractPublicEmail(text: string, fullName: string): string | undefined {
  const decoded = decodeHtmlEntities(text).replace(/\s+at\s+/gi, '@').replace(/\s+dot\s+/gi, '.');
  const candidates = decoded.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi) ?? [];
  const nameParts = fullName.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  const firstName = nameParts[0] ?? '';
  const lastName = nameParts.at(-1) ?? '';
  return candidates
    .map((email) => email.toLowerCase())
    .find((email) => {
      const localPart = email.split('@')[0].replace(/[^a-z0-9]/g, '');
      return Boolean(
        (firstName.length >= 3 && localPart.includes(firstName))
        || (lastName.length >= 3 && localPart.includes(lastName))
        || (firstName && lastName && localPart.startsWith(`${firstName[0]}${lastName}`)),
      );
    });
}

function isPlausiblePersonName(value: string): boolean {
  if (value.length < 4 || value.length > 70 || /[&@]|\b(?:services|construction|company|inc|llc|ltd|team|about)\b/i.test(value)) return false;
  const words = value.split(/\s+/);
  return words.length >= 2 && words.length <= 5 && words.every((word) => /^[\p{L}][\p{L}'.-]*$/u.test(word));
}

// Search-result titles (SearXNG, and any search backend) are commonly
// "Name - Title - Company" or "Name | Title". Used against both the result
// title and its snippet/content text.
export function parseNameTitleFromSnippet(text: string): Pick<ScrapedCandidate, 'fullName' | 'jobTitle' | 'companyName'> | null {
  const parts = text.split(/\s[-|]\s/);
  if (parts.length === 0) return null;
  const fullName = decodeHtmlEntities(parts[0]).trim();
  if (!/^[A-Z][a-zA-Z'.-]+(\s+[A-Z][a-zA-Z'.-]+){1,3}$/.test(fullName)) return null;
  const jobTitle = parts[1] ? decodeHtmlEntities(parts[1]).trim() : undefined;
  const companyFromTitle = inferCompanyName(jobTitle);
  const thirdPart = parts[2] ? decodeHtmlEntities(parts[2]).replace(/\s*\|\s*(?:LinkedIn|Facebook).*$/i, '').trim() : undefined;
  const companyName = companyFromTitle ?? (thirdPart && !/^(?:LinkedIn|Facebook|Instagram|X|Twitter)$/i.test(thirdPart) ? thirdPart : undefined);
  return { fullName, jobTitle, companyName };
}

export function inferCompanyName(jobTitle?: string | null): string | undefined {
  if (!jobTitle) return undefined;
  const match = /\b(?:at|@)\s+(.{2,100})$/i.exec(jobTitle);
  return match?.[1].replace(/\s*\|\s*(?:LinkedIn|Facebook).*$/i, '').trim() || undefined;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#64;|&commat;/g, '@')
    .replace(/&quot;/g, '"');
}
