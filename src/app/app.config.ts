import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { provideToastr } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; // ✅ required

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideToastr({
      positionClass: 'toast-top-center', 
      timeOut: 0, // No auto-dismiss
      closeButton: true,
      progressBar: false,
      tapToDismiss: false, // Only close on button click
      preventDuplicates: true,
      newestOnTop: true
    }),
    importProvidersFrom(HttpClientModule, BrowserAnimationsModule) 
  ]
};
