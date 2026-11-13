import { CmsNavigationEntry, CmsNavigationNode, Image } from '@spartacus/core';
import { MediaContainer } from '@spartacus/storefront';

import { Asset, Entry } from 'contentful';

import { ComponentSkeleton } from '../../../contentful/core/content-types';
import { isAsset, isEntry } from '../../../contentful/core/type-guards';
import { environment } from '../../../../environments/environment';
import { toCmsPersonalization } from '../../personalization/contentful-personalization.mapper';

// Maps the VWR content types (vwr*, authored in the Contentful environment vwr-poc) to the CMS data
// the VWR and Spartacus components expect. Port of the mock OCC bridge
// (~/Desktop/Avantor/mock-occ/src/cms/contentful-mapper.js), adapted to the integration library:
// the Contentful SDK resolves links, and Spartacus fetches navigation links by entry id.

type VwrEntry = Entry<ComponentSkeleton, undefined, string>;

/** Spartacus' Image plus the mime type (OCC media data has it; SVGs are not resized). */
type CmsImage = Image & { mime?: string };

const TYPE_CODES: Record<string, string> = {
  vwrHeroBanner: 'VwrHeroBannerComponent',
  vwrPromoBanner: 'VwrPromoBannerComponent',
  vwrRichText: 'CMSParagraphComponent',
  vwrProductTeaserList: 'VwrProductTeaserListComponent',
  vwrCategoryTileList: 'VwrCategoryTileListComponent',
  vwrBreadcrumb: 'VwrBreadcrumbComponent',
  vwrImageLink: 'SimpleBannerComponent',
  vwrLink: 'CMSLinkComponent',
  vwrNavigation: 'NavigationComponent',
};

const MAX_NAVIGATION_DEPTH = 4;

// Widths match the media formats in core/config/media.config.ts (Spartacus writes them into srcset).
// `medium` (768) fills the gap between 576 and 992: half-width desktop images (promo banner, ~720 px
// at 1440 px) would otherwise download the 992 px file.
const IMAGE_FORMATS = { mobile: 576, medium: 768, tablet: 992, desktop: 1440, widescreen: 1920 };
const RESIZABLE = new Set(['image/png', 'image/jpeg', 'image/webp']);
const CONTENTFUL_IMAGES = /^https:\/\/images\.ctfassets\.net\//;

const field = (entry: VwrEntry, name: string): unknown => entry.fields?.[name];
const text = (entry: VwrEntry, name: string): string | undefined => {
  const value = field(entry, name);
  return typeof value === 'string' ? value : undefined;
};

export const contentTypeOf = (entry: unknown): string | undefined => (isEntry(entry) ? entry.sys.contentType?.sys?.id : undefined);

/**
 * Product codes of a product carousel's `products` (OCC product URLs, as the Contentful SAP Commerce
 * app stores them), when every product comes from the product teaser API; otherwise undefined.
 */
export function teaserApiProductCodes(products: unknown, api = environment.productTeaserApi): string[] | undefined {
  if (!Array.isArray(products) || !products.length) return undefined;
  const prefix = `${api.baseUrl}/occ/v2/${api.baseSite}/products/`;
  const codes = products.map((url) => (typeof url === 'string' && url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)).trim() : ''));
  return codes.every((code) => code && !code.includes('/')) ? codes : undefined;
}

/**
 * A Contentful product carousel with products of the product teaser API: the storefront backend
 * doesn't have them, so the VWR product list renders it instead of Spartacus' product carousel.
 */
const isTeaserApiCarousel = (entry: VwrEntry): boolean =>
  contentTypeOf(entry) === 'ProductCarouselComponent' && !!teaserApiProductCodes(field(entry, 'products'));

export const isVwrEntry = (entry: unknown): entry is VwrEntry => {
  const type = contentTypeOf(entry);
  return !!type && (type in TYPE_CODES || type === 'vwrSpartacusComponent' || isTeaserApiCarousel(entry as VwrEntry));
};

/** Spartacus type code of a VWR entry (navigations and Spartacus components choose their own). */
export function vwrTypeCode(entry: VwrEntry): string | undefined {
  const type = contentTypeOf(entry);
  if (isTeaserApiCarousel(entry)) return TYPE_CODES['vwrProductTeaserList'];
  if (type === 'vwrNavigation') return text(entry, 'displayAs') ?? TYPE_CODES[type];
  if (type === 'vwrSpartacusComponent') return text(entry, 'typeCode');
  return type ? TYPE_CODES[type] : undefined;
}

