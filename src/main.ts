import { platformBrowser } from '@angular/platform-browser';

import { AppModule } from './app/app.module';

import { addPreconnectLinks, criticalOrigins } from './app/shared/utils/preconnect';
import { environment } from './environments/environment';

// Open connections to the critical API/image hosts while the bundles are still downloading.
addPreconnectLinks(document, criticalOrigins(environment));

platformBrowser()
  .bootstrapModule(AppModule, {})
  .catch((err) => console.error(err));
