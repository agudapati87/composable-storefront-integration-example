import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';

import { AppRoutingModule } from '@spartacus/storefront';

import { SpartacusModule } from './spartacus/spartacus.module';

import { AppComponent } from './app.component';

import { externalModules } from '../environments/environment';
import { layoutConfig } from './core/config/layout.config';
import { mediaConfig } from './core/config/media.config';
import { routingConfig } from './core/config/routing.config';
import { personalizationProviders } from './features/personalization';
import { richTextProviders } from './features/rich-text';
import { vwrContentProviders } from './features/vwr-content';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, StoreModule.forRoot({}), AppRoutingModule, EffectsModule.forRoot([]), SpartacusModule, ...externalModules],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    // VWR (vwr.com/us/en/brands/vwr) on top of the Contentful library. After SpartacusModule's
    // providers, so the VWR normalizers run after the library's.
    layoutConfig,
    routingConfig,
    mediaConfig,
    ...richTextProviders,
    ...vwrContentProviders,
    ...personalizationProviders,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
