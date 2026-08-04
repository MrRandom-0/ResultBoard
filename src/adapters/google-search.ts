import type { ParsedSearchResult } from '../models/types';
import { canonicalizeUrl, displayDomain, unwrapGoogleUrl } from '../utils/url';

const EXCLUDED_LABELS = /^\s*(sponsored|ad|ads|shopping|people also ask|related searches|featured snippet)\b/i;
const GOOGLE_HOST = /(^|\.)google\.[a-z.]+$/i;

export interface GoogleResultMatch { container: HTMLElement; anchor: HTMLAnchorElement; result: ParsedSearchResult }

function organicContainer(heading: HTMLHeadingElement): HTMLElement | null {
  return heading.closest<HTMLElement>('.MjjYud, .g, [data-snhf], [data-hveid]') ?? heading.parentElement?.parentElement ?? null;
}

export function parseGoogleResult(heading: HTMLHeadingElement, locationHref = window.location.href): GoogleResultMatch | null {
  const anchor = heading.closest('a') ?? heading.parentElement?.closest('a');
  if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return null;
  const container = organicContainer(heading);
  if (!container || container.closest('[data-text-ad], [data-pla-slot], [aria-label*="Ads" i]')) return null;
  const nearbyText = (container.innerText || '').slice(0, 180);
  if (EXCLUDED_LABELS.test(nearbyText)) return null;
  try {
    const destination = unwrapGoogleUrl(new URL(anchor.href, locationHref).href);
    const parsedUrl = new URL(destination);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || GOOGLE_HOST.test(parsedUrl.hostname)) return null;
    const canonicalUrl = canonicalizeUrl(destination);
    const snippetNode = container.querySelector<HTMLElement>('[data-sncf], .VwiC3b, [data-content-feature="1"]');
    const sourceQuery = new URL(locationHref).searchParams.get('q')?.trim() ?? '';
    return {
      container,
      anchor,
      result: {
        url: parsedUrl.href,
        canonicalUrl,
        title: heading.textContent?.trim() ?? '',
        snippet: snippetNode?.textContent?.trim() ?? '',
        domain: displayDomain(canonicalUrl),
        sourceQuery
      }
    };
  } catch { return null; }
}

export function findOrganicResults(root: ParentNode = document): GoogleResultMatch[] {
  const seen = new Set<string>();
  const matches: GoogleResultMatch[] = [];
  for (const heading of root.querySelectorAll<HTMLHeadingElement>('h3')) {
    const match = parseGoogleResult(heading);
    if (match && match.result.title && !seen.has(match.result.canonicalUrl)) {
      seen.add(match.result.canonicalUrl);
      matches.push(match);
    }
  }
  return matches;
}
