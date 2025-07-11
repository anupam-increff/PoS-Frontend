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
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: AuthPageComponent },
  { path: 'auth', redirectTo: 'login', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [AuthGuard] },
  { path: 'client', component: ClientPageComponent, canActivate: [AuthGuard] },
  { path: 'product', component: ProductPageComponent, canActivate: [AuthGuard] },
  { path: 'order', component: OrderPageComponent, canActivate: [AuthGuard] },
  { path: 'invoice', component: InvoicePageComponent, canActivate: [AuthGuard] },
  { path: 'inventory', component: InventoryPageComponent, canActivate: [AuthGuard] },
  { path: 'test', component: TestPageComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsPageComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
