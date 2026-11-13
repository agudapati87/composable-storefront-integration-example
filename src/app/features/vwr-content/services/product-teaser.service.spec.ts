import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Occ } from '@spartacus/core';

import { environment } from '../../../../environments/environment';
import { ProductTeaser, ProductTeaserService, toProductTeasers } from './product-teaser.service';

const API = 'https://api.example.com';

describe('toProductTeasers', () => {
  it('maps products to teasers with absolute image URLs by format', () => {
    const page: Occ.ProductSearchPage = {
      products: [
        {
          code: '4205436',
          name: ' 32GB SDHC Card ',
          images: [
            { format: 'thumbnail', imageType: Occ.ImageType.PRIMARY, url: '/medias/?context=a' },
            { format: 'product', imageType: Occ.ImageType.PRIMARY, url: 'https://cdn.example.com/b.jpg' },
          ],
        },
      ],
    };

    expect(toProductTeasers(page, API)).toEqual([
      {
        key: '4205436',
        title: '32GB SDHC Card',
        productCode: '4205436',
        media: {
          thumbnail: { url: `${API}/medias/?context=a`, altText: '32GB SDHC Card' },
          product: { url: 'https://cdn.example.com/b.jpg', altText: '32GB SDHC Card' },
        },
      },
    ]);
  });

  it('skips products without a code or a name, and leaves out missing images', () => {
    const page: Occ.ProductSearchPage = { products: [{ code: '1', name: ' ' }, { name: 'No code' }, { code: '2', name: 'Two' }] };

    expect(toProductTeasers(page, API)).toEqual([{ key: '2', title: 'Two', productCode: '2', media: undefined }]);
  });

  it('gives an empty list without products', () => {
    expect(toProductTeasers(undefined, API)).toEqual([]);
    expect(toProductTeasers({}, API)).toEqual([]);
  });
});

describe('ProductTeaserService', () => {
  let service: ProductTeaserService;
  let http: HttpTestingController;
  const { baseUrl, baseSite } = environment.productTeaserApi;
  const url = `${baseUrl}/occ/v2/${baseSite}/products/search`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProductTeaserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the product search once and shares the result', () => {
    const results: ProductTeaser[][] = [];
    service.getTeasers().subscribe((teasers) => results.push(teasers));
    service.getTeasers().subscribe((teasers) => results.push(teasers));

    const request = http.expectOne((req) => req.url === url);
    expect(request.request.params.get('pageSize')).toBe(String(environment.productTeaserApi.pageSize));
    request.flush({ products: [{ code: '1', name: 'One' }] });

    expect(results.length).toBe(2);
    expect(results[0].map((t) => t.productCode)).toEqual(['1']);
  });

  it('gives an empty list when the request fails', () => {
    let result: ProductTeaser[] | undefined;
    service.getTeasers().subscribe((teasers) => (result = teasers));

    http.expectOne((req) => req.url === url).flush('down', { status: 502, statusText: 'Bad Gateway' });

    expect(result).toEqual([]);
  });

  describe('getTeasersFor', () => {
    const productUrl = (code: string) => `${baseUrl}/occ/v2/${baseSite}/products/${code}`;

    it('requests each chosen product once, keeps the authored order and leaves out unknown products', () => {
      const results: ProductTeaser[][] = [];
      service.getTeasersFor(['2', '1', 'missing', '2']).subscribe((teasers) => results.push(teasers));
      service.getTeasersFor(['2', '1', 'missing']).subscribe((teasers) => results.push(teasers));

      http.expectOne((req) => req.url === productUrl('1')).flush({ code: '1', name: 'One' });
      http.expectOne((req) => req.url === productUrl('missing')).flush({}, { status: 400, statusText: 'Bad Request' });
      http.expectOne((req) => req.url === productUrl('2')).flush({ code: '2', name: 'Two' });

      expect(results.length).toBe(2);
      expect(results[0].map((t) => t.productCode)).toEqual(['2', '1']);
    });

    it('encodes product codes in the URL', () => {
      service.getTeasersFor(['a/b']).subscribe();
      http.expectOne((req) => req.url === productUrl('a%2Fb')).flush({ code: 'a/b', name: 'AB' });
    });

    it('gives an empty list without codes, without a request', () => {
      let result: ProductTeaser[] | undefined;
      service.getTeasersFor([' ']).subscribe((teasers) => (result = teasers));
      expect(result).toEqual([]);
    });
  });
});
