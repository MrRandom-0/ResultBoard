const TRACKING_PARAMS = new Set([
  'gclid', 'dclid', 'fbclid', 'msclkid',
  'utm_campaign', 'utm_content', 'utm_medium', 'utm_source', 'utm_term', 'utm_id'
]);

export function unwrapGoogleUrl(raw: string): string {
  const url = new URL(raw, 'https://www.google.com');
  if ((url.hostname === 'google.com' || url.hostname.startsWith('www.google.') || url.hostname.startsWith('google.')) && url.pathname === '/url') {
    return url.searchParams.get('q') ?? url.searchParams.get('url') ?? raw;
  }
  return url.href;
}

export function canonicalizeUrl(raw: string): string {
  const url = new URL(unwrapGoogleUrl(raw));
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('Only web URLs can be saved.');
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

export function displayDomain(raw: string): string {
  return new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
}
