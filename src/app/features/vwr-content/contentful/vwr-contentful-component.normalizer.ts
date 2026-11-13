import { Injectable, inject } from '@angular/core';

import { CmsComponent, Converter } from '@spartacus/core';

import { Entry } from 'contentful';

import { ComponentSkeleton } from '../../../contentful/core/content-types';
import { RestrictionsService } from '../../../contentful/core/services/contentful-restrictions.service';
import { isVwrEntry, toVwrComponent, vwrTypeCode } from './vwr-contentful-mapping';

/**
 * Converts VWR entries (vwr*) to the CMS data of their Spartacus type codes. Runs after the
 * library's normalizers and replaces their output (raw Contentful fields) for VWR entries only.
 */
@Injectable({ providedIn: 'root' })
export class VwrContentfulComponentNormalizer implements Converter<Entry<ComponentSkeleton, undefined, string>, CmsComponent> {
  private readonly restrictionsService = inject(RestrictionsService);

  convert(source: Entry<ComponentSkeleton, undefined, string>, target: CmsComponent): CmsComponent {
    if (!isVwrEntry(source) || !this.restrictionsService.isEntryAccessible(source)) {
      return target;
    }
    const fields = source.fields as Record<string, unknown>;
    const name = [fields['internalName'], fields['title'], fields['label'], fields['name']].find((value) => typeof value === 'string');
    return {
      ...toVwrComponent(source),
      uid: source.sys.id,
      typeCode: vwrTypeCode(source),
      name: (name as string | undefined) ?? source.sys.id,
      modifiedTime: source.sys.updatedAt ? new Date(source.sys.updatedAt) : undefined,
    };
  }
}
