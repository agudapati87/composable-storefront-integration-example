import type { NinetailedApiClient } from '@ninetailed/experience.js-shared';

import { parseLocation, resolveLocationOverride, withLocation } from './location-override';

const NEW_YORK = { region: 'New York', regionCode: 'NY', country: 'United States', countryCode: 'US' };

/** In-memory sessionStorage. */
function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  } as Storage;
}

describe('location-override', () => {
  describe('parseLocation', () => {
    it('should accept US state codes and names in any case and spelling', () => {
      for (const value of ['NY', 'ny', 'New York', 'new-york', ' new_york ']) {
        expect(parseLocation(value)).withContext(value).toEqual(NEW_YORK);
      }
      expect(parseLocation('RI')?.region).toBe('Rhode Island');
    });

    it('should clear on empty or clear values', () => {
      expect(parseLocation('')).toBeNull();
      expect(parseLocation('clear')).toBeNull();
    });

    it('should not know other values', () => {
      expect(parseLocation('Atlantis')).toBeUndefined();
    });
  });

  describe('resolveLocationOverride', () => {
    it('should take the parameter and remember it for the tab', () => {
      const storage = memoryStorage();
      expect(resolveLocationOverride('?nt_location=NY', storage, fail)).toEqual(NEW_YORK);
      expect(resolveLocationOverride('', storage, fail)).toEqual(NEW_YORK);
    });

    it('should forget the override on clear', () => {
      const storage = memoryStorage();
      resolveLocationOverride('?nt_location=NY', storage, fail);
      expect(resolveLocationOverride('?nt_location=clear', storage, fail)).toBeUndefined();
      expect(resolveLocationOverride('', storage, fail)).toBeUndefined();
    });

    it('should report unknown values and keep the remembered override', () => {
      const storage = memoryStorage();
      resolveLocationOverride('?nt_location=NJ', storage, fail);
      const onUnknown = jasmine.createSpy('onUnknown');
      expect(resolveLocationOverride('?nt_location=Atlantis', storage, onUnknown)?.region).toBe('New Jersey');
      expect(onUnknown).toHaveBeenCalledWith('Atlantis');
    });

    it('should work without storage', () => {
      expect(resolveLocationOverride('?nt_location=NY', undefined, fail)).toEqual(NEW_YORK);
      expect(resolveLocationOverride('', undefined, fail)).toBeUndefined();
    });
  });

  it('should add the location to the events of every profile update', async () => {
    const upsertProfile = jasmine.createSpy('upsertProfile').and.resolveTo({});
    const client = withLocation({ upsertProfile } as unknown as NinetailedApiClient, NEW_YORK);

    await client.upsertProfile({ profileId: 'p', events: [{ type: 'page', context: { locale: 'en-US' } }] as never }, { locale: 'en-US' });

    expect(upsertProfile).toHaveBeenCalledWith({ profileId: 'p', events: [{ type: 'page', context: { locale: 'en-US', location: NEW_YORK } }] }, { locale: 'en-US' });
  });
});
