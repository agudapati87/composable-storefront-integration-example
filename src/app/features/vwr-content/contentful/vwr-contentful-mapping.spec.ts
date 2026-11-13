import { CmsNavigationNode } from '@spartacus/core';

import { Entry } from 'contentful';

import { ComponentSkeleton } from '../../../contentful/core/content-types';
import { environment } from '../../../../environments/environment';
import {
  isVwrEntry,
  navigationNotice,
  renderRichText,
  teaserApiProductCodes,
  toMedia,
  toVwrComponent,
  vwrFlexType,
  vwrTypeCode,
} from './vwr-contentful-mapping';

type VwrEntry = Entry<ComponentSkeleton, undefined, string>;

const entry = (id: string, contentType: string, fields: Record<string, unknown>): VwrEntry =>
  ({ sys: { id, type: 'Entry', contentType: { sys: { id: contentType } } }, fields, metadata: { tags: [] } }) as unknown as VwrEntry;

const { baseUrl, baseSite } = environment.productTeaserApi;
const productUrl = (code: string) => `${baseUrl}/occ/v2/${baseSite}/products/${code}`;

const asset = (url: string, contentType: string, width?: number) => ({
  sys: { id: 'a', type: 'Asset' },
  fields: { file: { url, contentType, details: { image: { width } } } },
});

