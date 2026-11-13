import { provideConfig } from '@spartacus/core';
import { MediaConfig } from '@spartacus/storefront';

// Widths of the CMS image formats. They must match the widths the CMS bridge requests from
// Contentful's Images API (features/vwr-content/contentful/vwr-contentful-mapping.ts, IMAGE_FORMATS): Spartacus
// writes them into srcset, and the browser picks an image by these numbers.
export const mediaConfig = provideConfig(<MediaConfig>{
  mediaFormats: {
    mobile: { width: 576 },
    medium: { width: 768 },
    tablet: { width: 992 },
    desktop: { width: 1440 },
    widescreen: { width: 1920 },
  },
});
