import { Injectable, Injector, Renderer2, inject } from '@angular/core';

import { ComponentDecorator, ContentSlotComponentData, WindowRef } from '@spartacus/core';

import { isContentfulPreview } from '../helpers';
import type { ContentfulLivePreviewService } from '../services/contentful-live-preview.service';

/**
 * Adds Contentful inspector-mode tags and live updates to CMS components, only in preview mode
 * (see `isContentfulPreview`). The Live Preview SDK is loaded with a dynamic import, so regular
 * visitors don't download, parse, or initialize it on the critical rendering path.
 */
@Injectable({
  providedIn: 'root',
})
export class ContentfulComponentDecorator extends ComponentDecorator {
  protected readonly injector = inject(Injector);
  protected readonly windowRef = inject(WindowRef);
  protected readonly enabled = this.windowRef.isBrowser() && isContentfulPreview(this.windowRef.nativeWindow);
  private livePreviewService?: Promise<ContentfulLivePreviewService>;

  decorate(element: Element, renderer: Renderer2, component: ContentSlotComponentData): void {
    if (!component || !this.enabled) {
      return;
    }

    this.getLivePreviewService().then((livePreview) => {
      if (!livePreview.hasInspectorModeTags(element)) {
        livePreview.addInspectorModeTags(element, renderer, component);
      }
      livePreview.initComponentLiveUpdate(component);
    });
  }

  protected getLivePreviewService(): Promise<ContentfulLivePreviewService> {
    this.livePreviewService ??= import('../services/contentful-live-preview.service').then((m) => this.injector.get(m.ContentfulLivePreviewService));
    return this.livePreviewService;
  }
}
