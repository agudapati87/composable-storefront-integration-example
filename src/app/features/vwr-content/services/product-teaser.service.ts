import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { Occ } from '@spartacus/core';
import { MediaContainer } from '@spartacus/storefront';

import { Observable, catchError, forkJoin, map, of, shareReplay } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface ProductTeaser {
  key: string;
  title: string;
  productCode: string;
  media?: MediaContainer;
}

const FIELDS = 'code,name,images(DEFAULT)';

/**
 * Product teasers from an external OCC backend (`environment.productTeaserApi`, the SAP Commerce
 * instance the Contentful product picker uses), independent of the storefront's own backend: the
 * products Contentful chose (getTeasersFor), or the first results of the product search
 * (getTeasers). Errors give an empty list (or leave out the product), which hides the section when
 * nothing is left.
 */
@Injectable({ providedIn: 'root' })
export class ProductTeaserService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.productTeaserApi;
  private readonly productsUrl = `${this.api.baseUrl}/occ/v2/${this.api.baseSite}/products`;
  /** Teasers by product code list, so re-renders and live preview updates don't refetch. */
  private readonly chosen = new Map<string, Observable<ProductTeaser[]>>();

  private readonly teasers$ = this.http
    .get<Occ.ProductSearchPage>(`${this.productsUrl}/search`, {
      params: new HttpParams({ fromObject: { pageSize: this.api.pageSize, fields: `products(${FIELDS})` } }),
    })
    .pipe(
      map((page) => toProductTeasers(page, this.api.baseUrl)),
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  getTeasers(): Observable<ProductTeaser[]> {
    return this.teasers$;
  }

  /** Teasers of the given products, in that order; unknown products (or failed requests) are left out. */
  getTeasersFor(productCodes: readonly string[]): Observable<ProductTeaser[]> {
    const codes = [...new Set(productCodes.map((code) => code.trim()).filter(Boolean))];
    if (!codes.length) return of([]);
    const key = codes.join('\n');
    let teasers$ = this.chosen.get(key);
    if (!teasers$) {
      teasers$ = forkJoin(codes.map((code) => this.product(code))).pipe(
        map((products) => toProductTeasers({ products: products.filter((p): p is Occ.Product => !!p) }, this.api.baseUrl)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      this.chosen.set(key, teasers$);
    }
    return teasers$;
  }

  private product(code: string): Observable<Occ.Product | null> {
    return this.http
      .get<Occ.Product>(`${this.productsUrl}/${encodeURIComponent(code)}`, { params: { fields: FIELDS } })
      .pipe(catchError(() => of(null)));
  }
}

/** Products with a code and a name; image URLs (relative on OCC) are made absolute against the API host. */
export function toProductTeasers(page: Occ.ProductSearchPage | null | undefined, mediaBaseUrl: string): ProductTeaser[] {
  return (page?.products ?? []).flatMap((product) => {
    const title = product.name?.trim();
    const productCode = product.code?.trim();
    return title && productCode ? [{ key: productCode, title, productCode, media: toMedia(product.images, title, mediaBaseUrl) }] : [];
  });
}

/** The primary images by format (thumbnail, product, ...), for cx-media's srcset. */
function toMedia(images: Occ.Image[] | undefined, altText: string, mediaBaseUrl: string): MediaContainer | undefined {
  const container: MediaContainer = {};
  for (const image of images ?? []) {
    if (image.format && image.url && image.imageType !== 'GALLERY') {
      container[image.format] = { url: absoluteUrl(image.url, mediaBaseUrl), altText };
    }
  }
  return Object.keys(container).length ? container : undefined;
}

function absoluteUrl(url: string, baseUrl: string): string {
  return /^(https?:)?\/\//.test(url) ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
