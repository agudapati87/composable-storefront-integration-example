import { Injectable, inject } from '@angular/core';

import {
  AuthService,
  CMS_PAGE_NORMALIZER,
  CmsPageAdapter,
  CmsStructureModel,
  ConverterService,
  HOME_PAGE_CONTEXT,
  LanguageService,
  PageContext,
  PageType,
  SMART_EDIT_CONTEXT,
  User,
} from '@spartacus/core';
import { UserAccountFacade } from '@spartacus/user/account/root';

import { Observable, combineLatest, of, switchMap } from 'rxjs';

import { RestrictionsService } from '../../core/services/contentful-restrictions.service';
import { ContentService } from '../../core/services/contentful.service';

type Slug = 'catalog' | 'category' | 'product' | 'content';

const pageTypeToSlugMap: Record<PageType, Slug> = {
  [PageType.CATALOG_PAGE]: 'catalog',
  [PageType.CATEGORY_PAGE]: 'category',
  [PageType.PRODUCT_PAGE]: 'product',
  [PageType.CONTENT_PAGE]: 'content',
};

export interface ContentfulCmsPageRequest {
  pageSlug?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContentfulCmsPageAdapter implements CmsPageAdapter {
  constructor(
    protected converter: ConverterService,
    protected contentService: ContentService,
    protected restrictionService: RestrictionsService,
    protected languageService: LanguageService,
    protected userAccount: UserAccountFacade,
  ) {}

  protected authService = inject(AuthService);

  /**
   * @override returns the Contentful CMS page data for the given context and converts
   * the data by any configured `CMS_PAGE_NORMALIZER`.
   */
  load(pageContext: PageContext): Observable<CmsStructureModel> {
    const params = this.getPagesRequestParams(pageContext);
    return combineLatest([this.languageService.getActive(), this.getUser()]).pipe(
      switchMap(([language, user]) => {
        this.restrictionService.setUserPermissions(user);
        return this.contentService.getPage(params, language).pipe(this.converter.pipeable(CMS_PAGE_NORMALIZER));
      }),
    );
  }

  /**
   * The logged-in user, for restriction tags. Anonymous visitors get `undefined` straight away:
   * `UserAccountFacade` is a lazy facade, and calling it would download the user-account chunk
   * before the page request starts (a waterfall on the critical rendering path).
   */
  protected getUser(): Observable<User | undefined> {
    return this.authService.isUserLoggedIn().pipe(switchMap((loggedIn) => (loggedIn ? this.userAccount.get() : of(undefined))));
  }

  /**
   * We query Contentful CMS API for pages according to their Label.
   */
  protected getPagesRequestParams(context: PageContext): ContentfulCmsPageRequest {
    if (context.id === HOME_PAGE_CONTEXT || context.id === SMART_EDIT_CONTEXT) {
      return {
        pageSlug: 'homepage',
      };
    }

    const httpParams: ContentfulCmsPageRequest = {};
    if (context.type === PageType.CONTENT_PAGE) {
      httpParams.pageSlug = context.id.substring(context.id.indexOf('/') + 1);
    } else if (context.type) {
      httpParams.pageSlug = pageTypeToSlugMap[context.type];
    }
    return httpParams;
  }
}
