import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WindowRef } from '@spartacus/core';

import type { Ninetailed } from '@ninetailed/experience.js';
import { firstValueFrom, of } from 'rxjs';

import { PERSONALIZATION_CONFIG, PersonalizationConfig, PersonalizationConsent } from './personalization.config';
import { CmsExperience } from './personalization.model';
import { BASELINE, PersonalizationService, toExperienceConfiguration } from './personalization.service';

const experience: CmsExperience = {
  id: 'exp-id',
  type: 'nt_personalization',
  name: 'Personalization example',
  audienceId: 'aud-id',
  trafficAllocation: 1,
  distribution: [0.25, 0.75],
  sticky: false,
  components: [{ baselineId: 'hero', variants: [{ id: 'variant', hidden: false }, { id: 'gone', hidden: true }] }],
};

const config: PersonalizationConfig = { clientId: 'client', environment: 'main', requestTimeoutMs: 1000, maxWaitMs: 1000, allowLocationOverride: false };

function setup(options: { config?: Partial<PersonalizationConfig>; browser?: boolean; search?: string; consent?: boolean } = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: PERSONALIZATION_CONFIG, useValue: { ...config, ...options.config } },
      { provide: PersonalizationConsent, useValue: { isGiven: () => of(options.consent ?? true) } },
      {
        provide: WindowRef,
        useValue: { isBrowser: () => options.browser ?? true, nativeWindow: { location: { search: options.search ?? '', href: 'https://localhost/' } } },
      },
    ],
  });
  return TestBed.inject(PersonalizationService);
}

/** A fake SDK whose onSelectVariant reports the given state. */
function fakeNinetailed(state: unknown) {
  return {
    onSelectVariant: jasmine.createSpy('onSelectVariant').and.callFake((_args: unknown, cb: (s: unknown) => void) => {
      cb({ status: 'loading' });
      cb(state);
      return () => undefined;
    }),
    observeElement: jasmine.createSpy('observeElement'),
  } as unknown as Ninetailed & { onSelectVariant: jasmine.Spy; observeElement: jasmine.Spy };
}

describe('PersonalizationService', () => {
  it('should map an experience to the SDK format', () => {
    expect(toExperienceConfiguration(experience)).toEqual({
      id: 'exp-id',
      type: 'nt_personalization',
      name: 'Personalization example',
      audience: { id: 'aud-id' },
      trafficAllocation: 1,
      distribution: [
        { index: 0, start: 0, end: 0.25 },
        { index: 1, start: 0.25, end: 1 },
      ],
      sticky: false,
      components: [{ type: 'EntryReplacement', baseline: { id: 'hero' }, variants: [{ id: 'variant' }, { id: 'gone', hidden: true }] }],
    } as never);
  });

  describe('enabled', () => {
    it('should be enabled with a client id in the browser', () => {
      expect(setup().enabled).toBeTrue();
    });

    it('should be disabled without client id, on the server and in Contentful preview', () => {
      expect(setup({ config: { clientId: '' } }).enabled).toBeFalse();
      TestBed.resetTestingModule();
      expect(setup({ browser: false }).enabled).toBeFalse();
      TestBed.resetTestingModule();
      expect(setup({ search: '?preview=true' }).enabled).toBeFalse();
    });
  });

  it('should select the baseline without the SDK when disabled', async () => {
    const service = setup({ config: { clientId: '' } });
    expect(await firstValueFrom(service.selectVariant('hero', [experience]))).toEqual(BASELINE);
  });

  it('should select the baseline without consent', async () => {
    const service = setup({ consent: false });
    expect(await firstValueFrom(service.init())).toBeUndefined();
    expect(await firstValueFrom(service.selectVariant('hero', [experience]))).toEqual(BASELINE);
  });

  describe('with the SDK', () => {
    const tracking = { experience: toExperienceConfiguration(experience), audience: { id: 'aud-id' }, variantIndex: 1 };

    function withSdk(state: unknown) {
      const service = setup();
      const ninetailed = fakeNinetailed(state);
      spyOn(service, 'init').and.returnValue(of(ninetailed));
      (service as unknown as { ninetailed: Ninetailed }).ninetailed = ninetailed;
      return { service, ninetailed };
    }

    it('should select the variant of the visitor, skipping the loading state', async () => {
      const { service, ninetailed } = withSdk({ status: 'success', variant: { id: 'variant' }, ...tracking });

      const selection = await firstValueFrom(service.selectVariant('hero', [experience]));

      expect(selection).toEqual({ variantId: 'variant', hidden: false, tracking });
      expect(ninetailed.onSelectVariant.calls.mostRecent().args[0]).toEqual({ baseline: { id: 'hero' }, experiences: [toExperienceConfiguration(experience)] });
    });

    it('should report a hidden variant', async () => {
      const { service } = withSdk({ status: 'success', variant: { id: 'gone', hidden: true }, ...tracking });
      expect((await firstValueFrom(service.selectVariant('hero', [experience]))).hidden).toBeTrue();
    });

    it('should select the baseline for visitors outside the audience', async () => {
      const { service } = withSdk({ status: 'success', variant: { id: 'hero' }, experience: null, audience: null, variantIndex: 0 });
      expect(await firstValueFrom(service.selectVariant('hero', [experience]))).toEqual({ hidden: false, tracking: undefined });
    });

    it('should fall back to the baseline on errors', async () => {
      const { service } = withSdk({ status: 'error', variant: { id: 'hero' }, error: new Error('timeout') });
      expect(await firstValueFrom(service.selectVariant('hero', [experience]))).toEqual(BASELINE);
    });

    it('should track views of the selected variant', () => {
      const { service, ninetailed } = withSdk({});
      const element = document.createElement('div');

      service.observe(element, 'hero', { variantId: 'variant', hidden: false, tracking });
      service.observe(element, 'hero', { hidden: false });

      expect(ninetailed.observeElement).toHaveBeenCalledOnceWith({ element, ...tracking, variant: { id: 'variant' } });
    });
  });
});
