import { addPreconnectLinks, criticalOrigins } from './preconnect';

describe('criticalOrigins', () => {
  it('should collect the Contentful and teaser API origins', () => {
    expect(
      criticalOrigins({
        productTeaserApi: { baseUrl: 'https://teaser.example.com' },
        contentful: { deliveryApiUrl: 'cdn.contentful.com' },
      }),
    ).toEqual(['https://cdn.contentful.com', 'https://images.ctfassets.net', 'https://teaser.example.com']);
  });

  it('should skip placeholders, empty and non-https values', () => {
    expect(criticalOrigins({ productTeaserApi: { baseUrl: 'http://insecure.example.com' }, contentful: { deliveryApiUrl: '' } })).toEqual([
      'https://images.ctfassets.net',
    ]);
  });
});

describe('addPreconnectLinks', () => {
  afterEach(() => document.head.querySelectorAll('link[rel="preconnect"][href^="https://test-"]').forEach((l) => l.remove()));

  it('should add one preconnect link per origin, without duplicates', () => {
    addPreconnectLinks(document, ['https://test-a.example.com', 'https://test-b.example.com']);
    addPreconnectLinks(document, ['https://test-a.example.com']);

    const links = document.head.querySelectorAll<HTMLLinkElement>('link[rel="preconnect"][href^="https://test-"]');
    expect(links.length).toBe(2);
    expect(links[0].hasAttribute('crossorigin')).toBe(true);
  });
});