/** Component mapping key: the flex type for CMSFlexComponent (e.g. LoginComponent), else the type code. */
export function vwrFlexType(entry: VwrEntry): string | undefined {
  const typeCode = vwrTypeCode(entry);
  const flexType = properties(entry)['flexType'];
  return typeCode === 'CMSFlexComponent' && typeof flexType === 'string' ? flexType : typeCode;
}

function properties(entry: VwrEntry): Record<string, unknown> {
  const value = field(entry, 'properties');
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const resolvedEntries = (value: unknown): VwrEntry[] => (Array.isArray(value) ? value.filter((item): item is VwrEntry => isEntry(item)) : []);

/**
 * Media for an asset: a format container (mobile ... widescreen) resized by Contentful's Images API
 * for raster images, otherwise one image (SVG). An empty alt text marks the image as decorative.
 */
export function toMedia(asset: unknown, altText?: string): MediaContainer | CmsImage | undefined {
  if (!isAsset(asset)) return undefined;
  const file = (asset as Asset<undefined, string>).fields.file;
  if (!file?.url) return undefined;
  const url = file.url.startsWith('//') ? `https:${file.url}` : file.url;
  const alt = altText ?? '';
  if (!CONTENTFUL_IMAGES.test(url) || !RESIZABLE.has(file.contentType)) {
    const image: CmsImage = { url, altText: alt, mime: file.contentType };
    return image;
  }
  const original = file.details?.image?.width ?? Infinity;
  const container: MediaContainer = Object.fromEntries(
    Object.entries(IMAGE_FORMATS).map(([format, width]) => [
      format,
      { url: `${url}?w=${Math.min(width, original)}&fm=webp&q=80`, altText: alt, mime: 'image/webp' },
    ]),
  );
  return container;
}

const linkEntry = (itemId: string): CmsNavigationEntry => ({ itemId, itemSuperType: 'AbstractCMSComponent', itemType: 'CMSLinkComponent' });

/**
 * A navigation tree. Spartacus fetches the link of every node by entry id: vwrLink entries for
 * leaves, and the vwrNavigation entry itself for a node with its own url (see toVwrComponent).
 */
function navigationNode(entry: VwrEntry, uid: string, depth: number, ancestors: Set<string>): CmsNavigationNode {
  const node: CmsNavigationNode = { uid, title: text(entry, 'title'), children: [], entries: [] };
  if (text(entry, 'url')) node.entries!.push(linkEntry(entry.sys.id));
  for (const child of resolvedEntries(field(entry, 'children'))) {
    const childUid = `${uid}_${child.sys.id}`;
    if (contentTypeOf(child) === 'vwrLink') {
      node.children!.push({ uid: childUid, title: text(child, 'label'), children: [], entries: [linkEntry(child.sys.id)] });
    } else if (contentTypeOf(child) === 'vwrNavigation' && depth < MAX_NAVIGATION_DEPTH && !ancestors.has(child.sys.id)) {
      node.children!.push(navigationNode(child, childUid, depth + 1, new Set([...ancestors, child.sys.id])));
    }
  }
  return node;
}

/** Banner data of a hero or promo banner entry (without personalization). */
function banner(entry: VwrEntry): Record<string, unknown> {
  return {
    headline: text(entry, 'headline'),
    text: text(entry, 'text'),
    ctaLabel: text(entry, 'ctaLabel'),
    ctaUrl: text(entry, 'ctaUrl'),
    media: toMedia(field(entry, 'image'), text(entry, 'imageAlt')),
  };
}

/** CMS data of a VWR entry; uid and typeCode are set by the caller. */
export function toVwrComponent(entry: VwrEntry): Record<string, unknown> {
  const media = (image: unknown, alt?: string) => toMedia(image, alt);
  switch (contentTypeOf(entry)) {
    case 'vwrHeroBanner':
      // The hero may be the baseline of a Contentful Personalization experience (nt_experiences).
      return { ...banner(entry), personalization: toCmsPersonalization(entry, banner) };
    case 'vwrPromoBanner':
      return { ...banner(entry), variant: text(entry, 'variant') };
    case 'vwrRichText':
      return { title: text(entry, 'headline'), content: renderRichText(field(entry, 'body')) };
    case 'vwrProductTeaserList':
      // Contentful chooses the products (codes); their names and images come from the product teaser
      // API (ProductTeaserService). Without codes, the list shows the API's first search results.
      return {
        headline: text(entry, 'headline'),
        productCodes: resolvedEntries(field(entry, 'teasers'))
          .map((t) => text(t, 'productCode')?.trim())
          .filter((code): code is string => !!code),
      };
    case 'ProductCarouselComponent':
      // Only carousels of teaser API products get here (isVwrEntry). The carousel's title is the headline.
      return { headline: text(entry, 'title'), productCodes: teaserApiProductCodes(field(entry, 'products')) ?? [] };
    case 'vwrCategoryTileList':
      return {
        headline: text(entry, 'headline'),
        tiles: resolvedEntries(field(entry, 'tiles')).map((t) => ({
          uid: t.sys.id,
          title: text(t, 'title'),
          categoryCode: text(t, 'categoryCode'),
          ctaLabel: text(t, 'ctaLabel'),
          media: media(field(t, 'image'), text(t, 'imageAlt')),
        })),
      };
    case 'vwrBreadcrumb':
      return { links: resolvedEntries(field(entry, 'links')).map((l) => ({ label: text(l, 'label'), url: text(l, 'url') })) };
    case 'vwrImageLink':
      return { urlLink: text(entry, 'url'), media: media(field(entry, 'image'), text(entry, 'imageAlt')) };
    case 'vwrLink':
      return { linkName: text(entry, 'label'), url: text(entry, 'url'), target: String(field(entry, 'openInNewWindow') === true) };
    case 'vwrNavigation':
      // linkName/url serve Spartacus' navigation item lookup of a node with its own url.
      return { navigationNode: navigationNode(entry, entry.sys.id, 1, new Set([entry.sys.id])), linkName: text(entry, 'title'), url: text(entry, 'url') };
    case 'vwrSpartacusComponent':
      return properties(entry);
    default:
      return {};
  }
}

/** The navigation notice ("© Avantor, Inc."), which Spartacus' footer navigation does not render. */
export const navigationNotice = (entry: VwrEntry): string | undefined =>
  contentTypeOf(entry) === 'vwrNavigation' ? text(entry, 'notice')?.trim() || undefined : undefined;

// Rich text: allow-list rendering. Unknown nodes (embedded entries/assets, tables) are dropped, text
// is escaped, and hyperlinks keep only relative, http(s) and mailto URIs. The paragraph component
// still sanitizes the HTML ([innerHTML]); this keeps the CMS from being the weak link.

export const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

const MARKS: Record<string, string> = { bold: 'strong', italic: 'em', underline: 'u', superscript: 'sup', subscript: 'sub', code: 'code' };

const BLOCKS: Record<string, string | null> = {
  document: null,
  paragraph: 'p',
  // The page's h1 belongs to the hero or the breadcrumb, so rich text starts at h2.
  'heading-1': 'h2',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'heading-4': 'h4',
  'heading-5': 'h5',
  'heading-6': 'h6',
  'unordered-list': 'ul',
  'ordered-list': 'ol',
  'list-item': 'li',
  blockquote: 'blockquote',
};

const SAFE_URI = /^(\/(?!\/)|#|https?:\/\/|mailto:)/i;

interface RichTextNode {
  nodeType?: string;
  value?: string;
  marks?: { type: string }[];
  content?: RichTextNode[];
  data?: { uri?: string };
}

function renderNode(node: RichTextNode | undefined): string {
  if (!node || typeof node !== 'object') return '';
  if (node.nodeType === 'text') {
    return (node.marks ?? []).reduce(
      (html, { type }) => (MARKS[type] ? `<${MARKS[type]}>${html}</${MARKS[type]}>` : html),
      escapeHtml(String(node.value ?? '')),
    );
  }
  const inner = () => (Array.isArray(node.content) ? node.content.map(renderNode).join('') : '');
  if (node.nodeType === 'hr') return '<hr>';
  if (node.nodeType === 'hyperlink') {
    const uri = String(node.data?.uri ?? '').trim();
    return SAFE_URI.test(uri) ? `<a href="${escapeHtml(uri)}">${inner()}</a>` : inner();
  }
  if (!node.nodeType || !(node.nodeType in BLOCKS)) return '';
  const tag = BLOCKS[node.nodeType];
  return tag ? `<${tag}>${inner()}</${tag}>` : inner();
}

/** HTML for a rich text document; an empty string for anything that is not one. */
export const renderRichText = (document: unknown): string =>
  (document as RichTextNode | undefined)?.nodeType === 'document' ? renderNode(document as RichTextNode) : '';
