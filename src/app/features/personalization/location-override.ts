import type { GeoLocation, NinetailedApiClient } from '@ninetailed/experience.js-shared';

// Testing aid (local/dev only, `personalization.allowLocationOverride`): `?nt_location=NY` or
// `?nt_location=New York` makes the Experience API evaluate audiences for that US state instead of
// the location of the visitor's IP. The choice lasts for the browser tab (sessionStorage), so it
// survives navigation; `?nt_location=clear` goes back to the IP location.

export const LOCATION_PARAM = 'nt_location';
const STORAGE_KEY = 'vwr.personalization.location';
const CLEAR = new Set(['', 'clear', 'off', 'none', 'ip']);

const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut',
  DE: 'Delaware', DC: 'District of Columbia', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, ' ');

/**
 * The US state of a parameter value: a state code (`NY`) or name (`New York`, `new-york`).
 * `null` clears the override; undefined for an unknown value.
 */
export function parseLocation(value: string): GeoLocation | null | undefined {
  const normalized = normalize(value);
  if (CLEAR.has(normalized)) return null;
  const code = Object.keys(US_STATES).find((key) => key.toLowerCase() === normalized || normalize(US_STATES[key]) === normalized);
  return code ? { region: US_STATES[code], regionCode: code, country: 'United States', countryCode: 'US' } : undefined;
}

/**
 * The location override of this tab: from the URL parameter (and remembered), else the remembered
 * one. Undefined without override, also when storage is unavailable.
 */
export function resolveLocationOverride(search: string, storage: Storage | undefined, onUnknown: (value: string) => void): GeoLocation | undefined {
  const param = new URLSearchParams(search).get(LOCATION_PARAM);
  try {
    if (param !== null) {
      const location = parseLocation(param);
      if (location === undefined) {
        onUnknown(param);
      } else if (location === null) {
        storage?.removeItem(STORAGE_KEY);
        return undefined;
      } else {
        storage?.setItem(STORAGE_KEY, JSON.stringify(location));
        return location;
      }
    }
    const stored = storage?.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as GeoLocation) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Makes the API client send the location with every profile update; the Experience API then uses
 * it instead of the IP location to evaluate location audiences.
 */
export function withLocation(apiClient: NinetailedApiClient, location: GeoLocation): NinetailedApiClient {
  const upsertProfile = apiClient.upsertProfile.bind(apiClient);
  apiClient.upsertProfile = (params, options) =>
    upsertProfile({ ...params, events: params.events.map((event) => ({ ...event, context: { ...event.context, location } })) }, options);
  return apiClient;
}
