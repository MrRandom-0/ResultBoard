import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findOrganicResults, parseGoogleResult } from '../../src/adapters/google-search';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadFixture(): Document {
  const html = readFileSync(resolve(__dirname, '../fixtures/google-results.html'), 'utf-8');
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

describe('findOrganicResults', () => {
  let doc: Document;

  beforeEach(() => {
    doc = loadFixture();
  });

  it('finds organic results from the fixture', () => {
    const results = findOrganicResults(doc);
    expect(results.length).toBe(3);
  });

  it('excludes ads with data-text-ad attribute', () => {
    const results = findOrganicResults(doc);
    const urls = results.map((r) => r.result.url);
    expect(urls).not.toContain('https://www.adsite.com/buy-now');
  });

  it('excludes Google internal URLs (People Also Ask)', () => {
    const results = findOrganicResults(doc);
    const domains = results.map((r) => r.result.domain);
    expect(domains.every((d) => !d.includes('google.com'))).toBe(true);
  });

  it('extracts title from h3 elements', () => {
    const results = findOrganicResults(doc);
    expect(results[0]!.result.title).toBe('React Tutorial - Getting Started');
  });

  it('extracts snippet from .VwiC3b elements', () => {
    const results = findOrganicResults(doc);
    expect(results[0]!.result.snippet).toContain('Learn React from scratch');
  });

  it('deduplicates results by canonical URL', () => {
    const results = findOrganicResults(doc);
    const canonicalUrls = results.map((r) => r.result.canonicalUrl);
    expect(new Set(canonicalUrls).size).toBe(canonicalUrls.length);
  });
});

describe('parseGoogleResult', () => {
  it('returns null for h3 without parent anchor', () => {
    const doc = new DOMParser().parseFromString(
      '<div class="MjjYud"><div class="g"><h3>No Link Here</h3></div></div>',
      'text/html'
    );
    const h3 = doc.querySelector('h3')!;
    expect(parseGoogleResult(h3, 'https://www.google.com/search?q=test')).toBeNull();
  });

  it('returns null for ads', () => {
    const doc = new DOMParser().parseFromString(
      '<div data-text-ad><div class="MjjYud"><div class="g"><a href="https://ad.com"><h3>Ad Title</h3></a></div></div></div>',
      'text/html'
    );
    const h3 = doc.querySelector('h3')!;
    expect(parseGoogleResult(h3, 'https://www.google.com/search?q=test')).toBeNull();
  });

  it('returns null for google.com links', () => {
    const doc = new DOMParser().parseFromString(
      '<div class="MjjYud"><div class="g"><a href="https://www.google.com/search?q=related"><h3>Related</h3></a></div></div>',
      'text/html'
    );
    const h3 = doc.querySelector('h3')!;
    expect(parseGoogleResult(h3, 'https://www.google.com/search?q=test')).toBeNull();
  });

  it('parses valid organic result', () => {
    const doc = new DOMParser().parseFromString(
      '<div class="MjjYud"><div class="g"><a href="https://example.com/page"><h3>Example Page</h3></a><div class="VwiC3b">A snippet.</div></div></div>',
      'text/html'
    );
    const h3 = doc.querySelector('h3')!;
    const result = parseGoogleResult(h3, 'https://www.google.com/search?q=example');
    expect(result).not.toBeNull();
    expect(result!.result.title).toBe('Example Page');
    expect(result!.result.domain).toBe('example.com');
    expect(result!.result.sourceQuery).toBe('example');
  });

  it('extracts sourceQuery from locationHref', () => {
    const doc = new DOMParser().parseFromString(
      '<div class="MjjYud"><div class="g"><a href="https://example.com/page"><h3>Test</h3></a></div></div>',
      'text/html'
    );
    const h3 = doc.querySelector('h3')!;
    const result = parseGoogleResult(h3, 'https://www.google.com/search?q=my+search+query');
    expect(result!.result.sourceQuery).toBe('my search query');
  });

  it('unwraps Google redirect links before validating the destination', () => {
    const target = encodeURIComponent('https://example.com/article?ref=docs');
    const doc = new DOMParser().parseFromString(
      `<div class="g"><a href="https://www.google.com/url?q=${target}"><h3>Wrapped result</h3></a></div>`,
      'text/html'
    );
    const result = parseGoogleResult(doc.querySelector('h3')!, 'https://www.google.com/search?q=wrapped');
    expect(result?.result.url).toBe('https://example.com/article?ref=docs');
    expect(result?.result.canonicalUrl).toBe('https://example.com/article?ref=docs');
  });
});
