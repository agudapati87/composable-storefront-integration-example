import { Injectable } from '@angular/core';

import { Config } from '@spartacus/core';

@Injectable({
  providedIn: 'root',
  useExisting: Config,
})
export abstract class ContentfulConfig {
  contentful?: {
    spaceId?: string;
    accessToken?: string;
    previewAccessToken?: string;
    environment?: string;
    deliveryApiUrl?: string;
    previewApiUrl?: string;
    slugMapping?: {
      [key: string]: string;
    };
    /** Maps Spartacus language isocodes to Contentful locale codes (e.g. `en` -> `en-US`); unmapped codes are sent as is. */
    localeMapping?: {
      [isocode: string]: string;
    };
  };
}

declare module '@spartacus/core' {
  interface Config extends ContentfulConfig {}
}
