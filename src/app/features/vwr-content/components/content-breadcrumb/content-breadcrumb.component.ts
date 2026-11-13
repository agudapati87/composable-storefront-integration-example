import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CmsService, I18nModule } from '@spartacus/core';
import { CmsComponentData } from '@spartacus/storefront';

import { combineLatest, map } from 'rxjs';

import { TrademarkTextComponent } from '../../../../shared/components/trademark-text/trademark-text.component';

import { toInternalPath } from '../../../../shared/utils/internal-path';
import { VwrBreadcrumbCms } from '../../model/vwr-content.model';

export interface Crumb {
  label: string;
  path: string;
}

/**
 * Editorial breadcrumb under the hero (type code `VwrBreadcrumbComponent`): the CMS trail plus
 * the current page title as the last, unlinked crumb. Spartacus' own BreadcrumbComponent derives
 * the trail from the URL, which cannot express "Home / Applications / Brands / VWR®".
 */
@Component({
  selector: 'app-content-breadcrumb',
  imports: [AsyncPipe, RouterLink, I18nModule, TrademarkTextComponent],
  templateUrl: './content-breadcrumb.component.html',
  styleUrl: './content-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentBreadcrumbComponent {
  private readonly componentData = inject<CmsComponentData<VwrBreadcrumbCms>>(CmsComponentData);
  private readonly cmsService = inject(CmsService);

  readonly trail$ = combineLatest([this.componentData.data$, this.cmsService.getCurrentPage()]).pipe(
    map(([data, page]) => ({ crumbs: toCrumbs(data?.links), current: page?.title?.trim() })),
  );
}

/** Links with a label and a same-site path; others are skipped (CMS data is untrusted). */
export function toCrumbs(links: VwrBreadcrumbCms['links'] = []): Crumb[] {
  return links.flatMap((link) => {
    const label = link?.label?.trim();
    const path = toInternalPath(link?.url);
    return label && path ? [{ label, path }] : [];
  });
}
