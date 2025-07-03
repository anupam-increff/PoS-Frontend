import { Routes } from '@angular/router';
import { ClientPageComponent } from './modules/client/client-page.component';
import { ProductPageComponent } from './modules/product/product-page.component';
import { OrderPageComponent } from './modules/order/order-page.component';
import { InvoicePageComponent } from './modules/invoice/invoice-page.component';
import { AuthPageComponent } from './modules/auth/auth-page.component';
import { TestPageComponent } from './modules/test/test-page.component';
import { DashboardPageComponent } from './modules/dashboard/dashboard-page.component';
import { InventoryPageComponent } from './modules/inventory/inventory-page.component';
import { ReportsPageComponent } from './modules/reports/reports-page.component';

export const routes: Routes = [
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'client', component: ClientPageComponent },
  { path: 'product', component: ProductPageComponent },
  { path: 'order', component: OrderPageComponent },
  { path: 'invoice', component: InvoicePageComponent },
  { path: 'inventory', component: InventoryPageComponent },
  { path: 'auth', component: AuthPageComponent },
  { path: 'test', component: TestPageComponent },
  { path: 'reports', component: ReportsPageComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }

];
