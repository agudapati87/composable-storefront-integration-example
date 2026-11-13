import { inject, provideAppInitializer } from '@angular/core';

import { PersonalizationService } from './personalization.service';

export { toCmsPersonalization } from './contentful-personalization.mapper';
export { PersonalizationConsent, PERSONALIZATION_CONFIG } from './personalization.config';
export type { PersonalizationConfig } from './personalization.config';
export type { CmsExperience, CmsPersonalization } from './personalization.model';
export { BASELINE, PersonalizationService } from './personalization.service';
export type { VariantSelection } from './personalization.service';

// Starts Contentful Personalization at bootstrap (browser only, fire-and-forget): the SDK chunk and
// the visitor's profile load in parallel with the CMS page, instead of after the hero renders.
export const personalizationProviders = [
  provideAppInitializer(() => {
    inject(PersonalizationService).init().subscribe();
  }),
];
