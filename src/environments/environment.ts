// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  baseUrl: '',
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
    clientId: '',
    environment: 'development',
    // Testing aid: ?nt_location=NY (US state code or name) instead of the IP location.
    allowLocationOverride: true,
  },
  contentful: {
    spaceId: '',
    accessToken: '',
    previewAccessToken: '',
    environment: '',
    deliveryApiUrl: '',
    previewApiUrl: '',
  },
};

export const externalModules = [];
