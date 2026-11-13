import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CmsLink } from '../../utils/cms-link';

/**
 * VWR call-to-action: a pill button with a chevron. `primary` is navy on light backgrounds,
 * `inverse` is white on navy panels. Internal links use the router; external (https) links are
 * plain anchors without a new window, so focus and history behave as users expect.
 */
@Component({
  selector: 'app-cta-link',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './cta-link.component.html',
  styleUrl: './cta-link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaLinkComponent {
  readonly link = input.required<CmsLink>();
  readonly label = input.required<string>();
  readonly variant = input<'primary' | 'inverse'>('primary');

  protected readonly internal = computed(() => {
    const link = this.link();
    return 'internal' in link ? link.internal : undefined;
  });
  protected readonly external = computed(() => {
    const link = this.link();
    return 'external' in link ? link.external : undefined;
  });
}
