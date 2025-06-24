import { Routes } from '@angular/router';
import { ClientPageComponent } from './modules/client/client-page.component';
import { ProductPageComponent } from './modules/product/product-page.component';
import { OrderPageComponent } from './modules/order/order-page.component';
import { InvoicePageComponent } from './modules/invoice/invoice-page.component';
import { AuthPageComponent } from './modules/auth/auth-page.component';
import { TestPageComponent } from './modules/test/test-page.component';

export const routes: Routes = [
  { path: 'client', component: ClientPageComponent },
  { path: 'product', component: ProductPageComponent },
  { path: 'order', component: OrderPageComponent },
  { path: 'invoice', component: InvoicePageComponent },
  { path: 'auth', component: AuthPageComponent },
  { path: 'test', component: TestPageComponent },
  { path: '', redirectTo: 'auth', pathMatch: 'full' },
  { path: '**', redirectTo: 'auth' }
];
