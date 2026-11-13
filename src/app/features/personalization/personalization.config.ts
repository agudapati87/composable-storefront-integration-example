import { Injectable, InjectionToken } from '@angular/core';

import { Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Contentful Personalization (Ninetailed) settings, `environment.personalization`. */
export interface PersonalizationConfig {
  /**
   * Organization id from Contentful Personalization (Settings > SDK keys). A public, browser-side
   * id, not a secret. Empty disables personalization: every visitor sees the baseline.
   */
  clientId: string;
  /** Personalization environment (Contentful Personalization > Settings), e.g. `development`. */
  environment: string;
  /** Timeout of a Ninetailed API request. */
  requestTimeoutMs: number;
  /**
   * Longest time a personalized component stays hidden while its variant is selected, so the
   * baseline does not flash before a variant. After it, the baseline shows and stays.
   */
  maxWaitMs: number;
  /**
   * Testing aid: `?nt_location=NY` evaluates location audiences for that US state instead of the
   * IP location (see location-override.ts). Keep false in production.
   */
  allowLocationOverride: boolean;
}

const defaults: PersonalizationConfig = { clientId: '', environment: 'main', requestTimeoutMs: 1500, maxWaitMs: 1500, allowLocationOverride: false };

export const PERSONALIZATION_CONFIG = new InjectionToken<PersonalizationConfig>('PERSONALIZATION_CONFIG', {
  providedIn: 'root',
  factory: () => ({ ...defaults, ...(environment as { personalization?: Partial<PersonalizationConfig> }).personalization }),
});

/**
 * Whether the visitor allows personalization. Ninetailed stores a profile id in the browser and the
 * Experience API derives the visitor's location from the IP address: personal data under GDPR.
 *
 * POC default: allowed. Before going live, provide an implementation backed by the consent manager
 * (e.g. Spartacus anonymous consents or the site's CMP) and agree the lawful basis with the DPO.
 */
@Injectable({ providedIn: 'root', useFactory: () => new PersonalizationConsent() })
export class PersonalizationConsent {
  isGiven(): Observable<boolean> {
    return of(true);
  }
}
