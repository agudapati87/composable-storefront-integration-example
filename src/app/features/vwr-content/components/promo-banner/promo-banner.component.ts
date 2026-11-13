import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { CmsComponentData, MediaModule } from '@spartacus/storefront';

import { map } from 'rxjs';

import { CtaLinkComponent } from '../../../../shared/components/cta-link/cta-link.component';
import { TrademarkTextComponent } from '../../../../shared/components/trademark-text/trademark-text.component';

import { VwrPromoBannerCms, VwrPromoVariant, toBanner } from '../../model/vwr-content.model';

const VARIANTS: VwrPromoVariant[] = ['navy-inset', 'navy-split', 'gray-inset'];

/**
 * Image and text panel (type code `VwrPromoBannerComponent`). The CMS variant picks the look:
 * navy-inset (small image in a navy box), navy-split (navy panel overlapping a large image),
 * gray-inset (small image in a gray box). Unknown variants fall back to navy-inset.
 */
@Component({
  selector: 'app-promo-banner',
  imports: [AsyncPipe, MediaModule, CtaLinkComponent, TrademarkTextComponent],
  templateUrl: './promo-banner.component.html',
  styleUrl: './promo-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBannerComponent {
  private readonly componentData = inject<CmsComponentData<VwrPromoBannerCms>>(CmsComponentData);

  readonly promo$ = this.componentData.data$.pipe(
    map((data) => {
      const banner = toBanner(data);
      const variant = VARIANTS.includes(data?.variant as VwrPromoVariant) ? (data.variant as VwrPromoVariant) : 'navy-inset';
      return banner ? { ...banner, variant, navy: variant !== 'gray-inset', split: variant === 'navy-split' } : undefined;
    }),
  );
}
