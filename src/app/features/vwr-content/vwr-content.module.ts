import { NgModule } from '@angular/core';

import { CmsConfig, provideDefaultConfig } from '@spartacus/core';

import { CategoryTileListComponent } from './components/category-tile-list/category-tile-list.component';
import { ContentBreadcrumbComponent } from './components/content-breadcrumb/content-breadcrumb.component';
import { HeroBannerComponent } from './components/hero-banner/hero-banner.component';
import { ProductTeaserListComponent } from './components/product-teaser-list/product-teaser-list.component';
import { PromoBannerComponent } from './components/promo-banner/promo-banner.component';

/** Lazy-loaded by Spartacus when a page contains one of the VWR type codes (see vwr-content.providers.ts). */
@NgModule({
  providers: [
    provideDefaultConfig(<CmsConfig>{
      cmsComponents: {
        VwrHeroBannerComponent: { component: HeroBannerComponent },
        VwrPromoBannerComponent: { component: PromoBannerComponent },
        VwrProductTeaserListComponent: { component: ProductTeaserListComponent },
        VwrCategoryTileListComponent: { component: CategoryTileListComponent },
        VwrBreadcrumbComponent: { component: ContentBreadcrumbComponent },
      },
    }),
  ],
})
export class VwrContentModule {}
