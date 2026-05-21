export interface ExtractedCitation {
  fullUrl: string | null;
  rootDomain: string;
  citationType: 'Linked' | 'Named Mention' | 'Brand Domain';
  recommendedBrand: string | null;
}

const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;

// Domains that are platforms/aggregators — normalize to root only
const PLATFORM_DOMAINS = new Set([
  'medium.com', 'substack.com', 'wordpress.com', 'blogger.com',
  'tumblr.com', 'linkedin.com', 'twitter.com', 'x.com',
  'youtube.com', 'reddit.com', 'quora.com', 'github.com',
]);

export function normalizeDomain(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    let host = url.hostname.toLowerCase();
    host = host.replace(/^www\./, '');

    // For platform domains keep just root
    const parts = host.split('.');
    if (parts.length > 2) {
      const root = parts.slice(-2).join('.');
      if (PLATFORM_DOMAINS.has(root)) return root;
    }
    return host;
  } catch {
    return rawUrl.toLowerCase().replace(/^www\./, '').split('/')[0];
  }
}

export function extractCitations(rawText: string): ExtractedCitation[] {
  const seen = new Set<string>();
  const results: ExtractedCitation[] = [];

  // 1. Extract from markdown links
  let match: RegExpExecArray | null;
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_LINK_REGEX.exec(rawText)) !== null) {
    const [, label, url] = match;
    const domain = normalizeDomain(url);
    if (seen.has(domain)) continue;
    seen.add(domain);
    results.push({
      fullUrl: url,
      rootDomain: domain,
      citationType: 'Linked',
      recommendedBrand: extractBrandFromLabel(label),
    });
  }

  // 2. Extract plain URLs
  const urlMatches = rawText.match(URL_REGEX) || [];
  for (const url of urlMatches) {
    const domain = normalizeDomain(url);
    if (seen.has(domain)) continue;
    seen.add(domain);
    results.push({
      fullUrl: url,
      rootDomain: domain,
      citationType: 'Linked',
      recommendedBrand: null,
    });
  }

  // 3. Named mentions (quoted or bold text that looks like a brand)
  const namedPatterns = [
    /(?:\*\*|__)([A-Z][A-Za-z0-9 &.'-]{2,40})(?:\*\*|__)/g,
    /"([A-Z][A-Za-z0-9 &.'-]{2,40})"/g,
    /\b((?:[A-Z][a-z]+){2,4})\b(?=\s+(?:is|offers|provides|platform|tool|service|site))/g,
  ];

  for (const pattern of namedPatterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(rawText)) !== null) {
      const brand = match[1].trim();
      if (brand.length < 3 || brand.split(' ').length > 5) continue;
      const pseudoDomain = brand.toLowerCase().replace(/\s+/g, '') + '.com';
      if (seen.has(pseudoDomain)) continue;
      seen.add(pseudoDomain);
      results.push({
        fullUrl: null,
        rootDomain: pseudoDomain,
        citationType: 'Named Mention',
        recommendedBrand: brand,
      });
    }
  }

  return results;
}

function extractBrandFromLabel(label: string): string | null {
  const cleaned = label.replace(/\[|\]/g, '').trim();
  if (cleaned.length > 2 && cleaned.length < 60) return cleaned;
  return null;
}

export function sanitizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Prevent formula injection
  if (/^[=+\-@|%]/.test(str)) return `'${str}`;
  return str;
}
