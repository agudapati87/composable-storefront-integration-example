import { Injectable } from '@angular/core';

import { CmsParagraphComponent, CmsStructureModel, ContentSlotComponentData, Converter } from '@spartacus/core';

import { Entry } from 'contentful';

import { PageSkeleton } from '../../../contentful/core/content-types';
import { escapeHtml, isVwrEntry, navigationNotice, vwrFlexType, vwrTypeCode } from './vwr-contentful-mapping';

/**
 * Runs after the library's page normalizer, which types slot components by content type id. For VWR
 * entries it sets the Spartacus type code instead (e.g. vwrNavigation -> FooterNavigationComponent),
 * so the VWR and standard Spartacus components render them, and adds the footer notice paragraph.
 */
@Injectable({ providedIn: 'root' })
export class VwrContentfulPageNormalizer implements Converter<Entry<PageSkeleton, undefined, string>, CmsStructureModel> {
  convert(_source: Entry<PageSkeleton, undefined, string>, target: CmsStructureModel = {}): CmsStructureModel {
    for (const slot of Object.values(target.page?.slots ?? {})) {
      if (!slot.components) continue;
      slot.components = slot.components.flatMap((component) => this.withVwrTypes(component, target));
    }
    return target;
  }

  private withVwrTypes(component: ContentSlotComponentData, target: CmsStructureModel): ContentSlotComponentData[] {
    const entry = component.properties?.data;
    if (!isVwrEntry(entry)) return [component];

    const typed = { ...component, typeCode: vwrTypeCode(entry), flexType: vwrFlexType(entry) };
    const notice = navigationNotice(entry);
    if (!notice) return [typed];

    // Spartacus' footer navigation does not render a notice, so it follows as its own paragraph.
    const uid = `${entry.sys.id}_notice`;
    const paragraph: CmsParagraphComponent = { uid, typeCode: 'CMSParagraphComponent', name: 'Navigation notice', content: `<p>${escapeHtml(notice)}</p>` };
    target.components ??= [];
    target.components.push(paragraph);
    return [typed, { uid, typeCode: 'CMSParagraphComponent', flexType: 'CMSParagraphComponent' }];
  }
}
