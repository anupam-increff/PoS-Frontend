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
    provideToastr({positionClass: 'toast-top-center', 
      timeOut: 3000,
      closeButton: true,
      progressBar: true,
      easing: 'ease-in',
      easeTime: 300,
      tapToDismiss: true,}),
    importProvidersFrom(HttpClientModule, BrowserAnimationsModule) 
  ]
};
