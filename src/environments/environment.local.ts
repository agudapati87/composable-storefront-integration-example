import { StoreDevtoolsModule } from '@ngrx/store-devtools';

// Generated from the macOS Keychain, gitignored: tokens must not be committed.
import { contentfulTokens } from './contentful-tokens.local';

export const environment = {
  production: false,
  // Public SAP Commerce demo backend that the imported Contentful demo content (powertools-spa) references.
  baseUrl: 'https://api.cm77gs48zv-contentfu1-d1-public.model-t.cc.commerce.ondemand.com',
  // External OCC backend for the product teaser list (ProductTeaserService), separate from baseUrl.
  productTeaserApi: {
    baseUrl: 'https://api.dws-apps.com',
    baseSite: 'electronics',
    pageSize: 5,
  },
  // Contentful Personalization (Ninetailed). clientId: Contentful Personalization > Settings > SDK
  // keys (organization id, public). Empty disables personalization: everyone sees the baseline.
  // environment: the org's Personalization environment (this org: `development`).
  personalization: {
    clientId: '5714ad92-f33c-4291-bb9b-865c2830d43f',
    environment: 'development',
    // Testing aid: ?nt_location=NY (US state code or name) instead of the IP location.
    allowLocationOverride: true,
  },
  contentful: {
    spaceId: '38i8excgznk0',
    accessToken: contentfulTokens.accessToken,
    previewAccessToken: contentfulTokens.previewAccessToken,
    environment: 'vwr-poc',
    deliveryApiUrl: 'cdn.contentful.com',
    previewApiUrl: 'preview.contentful.com',
  },
};

export const externalModules = [
  StoreDevtoolsModule.instrument({
    maxAge: 25,
  }),
];
