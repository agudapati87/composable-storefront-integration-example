export const environment = {
  production: true,
  baseUrl: 'YOUR_BASE_URL',
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
    allowLocationOverride: false,
  },
  contentful: {
    spaceId: 'YOUR_SPACE_ID',
    accessToken: 'YOUR_DELIVERY_API_TOKEN',
    previewAccessToken: 'YOUR_PREVIEW_API_TOKEN',
    environment: 'master',
    deliveryApiUrl: 'cdn.contentful.com',
    previewApiUrl: 'preview.contentful.com',
  },
};

export const externalModules = [];
