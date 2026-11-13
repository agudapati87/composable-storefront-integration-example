import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface TextSegment {
  text: string;
  mark: boolean;
}

/** Splits text so ® and ™ can be superscripted, as on vwr.com ("VWR® Is Built ..."). */
export function splitTrademarks(text: string): TextSegment[] {
  return text
    .split(/([®™])/)
    .filter(Boolean)
    .map((part) => ({ text: part, mark: part === '®' || part === '™' }));
}

/** Renders CMS text with superscript trademark signs; the text itself stays plain (no HTML). */
@Component({
  selector: 'app-trademark-text',
  template: `@for (segment of segments(); track $index) {
    @if (segment.mark) {
      <sup>{{ segment.text }}</sup>
    } @else {
      {{ segment.text }}
    }
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrademarkTextComponent {
  readonly text = input('');
  protected readonly segments = computed(() => splitTrademarks(this.text()));
}