describe('vwr-contentful-mapping', () => {
  describe('type codes', () => {
    it('should map VWR content types to Spartacus type codes', () => {
      expect(vwrTypeCode(entry('1', 'vwrHeroBanner', {}))).toBe('VwrHeroBannerComponent');
      expect(vwrTypeCode(entry('1', 'vwrRichText', {}))).toBe('CMSParagraphComponent');
      expect(vwrTypeCode(entry('1', 'vwrImageLink', {}))).toBe('SimpleBannerComponent');
    });

    it('should let navigations and Spartacus components choose their type code', () => {
      expect(vwrTypeCode(entry('1', 'vwrNavigation', { displayAs: 'FooterNavigationComponent' }))).toBe('FooterNavigationComponent');
      expect(vwrTypeCode(entry('1', 'vwrNavigation', {}))).toBe('NavigationComponent');
      expect(vwrTypeCode(entry('1', 'vwrSpartacusComponent', { typeCode: 'MiniCartComponent' }))).toBe('MiniCartComponent');
    });

    it('should use the flex type of a CMSFlexComponent as mapping key', () => {
      const login = entry('1', 'vwrSpartacusComponent', { typeCode: 'CMSFlexComponent', properties: { flexType: 'LoginComponent' } });
      expect(vwrFlexType(login)).toBe('LoginComponent');
      expect(vwrFlexType(entry('1', 'vwrPromoBanner', {}))).toBe('VwrPromoBannerComponent');
    });

    it('should recognize only VWR entries', () => {
      expect(isVwrEntry(entry('1', 'vwrLink', {}))).toBeTrue();
      expect(isVwrEntry(entry('1', 'CMSLinkComponent', {}))).toBeFalse();
      expect(isVwrEntry({ sys: { type: 'Link', id: '1' } })).toBeFalse();
    });
  });

  describe('product carousels', () => {
    const carousel = (products: unknown[], title?: string) => entry('c1', 'ProductCarouselComponent', { name: 'Carousel', title, products });

    it('should read the product codes of teaser API product URLs, in order', () => {
      expect(teaserApiProductCodes([productUrl('25384-342'), productUrl('1320808')])).toEqual(['25384-342', '1320808']);
    });

    it('should give no codes unless every product comes from the teaser API', () => {
      expect(teaserApiProductCodes([productUrl('1'), 'https://other.example.com/occ/v2/x/products/2'])).toBeUndefined();
      expect(teaserApiProductCodes([productUrl('')])).toBeUndefined();
      expect(teaserApiProductCodes([])).toBeUndefined();
      expect(teaserApiProductCodes('not a list')).toBeUndefined();
    });

    it('should render a carousel of teaser API products as the VWR product list', () => {
      const vwrCarousel = carousel([productUrl('1'), productUrl('2')], 'Best sellers');
      expect(isVwrEntry(vwrCarousel)).toBeTrue();
      expect(vwrTypeCode(vwrCarousel)).toBe('VwrProductTeaserListComponent');
      expect(toVwrComponent(vwrCarousel)).toEqual({ headline: 'Best sellers', productCodes: ['1', '2'] });
    });

    it('should leave other carousels to Spartacus', () => {
      expect(isVwrEntry(carousel(['https://other.example.com/occ/v2/x/products/2']))).toBeFalse();
      expect(isVwrEntry(carousel([]))).toBeFalse();
    });

    it('should read the product codes of a product teaser list, skipping unresolved and empty teasers', () => {
      const list = entry('l1', 'vwrProductTeaserList', {
        headline: 'Order our best sellers',
        teasers: [entry('t1', 'vwrProductTeaser', { productCode: ' 89495-442 ' }), { sys: { type: 'Link', id: 'x' } }, entry('t2', 'vwrProductTeaser', {})],
      });
      expect(toVwrComponent(list)).toEqual({ headline: 'Order our best sellers', productCodes: ['89495-442'] });
    });
  });

  describe('toMedia', () => {
    it('should resize raster images on images.ctfassets.net per format, capped at the original width', () => {
      const media = toMedia(asset('//images.ctfassets.net/s/a/b/hero.jpg', 'image/jpeg', 1200), 'Lab') as Record<string, { url: string; altText: string }>;
      expect(media['mobile'].url).toBe('https://images.ctfassets.net/s/a/b/hero.jpg?w=576&fm=webp&q=80');
      expect(media['widescreen'].url).toBe('https://images.ctfassets.net/s/a/b/hero.jpg?w=1200&fm=webp&q=80');
      expect(media['desktop'].altText).toBe('Lab');
    });

    it('should keep an SVG as one decorative image', () => {
      expect(toMedia(asset('//images.ctfassets.net/s/a/b/logo.svg', 'image/svg+xml'))).toEqual({
        url: 'https://images.ctfassets.net/s/a/b/logo.svg',
        altText: '',
        mime: 'image/svg+xml',
      } as never);
    });

    it('should ignore unresolved links', () => {
      expect(toMedia({ sys: { type: 'Link', linkType: 'Asset', id: 'a' } })).toBeUndefined();
    });
  });

  describe('toVwrComponent', () => {
    it('should map a navigation tree, linking nodes to the entries Spartacus fetches', () => {
      const link = entry('link1', 'vwrLink', { label: 'Promotions', url: '/promotions' });
      const group = entry('group1', 'vwrNavigation', { title: 'Shopping', children: [link, { sys: { type: 'Link', id: 'missing' } }] });
      const root = entry('root', 'vwrNavigation', { title: 'Footer', url: '/all', children: [group] });

      const { navigationNode, url, linkName } = toVwrComponent(root) as { navigationNode: CmsNavigationNode; url: string; linkName: string };

      expect(navigationNode.entries).toEqual([{ itemId: 'root', itemSuperType: 'AbstractCMSComponent', itemType: 'CMSLinkComponent' }]);
      expect(navigationNode.children![0].uid).toBe('root_group1');
      expect(navigationNode.children![0].children).toEqual([
        {
          uid: 'root_group1_link1',
          title: 'Promotions',
          children: [],
          entries: [{ itemId: 'link1', itemSuperType: 'AbstractCMSComponent', itemType: 'CMSLinkComponent' }],
        },
      ]);
      expect([url, linkName]).toEqual(['/all', 'Footer']);
    });

    it('should stop at circular navigation references', () => {
      const root = entry('root', 'vwrNavigation', { title: 'Root' });
      root.fields['children'] = [root] as never;
      expect((toVwrComponent(root)['navigationNode'] as CmsNavigationNode).children).toEqual([]);
    });

    it('should map a link with its target as a string, as OCC does', () => {
      expect(toVwrComponent(entry('1', 'vwrLink', { label: 'Order Entry', url: '/quick-order', openInNewWindow: true }))).toEqual({
        linkName: 'Order Entry',
        url: '/quick-order',
        target: 'true',
      });
    });

    it('should pass on the properties of a Spartacus component', () => {
      expect(toVwrComponent(entry('1', 'vwrSpartacusComponent', { properties: { shownProductCount: '3' } }))).toEqual({ shownProductCount: '3' });
      expect(toVwrComponent(entry('1', 'vwrSpartacusComponent', { properties: ['not', 'an', 'object'] }))).toEqual({});
    });
  });

  it('should return the trimmed navigation notice', () => {
    expect(navigationNotice(entry('1', 'vwrNavigation', { notice: ' © Avantor, Inc. ' }))).toBe('© Avantor, Inc.');
    expect(navigationNotice(entry('1', 'vwrNavigation', { notice: '  ' }))).toBeUndefined();
  });

  describe('renderRichText', () => {
    const doc = (...content: unknown[]) => ({ nodeType: 'document', content });

    it('should render allowed blocks and marks, escaping text', () => {
      const html = renderRichText(doc({ nodeType: 'paragraph', content: [{ nodeType: 'text', value: 'A <b>&', marks: [{ type: 'bold' }] }] }));
      expect(html).toBe('<p><strong>A &lt;b&gt;&amp;</strong></p>');
    });

    it('should start headings at h2', () => {
      expect(renderRichText(doc({ nodeType: 'heading-1', content: [{ nodeType: 'text', value: 'Title' }] }))).toBe('<h2>Title</h2>');
    });

    it('should drop unsafe hyperlinks and unknown nodes', () => {
      const html = renderRichText(
        doc(
          { nodeType: 'hyperlink', data: { uri: 'javascript:alert(1)' }, content: [{ nodeType: 'text', value: 'x' }] },
          { nodeType: 'hyperlink', data: { uri: '/c/chemicals' }, content: [{ nodeType: 'text', value: 'y' }] },
          { nodeType: 'embedded-entry-block', content: [{ nodeType: 'text', value: 'z' }] },
        ),
      );
      expect(html).toBe('x<a href="/c/chemicals">y</a>');
    });

    it('should return an empty string for anything but a document', () => {
      expect(renderRichText('<script>')).toBe('');
      expect(renderRichText(undefined)).toBe('');
    });
  });
});
