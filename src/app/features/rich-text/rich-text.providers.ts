import { CmsConfig, provideConfig } from '@spartacus/core';

import { RichTextComponent } from './components/rich-text.component';

// Eager, not lazy: paragraphs appear on most pages, including the footer.
export const richTextProviders = [
  provideConfig(<CmsConfig>{
    cmsComponents: { CMSParagraphComponent: { component: RichTextComponent } },
  }),
];
