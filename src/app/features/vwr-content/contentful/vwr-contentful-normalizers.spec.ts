import { TestBed } from '@angular/core/testing';

import { CmsComponent, CmsStructureModel } from '@spartacus/core';

import { Entry } from 'contentful';

import { ComponentSkeleton, PageSkeleton } from '../../../contentful/core/content-types';
import { RestrictionsService } from '../../../contentful/core/services/contentful-restrictions.service';
import { VwrContentfulComponentNormalizer } from './vwr-contentful-component.normalizer';
import { VwrContentfulPageNormalizer } from './vwr-contentful-page.normalizer';

const entry = (id: string, contentType: string, fields: Record<string, unknown>) =>
  ({ sys: { id, type: 'Entry', contentType: { sys: { id: contentType } } }, fields, metadata: { tags: [] } }) as unknown as Entry<
    ComponentSkeleton,
    undefined,
    string
  >;

describe('VWR Contentful normalizers', () => {
  let accessible: boolean;

  beforeEach(() => {
    accessible = true;
    TestBed.configureTestingModule({
      providers: [{ provide: RestrictionsService, useValue: { isEntryAccessible: () => accessible } }],
    });
  });

  describe('VwrContentfulComponentNormalizer', () => {
    let normalizer: VwrContentfulComponentNormalizer;

    beforeEach(() => (normalizer = TestBed.inject(VwrContentfulComponentNormalizer)));

    it('should replace the raw Contentful fields of a VWR entry', () => {
      const source = entry('hero1', 'vwrHeroBanner', { internalName: 'Hero', headline: 'Built around your workflow', image: { sys: { type: 'Link' } } });
      const result = normalizer.convert(source, { uid: 'hero1', typeCode: 'vwrHeroBanner', image: {} } as CmsComponent);

      expect(result).toEqual(
        jasmine.objectContaining({ uid: 'hero1', typeCode: 'VwrHeroBannerComponent', name: 'Hero', headline: 'Built around your workflow' }),
      );
      expect('image' in result).toBeFalse();
    });

    it('should leave other entries and inaccessible VWR entries to the library', () => {
      const target = { uid: 'x' };
      expect(normalizer.convert(entry('x', 'CMSLinkComponent', {}), target)).toBe(target);
      accessible = false;
      expect(normalizer.convert(entry('x', 'vwrLink', {}), target)).toBe(target);
    });
  });

  describe('VwrContentfulPageNormalizer', () => {
    it('should type VWR slot components for Spartacus and add the footer notice', () => {
      const footerNav = entry('nav1', 'vwrNavigation', { displayAs: 'FooterNavigationComponent', notice: '© Avantor, Inc.' });
      const login = entry('login1', 'vwrSpartacusComponent', { typeCode: 'CMSFlexComponent', properties: { flexType: 'LoginComponent' } });
      const other = { uid: 'demo1', typeCode: 'CMSLinkComponent', flexType: 'CMSLinkComponent', properties: { data: entry('demo1', 'CMSLinkComponent', {}) } };
      const target: CmsStructureModel = {
        page: {
          slots: {
            Footer: { components: [{ uid: 'nav1', typeCode: 'vwrNavigation', flexType: 'vwrNavigation', properties: { data: footerNav } }] },
            SiteLogin: {
              components: [{ uid: 'login1', typeCode: 'vwrSpartacusComponent', flexType: 'vwrSpartacusComponent', properties: { data: login } }, other],
            },
          },
        },
        components: [],
      };

      TestBed.inject(VwrContentfulPageNormalizer).convert({} as Entry<PageSkeleton, undefined, string>, target);

      const footer = target.page!.slots!['Footer'].components!;
      expect(footer.map((c) => [c.uid, c.typeCode, c.flexType])).toEqual([
        ['nav1', 'FooterNavigationComponent', 'FooterNavigationComponent'],
        ['nav1_notice', 'CMSParagraphComponent', 'CMSParagraphComponent'],
      ]);
      expect(target.components).toEqual([jasmine.objectContaining({ uid: 'nav1_notice', content: '<p>© Avantor, Inc.</p>' })]);
      expect(target.page!.slots!['SiteLogin'].components!.map((c) => [c.typeCode, c.flexType])).toEqual([
        ['CMSFlexComponent', 'LoginComponent'],
        ['CMSLinkComponent', 'CMSLinkComponent'],
      ]);
    });
  });
});
