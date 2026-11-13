import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UrlModule } from '@spartacus/core';
import { CmsComponentData, MediaModule } from '@spartacus/storefront';

import { map, switchMap } from 'rxjs';

import { TrademarkTextComponent } from '../../../../shared/components/trademark-text/trademark-text.component';

import { VwrProductTeaserListCms } from '../../model/vwr-content.model';
import { ProductTeaserService } from '../../services/product-teaser.service';

/**
 * Product cards (type code `VwrProductTeaserListComponent`): the headline and the choice of products
 * from the CMS (e.g. a Contentful product carousel), the products' title and image from the product
 * teaser API. Without a choice, the API's first search results. Each card is one link, named by its title.
 */
@Component({
  selector: 'app-product-teaser-list',
  imports: [AsyncPipe, RouterLink, UrlModule, MediaModule, TrademarkTextComponent],
  templateUrl: './product-teaser-list.component.html',
  styleUrl: './product-teaser-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTeaserListComponent {
  private readonly componentData = inject<CmsComponentData<VwrProductTeaserListCms>>(CmsComponentData);
  private readonly productTeaserService = inject(ProductTeaserService);

  readonly list$ = this.componentData.data$.pipe(
    switchMap((data) => {
      const codes = Array.isArray(data?.productCodes) ? data.productCodes.filter((code): code is string => typeof code === 'string') : [];
      const teasers$ = codes.length ? this.productTeaserService.getTeasersFor(codes) : this.productTeaserService.getTeasers();
      return teasers$.pipe(map((teasers) => ({ headline: data?.headline?.trim(), teasers })));
    }),
  );
}
