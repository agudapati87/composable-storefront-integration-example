import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';

import { LoggerService, WindowRef } from '@spartacus/core';

import type { Ninetailed } from '@ninetailed/experience.js';
import type { ComponentTypeEnum, ExperienceConfiguration, GeoLocation } from '@ninetailed/experience.js-shared';
import { Observable, catchError, filter, from, map, of, shareReplay, switchMap, take } from 'rxjs';

import { LOCATION_PARAM, resolveLocationOverride, withLocation } from './location-override';
import { PERSONALIZATION_CONFIG, PersonalizationConsent } from './personalization.config';
import { CmsExperience } from './personalization.model';

/** The variant selected for a visitor. */
export interface VariantSelection {
  /** Selected variant entry; undefined for the baseline. */
  variantId?: string;
  /** The variant hides the component. */
  hidden: boolean;
  /** For impression tracking (observe); undefined when the visitor is in no experience. */
  tracking?: { experience: ExperienceConfiguration; audience: { id: string } | null; variantIndex: number };
}

export const BASELINE: VariantSelection = { hidden: false };

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** CmsExperience in the format of the Ninetailed SDK (same as its Contentful ExperienceMapper). */
export function toExperienceConfiguration(experience: CmsExperience): ExperienceConfiguration {
  return {
    id: experience.id,
    type: experience.type,
    name: experience.name,
    ...(experience.audienceId ? { audience: { id: experience.audienceId } } : {}),
    trafficAllocation: experience.trafficAllocation,
    distribution: experience.distribution.map((_, index, all) => ({ index, start: sum(all.slice(0, index)), end: sum(all.slice(0, index + 1)) })),
    sticky: experience.sticky,
    components: experience.components.map((component) => ({
      // Type-only import keeps the SDK out of the main bundle; the enum value is this string.
      type: 'EntryReplacement' as ComponentTypeEnum.EntryReplacement,
      baseline: { id: component.baselineId },
      variants: component.variants.map((variant) => (variant.hidden ? { id: variant.id, hidden: true } : { id: variant.id })),
    })),
  };
}

/**
 * Contentful Personalization (Ninetailed) in the browser: loads the SDK lazily, sends a page event
 * per navigation (which evaluates the visitor's profile and audiences), selects variants and tracks
 * impressions. Disabled (everything resolves to the baseline) without a client id, on the server,
 * in Contentful preview (editors edit the baseline) and without the visitor's consent.
 */
@Injectable({ providedIn: 'root' })
export class PersonalizationService {
  private readonly config = inject(PERSONALIZATION_CONFIG);
  private readonly consent = inject(PersonalizationConsent);
  private readonly windowRef = inject(WindowRef);
  private readonly router = inject(Router);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private ninetailed$?: Observable<Ninetailed | undefined>;
  private ninetailed?: Ninetailed;

  /** Whether variants can be selected at all; false means the baseline, without waiting. */
  get enabled(): boolean {
    if (!this.config.clientId || !this.windowRef.isBrowser()) return false;
    const search = this.windowRef.nativeWindow?.location.search ?? '';
    return new URLSearchParams(search).get('preview') !== 'true';
  }

  get maxWaitMs(): number {
    return this.config.maxWaitMs;
  }

  /** Starts Ninetailed once (SDK chunk and first page event); undefined when disabled. */
  init(): Observable<Ninetailed | undefined> {
    this.ninetailed$ ??= (
      this.enabled
        ? this.consent.isGiven().pipe(
            take(1),
            switchMap((given) => (given ? from(this.create()) : of(undefined))),
            catchError((error: unknown) => {
              this.logger.warn('Personalization unavailable, showing baseline content.', error);
              return of(undefined);
            }),
          )
        : of(undefined)
    ).pipe(shareReplay(1));
    return this.ninetailed$;
  }

  /**
   * The variant of a baseline entry for this visitor. Emits once the profile is evaluated, again
   * when it changes; the baseline when personalization is disabled or fails.
   */
  selectVariant(baselineId: string, experiences: CmsExperience[]): Observable<VariantSelection> {
    return this.init().pipe(
      switchMap((ninetailed) => {
        if (!ninetailed) return of(BASELINE);
        return new Observable<VariantSelection>((subscriber) =>
          ninetailed.onSelectVariant({ baseline: { id: baselineId }, experiences: experiences.map(toExperienceConfiguration) }, (state) => {
            if (state.status === 'loading') return;
            if (state.status === 'error') {
              subscriber.next(BASELINE);
              return;
            }
            const tracking = state.experience ? { experience: state.experience, audience: state.audience, variantIndex: state.variantIndex } : undefined;
            const variant = state.variant as { id: string; hidden?: boolean };
            subscriber.next(variant.id === baselineId ? { hidden: false, tracking } : { variantId: variant.id, hidden: variant.hidden === true, tracking });
          }),
        );
      }),
      catchError((error: unknown) => {
        this.logger.warn('Variant selection failed, showing baseline content.', error);
        return of(BASELINE);
      }),
    );
  }

  /** Tracks views of the element showing the selection (baseline views count for experiments too). */
  observe(element: Element, baselineId: string, selection: VariantSelection): void {
    if (!this.ninetailed || !selection.tracking) return;
    const { experience, audience, variantIndex } = selection.tracking;
    this.ninetailed.observeElement({ element, experience, audience, variant: { id: selection.variantId ?? baselineId }, variantIndex });
  }

  unobserve(element: Element): void {
    this.ninetailed?.unobserveElement(element);
  }

  private locationOverride(): GeoLocation | undefined {
    const window = this.windowRef.nativeWindow;
    let storage: Storage | undefined;
    try {
      storage = window?.sessionStorage;
    } catch {
      storage = undefined;
    }
    return resolveLocationOverride(window?.location.search ?? '', storage, (value) =>
      this.logger.warn(`Personalization: unknown ${LOCATION_PARAM} "${value}", use a US state code or name (e.g. NY, New Jersey).`),
    );
  }

  private currentUrl(): string {
    return this.windowRef.nativeWindow?.location.href ?? '';
  }

  private async create(): Promise<Ninetailed> {
    const [{ Ninetailed }, { NinetailedApiClient }] = await Promise.all([import('@ninetailed/experience.js'), import('@ninetailed/experience.js-shared')]);
    const apiClient = new NinetailedApiClient({ clientId: this.config.clientId, environment: this.config.environment });
    const location = this.config.allowLocationOverride ? this.locationOverride() : undefined;
    if (location) {
      this.logger.info(`Personalization: location audiences use ${location.region} (?${LOCATION_PARAM}=clear for the IP location).`);
    }
    const ninetailed = new Ninetailed(location ? withLocation(apiClient, location) : apiClient, {
      requestTimeout: this.config.requestTimeoutMs,
      onError: (error) => this.logger.warn('Ninetailed error', error),
    });
    this.ninetailed = ninetailed;

    // A page event per URL. The first one goes out now, before Spartacus finishes the first
    // navigation (it waits for the CMS page), so the profile is ready about when the page is.
    let trackedUrl = this.currentUrl();
    void ninetailed.page();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => this.currentUrl()),
        filter((url) => url !== trackedUrl),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((url) => {
        trackedUrl = url;
        void ninetailed.page();
      });
    return ninetailed;
  }
}
