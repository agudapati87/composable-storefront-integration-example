import { ChangeDetectionStrategy, Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { CmsComponentData, ImageFetchPriority, ImageLoadingStrategy, MediaModule } from '@spartacus/storefront';

import { Observable, concat, map, of, switchMap, take, timeout } from 'rxjs';

import { CtaLinkComponent } from '../../../../shared/components/cta-link/cta-link.component';
import { TrademarkTextComponent } from '../../../../shared/components/trademark-text/trademark-text.component';

import { CmsPersonalization, PersonalizationService, VariantSelection } from '../../../personalization';
import { Banner, VwrHeroBannerCms, toBanner } from '../../model/vwr-content.model';
import { VwrEntryService } from '../../services/vwr-entry.service';

interface HeroView {
  banner?: Banner;
  /** The variant is still being selected: the hero keeps its space but stays invisible. */
  pending: boolean;
  /** For impression tracking, when the visitor is in an experience. */
  tracked?: { baselineId: string; selection: VariantSelection };
}

/**
 * Page hero (type code `VwrHeroBannerComponent`). Its headline is the page's h1, and its image is
 * usually the LCP element, so it loads eagerly with high fetch priority.
 *
 * Personalized with Contentful Personalization when the hero entry is the baseline of an experience:
 * the visitor sees the variant of their audience, else the baseline. The hero stays invisible while
 * the variant is selected (at most `maxWaitMs`), so the baseline never flashes before a variant; the
 * first choice stays for the life of the component.
 */
@Component({
  selector: 'app-hero-banner',
  imports: [MediaModule, CtaLinkComponent, TrademarkTextComponent],
  templateUrl: './hero-banner.component.html',
  styleUrl: './hero-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroBannerComponent {
  private readonly componentData = inject<CmsComponentData<VwrHeroBannerCms>>(CmsComponentData);
  private readonly personalization = inject(PersonalizationService);
  private readonly entries = inject(VwrEntryService);

  protected readonly view = toSignal(this.componentData.data$.pipe(switchMap((data) => this.view$(data))));
  private readonly hero = viewChild<ElementRef<HTMLElement>>('hero');

  protected readonly loading = ImageLoadingStrategy.EAGER;
  protected readonly fetchPriority = ImageFetchPriority.HIGH;

  constructor() {
    effect((onCleanup) => {
      const element = this.hero()?.nativeElement;
      const tracked = this.view()?.tracked;
      if (!element || !tracked) return;
      this.personalization.observe(element, tracked.baselineId, tracked.selection);
      onCleanup(() => this.personalization.unobserve(element));
    });
  }

  private view$(data: VwrHeroBannerCms | undefined): Observable<HeroView> {
    const baseline = toBanner(data);
    const personalization = data?.personalization;
    if (!baseline || !personalization?.experiences?.length || !this.personalization.enabled) {
      return of({ banner: baseline, pending: false });
    }
    const resolved$ = this.personalization.selectVariant(personalization.baselineId, personalization.experiences).pipe(
      take(1),
      switchMap((selection) => this.resolve(selection, baseline, personalization)),
      timeout({ first: this.personalization.maxWaitMs, with: () => of<HeroView>({ banner: baseline, pending: false }) }),
    );
    return concat(of<HeroView>({ banner: baseline, pending: true }), resolved$);
  }

  /** The banner of a selection; the baseline (untracked) when a variant can't be loaded. */
  private resolve(selection: VariantSelection, baseline: Banner, personalization: CmsPersonalization<VwrHeroBannerCms>): Observable<HeroView> {
    const tracked = { baselineId: personalization.baselineId, selection };
    const { variantId } = selection;
    if (!variantId) return of({ banner: baseline, pending: false, tracked });
    if (selection.hidden) return of({ pending: false });

    const variant$ = variantId in personalization.variants ? of(personalization.variants[variantId]) : this.entries.get<VwrHeroBannerCms>(variantId);
    return variant$.pipe(
      map((variant) => {
        const banner = toBanner(variant);
        return banner ? { banner, pending: false, tracked } : { banner: baseline, pending: false };
      }),
    );
  }
}
