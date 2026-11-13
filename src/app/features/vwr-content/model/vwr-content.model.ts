import { CmsComponent, Image } from '@spartacus/core';
import { MediaContainer } from '@spartacus/storefront';

import { CmsLink, toCmsLink } from '../../../shared/utils/cms-link';
import type { CmsPersonalization } from '../../personalization/personalization.model';

// CMS data of the VWR component types. The content is authored in Contentful (content types vwr*)
// and mapped to these type codes by the VWR normalizers (../contentful/vwr-contentful-mapping.ts).
// Every field is optional: CMS data is untrusted input.

/** A format container (mobile ... widescreen) or one image (SVG), see the mapper's toMedia. */
export type CmsMedia = MediaContainer | Image;

/** Type code `VwrHeroBannerComponent` (slot Section1). */
export interface VwrHeroBannerCms extends CmsComponent {
  headline?: string;
  text?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  media?: CmsMedia;
  /** Contentful Personalization experiences with this hero as baseline. */
  personalization?: CmsPersonalization<VwrHeroBannerCms>;
}

export type VwrPromoVariant = 'navy-inset' | 'navy-split' | 'gray-inset';

/** Type code `VwrPromoBannerComponent` (slots Section2A, Section3, Section5). */
export interface VwrPromoBannerCms extends Omit<VwrHeroBannerCms, 'personalization'> {
  variant?: VwrPromoVariant;
}

/**
 * Type code `VwrProductTeaserListComponent` (slot Section2C), from a Contentful product carousel or a
 * vwrProductTeaserList entry. Contentful chooses the products; ProductTeaserService loads them.
 */
export interface VwrProductTeaserListCms extends CmsComponent {
  headline?: string;
  /** Products in authored order; none: the first results of the product teaser API's search. */
  productCodes?: string[];
}

/** Type code `VwrCategoryTileListComponent` (slot Section4). */
export interface VwrCategoryTileListCms extends CmsComponent {
  headline?: string;
  tiles?: { uid?: string; title?: string; categoryCode?: string; ctaLabel?: string; media?: CmsMedia }[];
}

/** Type code `VwrBreadcrumbComponent` (slot SubHeroBreadcrumb). */
export interface VwrBreadcrumbCms extends CmsComponent {
  links?: { label?: string; url?: string }[];
}

/** A banner after validation: text trimmed, CTA only when both label and a safe link exist. */
export interface Banner {
  headline: string;
  text?: string;
  cta?: { label: string; link: CmsLink };
  media?: CmsMedia;
}

/** Validates banner data; undefined without a headline, which every VWR banner needs. */
export function toBanner(data: VwrHeroBannerCms | undefined | null): Banner | undefined {
  const headline = data?.headline?.trim();
  if (!headline) {
    return undefined;
  }
  const label = data?.ctaLabel?.trim();
  const link = toCmsLink(data?.ctaUrl);
  return {
    headline,
    text: data?.text?.trim() || undefined,
    cta: label && link ? { label, link } : undefined,
    media: data?.media,
  };
}
