import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.scss']
})
export class ReportsPageComponent {
  // Sales Report
  salesColumns = ['SKU', 'Product', 'Total Sold', 'Revenue'];
  salesData = [
    { sku: 'A001', product: 'Product A', quantity: 120, revenue: 2400 },
    { sku: 'B002', product: 'Product B', quantity: 80, revenue: 1600 }
  ];
  salesFilters = { from: '', to: '', client: '' };

  // Day-on-Day Sales Report
  daySalesColumns = ['Date', 'Orders', 'Items Sold', 'Revenue'];
  daySalesData = [
    { date: '2024-06-01', orders: 12, items: 45, revenue: 900 },
    { date: '2024-06-02', orders: 15, items: 60, revenue: 1200 }
  ];
  daySalesFilters = { from: '', to: '' };
} 