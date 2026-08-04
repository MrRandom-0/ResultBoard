import { describe, it, expect } from 'vitest';
import { canonicalizeUrl, displayDomain } from '../../src/utils/url';

describe('canonicalizeUrl', () => {
  it('removes tracking parameters', () => {
    const result = canonicalizeUrl('https://example.com/page?utm_source=google&utm_medium=cpc&id=5');
    expect(result).toBe('https://example.com/page?id=5');
  });

  it('removes all utm_ prefixed parameters', () => {
    const result = canonicalizeUrl('https://example.com/?utm_campaign=summer&utm_term=test&utm_custom=foo');
    expect(result).toBe('https://example.com/');
  });

  it('removes gclid, fbclid, and msclkid', () => {
    const result = canonicalizeUrl('https://example.com/page?gclid=abc&fbclid=def&msclkid=ghi&keep=yes');
    expect(result).toBe('https://example.com/page?keep=yes');
  });

  it('preserves generic ref parameters that may affect page content', () => {
    expect(canonicalizeUrl('https://example.com/docs?ref=api')).toBe('https://example.com/docs?ref=api');
  });

  it('unwraps Google redirect URLs', () => {
    const result = canonicalizeUrl('https://www.google.com/url?q=https://example.com/article&sa=U');
    expect(result).toBe('https://example.com/article');
  });

  it('unwraps Google redirect using url param', () => {
    const result = canonicalizeUrl('https://www.google.com/url?url=https://example.org/page');
    expect(result).toBe('https://example.org/page');
  });

  it('removes fragment', () => {
    const result = canonicalizeUrl('https://example.com/page#section-2');
    expect(result).toBe('https://example.com/page');
  });

  it('normalizes host to lowercase and removes www prefix', () => {
    const result = canonicalizeUrl('https://WWW.ExAmPlE.COM/Page');
    expect(result).toBe('https://example.com/Page');
  });

  it('preserves the destination protocol', () => {
    const result = canonicalizeUrl('http://example.com/page');
    expect(result).toBe('http://example.com/page');
  });

  it('removes trailing slash from non-root paths', () => {
    const result = canonicalizeUrl('https://example.com/page/');
    expect(result).toBe('https://example.com/page');
  });

  it('keeps trailing slash on root path', () => {
    const result = canonicalizeUrl('https://example.com/');
    expect(result).toBe('https://example.com/');
  });

  it('sorts query parameters alphabetically', () => {
    const result = canonicalizeUrl('https://example.com/search?z=1&a=2&m=3');
    expect(result).toBe('https://example.com/search?a=2&m=3&z=1');
  });

  it('throws on non-web protocols', () => {
    expect(() => canonicalizeUrl('ftp://example.com/file')).toThrow('Only web URLs can be saved.');
  });
});

describe('displayDomain', () => {
  it('extracts hostname from URL', () => {
    expect(displayDomain('https://www.example.com/page')).toBe('example.com');
  });

  it('preserves subdomains other than www', () => {
    expect(displayDomain('https://blog.example.com/post')).toBe('blog.example.com');
  });

  it('lowercases the hostname', () => {
    expect(displayDomain('https://EXAMPLE.COM/')).toBe('example.com');
  });
});
