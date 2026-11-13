export type DeepPartial<T, Depth extends number = 15> = Depth extends 0
  ? T
  : T extends object
    ? {
        [P in keyof T]?: DeepPartial<T[P], Prev[Depth]>;
      }
    : T;

type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function toContentfulLocale(localeMapping: Record<string, string> | undefined, language?: string): string | undefined {
  return language ? (localeMapping?.[language] ?? language) : language;
}

/**
 * True when the storefront runs as a Contentful preview: `?preview=true` in the URL (the flag
 * ContentService uses to switch to the Preview API), or embedded in an iframe (Contentful's Live
 * Preview editor). Only then are inspector mode and live updates needed. Pass the browser window;
 * on the server (no window) it is false.
 */
export function isContentfulPreview(win: Window | undefined): boolean {
  if (!win) {
    return false;
  }
  if (new URLSearchParams(win.location.search).get('preview') === 'true') {
    return true;
  }
  try {
    return win.self !== win.top;
  } catch {
    // Cross-origin parent: accessing `top` can throw, which also means we are framed.
    return true;
  }
}
