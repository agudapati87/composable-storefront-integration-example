/**
 * Origins the first page view needs before it can paint: the OCC backend (base sites, languages,
 * currencies), the Contentful Delivery API (CMS page), the Contentful Images API (hero = LCP image)
 * and the product teaser API. Built from the environment so each build preconnects to its own hosts.
 */
export function criticalOrigins(env: { baseUrl?: string; productTeaserApi?: { baseUrl?: string }; contentful?: { deliveryApiUrl?: string } }): string[] {
  const candidates = [
    env.contentful?.deliveryApiUrl ? `https://${env.contentful.deliveryApiUrl}` : undefined,
    'https://images.ctfassets.net',
    env.productTeaserApi?.baseUrl,
  ];
  const origins = new Set<string>();
  for (const candidate of candidates) {
    try {
      const url = candidate ? new URL(candidate) : undefined;
      if (url?.protocol === 'https:') {
        origins.add(url.origin);
      }
    } catch {
      // Placeholders such as 'YOUR_BASE_URL' or '' are not URLs: nothing to preconnect to.
    }
  }
  return [...origins];
}

/**
 * Adds `<link rel="preconnect">` for each origin not already hinted in index.html (browser only;
 * called from main.ts before bootstrap), so DNS, TCP and TLS run while Angular bootstraps and the
 * site-context requests are prepared, instead of delaying the first OCC call.
 * `crossorigin` because these hosts are called with fetch/XHR (CORS); image requests to
 * images.ctfassets.net still benefit from the DNS lookup.
 */
export function addPreconnectLinks(doc: Document, origins: string[]): void {
  for (const origin of origins) {
    if (doc.head.querySelector(`link[rel="preconnect"][href^="${origin}"]`)) {
      continue;
    }
    const link = doc.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = '';
    doc.head.appendChild(link);
  }
}
