import type { CreateClientParams } from 'contentful';

type Adapter = NonNullable<CreateClientParams['adapter']>;
type AdapterConfig = Parameters<Exclude<Adapter, string | readonly unknown[]>>[0];

/**
 * Axios adapter for the Contentful Delivery API that sends "simple" CORS requests: a plain GET
 * with the token as the `access_token` query parameter and no custom headers. The SDK's default
 * requests carry `Authorization` and `X-Contentful-User-Agent`, so the browser sends an OPTIONS
 * preflight before every distinct URL, an extra round trip on the CMS-page → LCP path.
 *
 * Use it only with the Delivery API token (published, public-read content, already shipped in the
 * bundle). Preview keeps the default header auth so the draft-content token never appears in URLs.
 */
export function contentfulSimpleRequestAdapter(accessToken: string): Adapter {
  return async (config: AdapterConfig) => {
    const url = buildUrl(config, accessToken);
    const res = await fetch(url, { method: 'GET', credentials: 'omit', signal: config.signal as AbortSignal | undefined });
    const data = await res.json().catch(() => undefined);
    const response = {
      data,
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
      config,
      request: { url },
    };
    const valid = config.validateStatus ? config.validateStatus(res.status) : res.ok;
    if (!valid) {
      // Shape of an AxiosError, as the SDK's error handler and retry interceptor read it.
      return Promise.reject(Object.assign(new Error(`Request failed with status code ${res.status}`), { isAxiosError: true, config, response }));
    }
    return response as never;
  };
}

function buildUrl(config: AdapterConfig, accessToken: string): string {
  const path = config.url ?? '';
  const base = /^https?:\/\//.test(path) ? path : `${(config.baseURL ?? '').replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  const url = new URL(base);
  url.port = ''; // The SDK writes ":443" into baseURL; drop it so the URL matches the preconnected origin.
  const params = { ...(config.params ?? {}), access_token: accessToken };
  const serializer = config.paramsSerializer;
  const serialize = typeof serializer === 'function' ? serializer : serializer?.serialize;
  const query = serialize ? serialize(params) : new URLSearchParams(params as Record<string, string>).toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ''}`;
}
