import { toInternalPath } from './internal-path';

/** A CMS-authored link the storefront may render: a same-site path or an https URL. */
export type CmsLink = { internal: string } | { external: string };

/**
 * Classifies a CMS-authored URL. Same-site paths ("/c/lab-furniture") become router links;
 * absolute https URLs (e.g. a brochure PDF on another Avantor host) become plain links.
 * Anything else (http, javascript:, protocol-relative, relative) is rejected, so editors
 * cannot create script or downgrade links.
 */
export function toCmsLink(url: string | undefined | null): CmsLink | undefined {
  const internal = toInternalPath(url);
  if (internal) {
    return { internal };
  }
  const trimmed = url?.trim();
  if (!trimmed || !/^https:\/\//i.test(trimmed)) {
    return undefined;
  }
  try {
    return { external: new URL(trimmed).href };
  } catch {
    return undefined;
  }
}
