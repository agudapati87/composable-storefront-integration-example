import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { UrlModule } from '@spartacus/core';
import { CmsComponentData, MediaModule } from '@spartacus/storefront';

import { map } from 'rxjs';

import { TrademarkTextComponent } from '../../../../shared/components/trademark-text/trademark-text.component';

import { CmsMedia, VwrCategoryTileListCms } from '../../model/vwr-content.model';

export interface CategoryTile {
  key: string;
  title: string;
  categoryCode: string;
  ctaLabel?: string;
  media?: CmsMedia;
}

/**
 * Round category tiles (type code `VwrCategoryTileListComponent`). Each tile is one link to the
 * category page, named by its title; the "Shop now" pill is visual only.
 */
@Component({
  selector: 'app-category-tile-list',
  imports: [AsyncPipe, RouterLink, UrlModule, MediaModule, TrademarkTextComponent],
  templateUrl: './category-tile-list.component.html',
  styleUrl: './category-tile-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryTileListComponent {
  private readonly componentData = inject<CmsComponentData<VwrCategoryTileListCms>>(CmsComponentData);

  readonly list$ = this.componentData.data$.pipe(map((data) => ({ headline: data?.headline?.trim(), tiles: toCategoryTiles(data?.tiles) })));
}

/** Tiles with a title and a category code; others (half-edited CMS entries) are skipped. */
export function toCategoryTiles(tiles: VwrCategoryTileListCms['tiles'] = []): CategoryTile[] {
  return tiles.flatMap((tile, index) => {
    const title = tile?.title?.trim();
    const categoryCode = tile?.categoryCode?.trim();
    return title && categoryCode
      ? [{ key: tile.uid ?? `${categoryCode}-${index}`, title, categoryCode, ctaLabel: tile.ctaLabel?.trim() || undefined, media: tile.media }]
      : [];
  });
}
