import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CmsComponentData } from '@spartacus/storefront';

import { NEVER, Observable, Subject, of } from 'rxjs';

import { CmsExperience, PersonalizationService, VariantSelection } from '../../../personalization';
import { VwrHeroBannerCms } from '../../model/vwr-content.model';
import { VwrEntryService } from '../../services/vwr-entry.service';
import { HeroBannerComponent } from './hero-banner.component';

const experience: CmsExperience = {
  id: 'exp',
  type: 'nt_personalization',
  audienceId: 'aud',
  trafficAllocation: 1,
  distribution: [0, 1],
  sticky: false,
  components: [{ baselineId: 'hero', variants: [{ id: 'variant', hidden: false }] }],
};

const tracking = { experience: {} as never, audience: { id: 'aud' }, variantIndex: 1 };

const baseline: VwrHeroBannerCms = { uid: 'hero', headline: 'Built around your workflow' };
const personalized = (variants: Record<string, VwrHeroBannerCms> = {}): VwrHeroBannerCms => ({
  ...baseline,
  personalization: { baselineId: 'hero', experiences: [experience], variants },
});

describe('HeroBannerComponent', () => {
  let fixture: ComponentFixture<HeroBannerComponent>;
  let personalization: jasmine.SpyObj<PersonalizationService> & { enabled: boolean; maxWaitMs: number };
  let entries: jasmine.SpyObj<VwrEntryService>;

  function render(data: VwrHeroBannerCms, selection$: Observable<VariantSelection>) {
    personalization.selectVariant.and.returnValue(selection$);
    TestBed.configureTestingModule({
      imports: [HeroBannerComponent],
      providers: [
        provideRouter([]),
        { provide: CmsComponentData, useValue: { data$: of(data), uid: 'hero' } },
        { provide: PersonalizationService, useValue: personalization },
        { provide: VwrEntryService, useValue: entries },
      ],
    });
    fixture = TestBed.createComponent(HeroBannerComponent);
    fixture.detectChanges();
  }

  const hero = () => fixture.nativeElement.querySelector('.hero') as HTMLElement | null;
  const headline = () => hero()?.querySelector('h1')?.textContent?.trim();

  beforeEach(() => {
    personalization = Object.assign(jasmine.createSpyObj<PersonalizationService>('PersonalizationService', ['selectVariant', 'observe', 'unobserve']), {
      enabled: true,
      maxWaitMs: 1000,
    });
    entries = jasmine.createSpyObj<VwrEntryService>('VwrEntryService', ['get']);
  });

  it('should render a hero without personalization right away', () => {
    render(baseline, NEVER);
    expect(headline()).toBe('Built around your workflow');
    expect(hero()?.classList).not.toContain('hero--pending');
    expect(personalization.selectVariant).not.toHaveBeenCalled();
  });

  it('should keep the hero invisible until the variant is selected', () => {
    const selection$ = new Subject<VariantSelection>();
    render(personalized({ variant: { headline: 'New drug for the Northeast' } }), selection$);
    expect(hero()?.classList).toContain('hero--pending');

    selection$.next({ variantId: 'variant', hidden: false, tracking });
    fixture.detectChanges();

    expect(hero()?.classList).not.toContain('hero--pending');
    expect(headline()).toBe('New drug for the Northeast');
    expect(personalization.observe).toHaveBeenCalledWith(hero()!, 'hero', { variantId: 'variant', hidden: false, tracking });
  });

  it('should fetch a variant that the page did not resolve', () => {
    entries.get.and.returnValue(of({ headline: 'Fetched variant' }));
    render(personalized(), of({ variantId: 'variant', hidden: false, tracking }));
    expect(entries.get).toHaveBeenCalledWith('variant');
    expect(headline()).toBe('Fetched variant');
  });

  it('should show the baseline, untracked, when the variant cannot be loaded', () => {
    entries.get.and.returnValue(of(undefined));
    render(personalized(), of({ variantId: 'variant', hidden: false, tracking }));
    expect(headline()).toBe('Built around your workflow');
    expect(personalization.observe).not.toHaveBeenCalled();
  });

  it('should hide the hero for a hidden variant', () => {
    render(personalized(), of({ variantId: 'variant', hidden: true, tracking }));
    expect(hero()).toBeNull();
  });

  it('should show the baseline when the selection takes longer than maxWaitMs', fakeAsync(() => {
    render(personalized(), NEVER);
    expect(hero()?.classList).toContain('hero--pending');

    tick(1000);
    fixture.detectChanges();

    expect(hero()?.classList).not.toContain('hero--pending');
    expect(headline()).toBe('Built around your workflow');
  }));

  it('should not wait when personalization is disabled', () => {
    personalization.enabled = false;
    render(personalized(), NEVER);
    expect(hero()?.classList).not.toContain('hero--pending');
    expect(personalization.selectVariant).not.toHaveBeenCalled();
  });
});
