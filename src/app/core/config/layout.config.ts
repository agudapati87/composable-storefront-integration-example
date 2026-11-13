import { provideConfig } from '@spartacus/core';
import { LayoutConfig } from '@spartacus/storefront';

// VWR header order (logo, search, sign-in, Order Entry link, mini cart, navigation) and the
// custom slot "SubHeroBreadcrumb" under the hero of LandingPage2Template, as on vwr.com.
// Arrays replace Spartacus' defaults (layoutConfigFactory) rather than merging.
export const layoutConfig = provideConfig(<LayoutConfig>{
  layoutSlots: {
    header: {
      slots: ['PreHeader', 'SiteLogo', 'SearchBox', 'SiteLogin', 'SiteLinks', 'MiniCart', 'NavigationBar'],
    },
    LandingPage2Template: {
      slots: ['Section1', 'SubHeroBreadcrumb', 'Section2A', 'Section2B', 'Section2C', 'Section3', 'Section4', 'Section5'],
    },
  },
});
