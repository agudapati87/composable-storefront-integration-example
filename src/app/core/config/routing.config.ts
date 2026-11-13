import { RoutingConfig, provideConfig } from '@spartacus/core';

// Category URLs "/c/<code>" (as in the CMS content and SAP sample data); "/category/<code>" stays
// valid. Spartacus generates links from the first path.
//
// `protected` is set statically: when undefined, Spartacus' SecurePortalConfigInitializer blocks
// the initial navigation on GET /basesites?fields=FULL to read `requiresAuthentication`, a full
// backend round trip before the CMS page request can start (FCP/LCP). It must match the base site:
// powertools-spa has requiresAuthentication=false. Set true for a secure-portal (login-only) site.
export const routingConfig = provideConfig(<RoutingConfig>{
  routing: {
    protected: false,
    routes: {
      category: { paths: ['c/:categoryCode', 'category/:categoryCode'], paramsMapping: { categoryCode: 'code' } },
    },
  },
});
