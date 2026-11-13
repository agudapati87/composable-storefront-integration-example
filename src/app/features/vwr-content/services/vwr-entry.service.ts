import { Injectable, inject } from '@angular/core';

import { LanguageService } from '@spartacus/core';

import { Observable, catchError, map, of, switchMap, take } from 'rxjs';

import { ContentService } from '../../../contentful/core/services/contentful.service';
import { isVwrEntry, toVwrComponent } from '../contentful/vwr-contentful-mapping';

/**
 * CMS data of a single VWR entry, by id, in the active language. Used for personalization variants
 * that the page request did not resolve (an experience whose `nt_variants` field doesn't link them).
 */
@Injectable({ providedIn: 'root' })
export class VwrEntryService {
  private readonly contentService = inject(ContentService);
  private readonly languageService = inject(LanguageService);

  /** The entry's CMS data; undefined when it is missing, not a VWR entry, or the request fails. */
  get<T>(id: string): Observable<T | undefined> {
    return this.languageService.getActive().pipe(
      take(1),
      switchMap((language) => this.contentService.getComponents({ componentIds: [id] }, language)),
      map((response) => {
        const entry = response.items.find((item) => item.sys.id === id);
        return isVwrEntry(entry) ? (toVwrComponent(entry) as T) : undefined;
      }),
      catchError(() => of(undefined)),
    );
  }
}
