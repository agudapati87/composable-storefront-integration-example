import { isContentfulPreview, toContentfulLocale } from './helpers';

describe('toContentfulLocale', () => {
  it('should map a configured language isocode', () => {
    expect(toContentfulLocale({ en: 'en-US' }, 'en')).toBe('en-US');
  });

  it('should keep an unmapped language isocode', () => {
    expect(toContentfulLocale({ en: 'en-US' }, 'de')).toBe('de');
    expect(toContentfulLocale(undefined, 'de')).toBe('de');
  });

  it('should keep an empty language', () => {
    expect(toContentfulLocale({ en: 'en-US' }, undefined)).toBeUndefined();
  });
});

describe('isContentfulPreview', () => {
  const fakeWindow = (search: string, framed = false): Window => {
    const win = { location: { search } } as unknown as { location: { search: string }; self: unknown; top: unknown };
    win.self = win;
    win.top = framed ? {} : win;
    return win as unknown as Window;
  };

  it('should be false without a window (server)', () => {
    expect(isContentfulPreview(undefined)).toBe(false);
  });

  it('should be false for a regular visit', () => {
    expect(isContentfulPreview(fakeWindow(''))).toBe(false);
  });

  it('should be true with ?preview=true', () => {
    expect(isContentfulPreview(fakeWindow('?preview=true'))).toBe(true);
  });

  it('should be true inside an iframe', () => {
    expect(isContentfulPreview(fakeWindow('', true))).toBe(true);
  });
});
