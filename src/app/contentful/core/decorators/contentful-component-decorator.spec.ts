import { Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ContentSlotComponentData, WindowRef } from '@spartacus/core';

import { ContentfulLivePreviewService } from '../services/contentful-live-preview.service';
import { ContentfulComponentDecorator } from './contentful-component-decorator';

describe('ContentfulComponentDecorator', () => {
  let livePreviewService: jasmine.SpyObj<ContentfulLivePreviewService>;
  let renderer: jasmine.SpyObj<Renderer2>;
  let element: HTMLElement;
  let component: ContentSlotComponentData;

  const setup = (search: string, isBrowser = true): ContentfulComponentDecorator => {
    const win = { location: { search } } as unknown as { location: { search: string }; self: unknown; top: unknown };
    win.self = win;
    win.top = win;
    TestBed.configureTestingModule({
      providers: [
        ContentfulComponentDecorator,
        { provide: ContentfulLivePreviewService, useValue: livePreviewService },
        { provide: WindowRef, useValue: { isBrowser: () => isBrowser, nativeWindow: isBrowser ? win : undefined } },
      ],
    });
    return TestBed.inject(ContentfulComponentDecorator);
  };

  // Lets the dynamic import and the promise chain in decorate() settle.
  const flush = async (decorator: ContentfulComponentDecorator) => {
    await (decorator as unknown as { getLivePreviewService(): Promise<unknown> }).getLivePreviewService();
    await Promise.resolve();
  };

  beforeEach(() => {
    livePreviewService = jasmine.createSpyObj('ContentfulLivePreviewService', ['hasInspectorModeTags', 'addInspectorModeTags', 'initComponentLiveUpdate']);
    renderer = jasmine.createSpyObj('Renderer2', ['setAttribute']);
    element = document.createElement('div');
    component = { uid: 'testComponent' } as ContentSlotComponentData;
  });

  it('should be created', () => {
    expect(setup('?preview=true')).toBeTruthy();
  });

  it('should not decorate outside preview mode', async () => {
    const decorator = setup('');
    decorator.decorate(element, renderer, component);
    await Promise.resolve();
    expect(livePreviewService.hasInspectorModeTags).not.toHaveBeenCalled();
    expect(livePreviewService.initComponentLiveUpdate).not.toHaveBeenCalled();
  });

  it('should not decorate on the server', async () => {
    const decorator = setup('?preview=true', false);
    decorator.decorate(element, renderer, component);
    await Promise.resolve();
    expect(livePreviewService.initComponentLiveUpdate).not.toHaveBeenCalled();
  });

  it('should not decorate if component is not provided', async () => {
    const decorator = setup('?preview=true');
    decorator.decorate(element, renderer, null as unknown as ContentSlotComponentData);
    await flush(decorator);
    expect(livePreviewService.hasInspectorModeTags).not.toHaveBeenCalled();
    expect(livePreviewService.addInspectorModeTags).not.toHaveBeenCalled();
    expect(livePreviewService.initComponentLiveUpdate).not.toHaveBeenCalled();
  });

  it('should add inspector mode tags if not present', async () => {
    livePreviewService.hasInspectorModeTags.and.returnValue(false);
    const decorator = setup('?preview=true');

    decorator.decorate(element, renderer, component);
    await flush(decorator);

    expect(livePreviewService.hasInspectorModeTags).toHaveBeenCalledWith(element);
    expect(livePreviewService.addInspectorModeTags).toHaveBeenCalledWith(element, renderer, component);
    expect(livePreviewService.initComponentLiveUpdate).toHaveBeenCalledWith(component);
  });

  it('should not add inspector mode tags if already present', async () => {
    livePreviewService.hasInspectorModeTags.and.returnValue(true);
    const decorator = setup('?preview=true');

    decorator.decorate(element, renderer, component);
    await flush(decorator);

    expect(livePreviewService.hasInspectorModeTags).toHaveBeenCalledWith(element);
    expect(livePreviewService.addInspectorModeTags).not.toHaveBeenCalled();
    expect(livePreviewService.initComponentLiveUpdate).toHaveBeenCalledWith(component);
  });
});
