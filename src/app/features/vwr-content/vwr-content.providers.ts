import { inject, provideAppInitializer } from '@angular/core';

import { CMS_COMPONENT_NORMALIZER, CMS_PAGE_NORMALIZER, CmsConfig, WindowRef, provideDefaultConfig } from '@spartacus/core';

import { VwrContentfulComponentNormalizer } from './contentful/vwr-contentful-component.normalizer';
import { VwrContentfulPageNormalizer } from './contentful/vwr-contentful-page.normalizer';

const loadVwrContentModule = () => import('./vwr-content.module');

// Contentful-authored VWR components (content types vwr*, mapped to these type codes by the VWR
// normalizers). The component code is lazy-loaded when the CMS page contains one of them.
// Provide after the Contentful library (AppModule providers): normalizers run in provider order.
export const vwrContentProviders = [
  { provide: CMS_COMPONENT_NORMALIZER, useExisting: VwrContentfulComponentNormalizer, multi: true },
  { provide: CMS_PAGE_NORMALIZER, useExisting: VwrContentfulPageNormalizer, multi: true },
  provideDefaultConfig(<CmsConfig>{
    featureModules: {
      vwrContent: {
        module: () => loadVwrContentModule().then((m) => m.VwrContentModule),
        cmsComponents: [
          'VwrHeroBannerComponent',
          'VwrPromoBannerComponent',
          'VwrProductTeaserListComponent',
          'VwrCategoryTileListComponent',
          'VwrBreadcrumbComponent',
        ],
      },
    },
  }),
  // Start downloading the VWR chunk while the CMS page is requested, instead of after its JSON
  // arrives: the hero (LCP image) can't be requested until this chunk renders it. Browser only and
  // fire-and-forget, so bootstrap never waits for it; Spartacus later resolves the same cached chunk.
  provideAppInitializer(() => {
    if (inject(WindowRef).isBrowser()) {
      loadVwrContentModule().catch(() => undefined);
    }
  }),
];
