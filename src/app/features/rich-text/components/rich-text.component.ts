import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ParagraphComponent, SupplementHashAnchorsPipe } from '@spartacus/storefront';

import { TrademarkTextComponent } from '../../../shared/components/trademark-text/trademark-text.component';

/**
 * Replaces Spartacus' paragraph (type code `CMSParagraphComponent`) for two reasons:
 * - Security: the original binds `bypassSecurityTrustHtml(content)`, trusting CMS HTML completely.
 *   Here `[innerHTML]` keeps Angular's sanitizer on (scripts, handlers and unsafe URLs removed),
 *   on top of the allow-list rendering in the CMS bridge.
 * - Content: the original ignores `title`; Contentful rich text entries have a headline (h2).
 * Extends the original so its router handling of internal links (handleClick) is kept.
 */
@Component({
  selector: 'app-rich-text',
  imports: [AsyncPipe, SupplementHashAnchorsPipe, TrademarkTextComponent],
  templateUrl: './rich-text.component.html',
  styleUrl: './rich-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextComponent extends ParagraphComponent {}
