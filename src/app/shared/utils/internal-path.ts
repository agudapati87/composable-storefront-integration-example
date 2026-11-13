/**
 * Returns `url` when it is a same-site absolute path ("/deals"), otherwise undefined.
 * CMS-authored URLs are untrusted: protocol-relative ("//evil.example"), absolute and
 * `javascript:` URLs are rejected so CMS content cannot create off-site or script links.
 */
export function toInternalPath(url: string | undefined | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return undefined;
  }
  return trimmed;
}
