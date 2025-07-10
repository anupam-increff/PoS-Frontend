import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';

interface DailyReportData {
  date: number[];
  invoicedOrdersCount: number;
  invoicedItemsCount: number;
  totalRevenue: number;
}

interface SalesReportData {
  clientName: string;
  productName: string;
  barcode: string;
  quantity: number;
  revenue: number;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './reports-page.component.html',
  styleUrls: ['./reports-page.component.scss']
})
export class ReportsPageComponent implements OnInit {
  tab = 'dateRange';
  loading = false;
  
  // Forms
  dateRangeForm: FormGroup;
  clientSalesForm: FormGroup;
  
  // Data
  clients: any[] = [];
  dateRangeData: DailyReportData[] = [];
  clientSalesData: SalesReportData[] = [];
  
  // Errors
  dateRangeError = '';
  clientSalesError = '';

  // Client Sales
  clientSales: any[] = [];
  clientSalesLoading = false;
  clientSalesCurrentPage = 0;
  clientSalesTotalPages = 0;
  clientSalesTotalItems = 0;
  clientSalesPageSize = 10;
  clientSalesMath = Math;
  
  // Client Sales Filters
  salesStartDate = '';
  salesEndDate = '';
  salesClientName = '';

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastr: ToastrService
  ) {
    this.dateRangeForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
    
    this.clientSalesForm = this.fb.group({
      clientName: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Set default dates - start of month to today
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    
    this.dateRangeForm.patchValue({
      startDate: startOfMonthStr,
      endDate: today
    });
    
    // Set default dates for client sales - start of month to today
    this.salesEndDate = today;
    this.salesStartDate = startOfMonthStr;
    
    // Load initial data
    this.generateDateRangeReport();
    this.loadClientSales();
  }

  setTab(tab: string) {
    this.tab = tab;
    this.clearErrors();
  }

  clearErrors() {
    this.dateRangeError = '';
    this.clientSalesError = '';
  }

  async generateDateRangeReport() {
    if (this.dateRangeForm.invalid) return;
    
    this.loading = true;
    this.dateRangeError = '';
    
    try {
      const { startDate, endDate } = this.dateRangeForm.value;
      
      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        this.dateRangeError = 'Start date cannot be after end date';
        return;
      }
      
      // Call API to get date range report
      this.dateRangeData = await this.apiService.getDateRangeReport(startDate, endDate);
      
    } catch (error: any) {
      this.dateRangeError = error.message || 'Failed to generate date range report';
    } finally {
      this.loading = false;
    }
  }

  async generateClientSalesReport() {
    if (this.clientSalesForm.invalid) return;
    
    this.loading = true;
    this.clientSalesError = '';
    
    try {
      const { clientName } = this.clientSalesForm.value;
      
      // Call API to get client sales report
      this.clientSalesData = await this.apiService.getClientSalesReport(clientName);
      
    } catch (error: any) {
      this.clientSalesError = error.message || 'Failed to generate client sales report';
    } finally {
      this.loading = false;
    }
  }

  loadClientSales(page: number = 0) {
    this.clientSalesLoading = true;
    this.clientSalesCurrentPage = page;
    
    const payload = {
      startDate: this.salesStartDate ? new Date(this.salesStartDate).toISOString() : new Date().toISOString(),
      endDate: this.salesEndDate ? new Date(this.salesEndDate).toISOString() : new Date().toISOString(),
      clientName: this.salesClientName || null,
      page: page,
      size: this.clientSalesPageSize
    };
    
    this.apiService.post<any>('/report/sales/', payload).subscribe({
      next: (response) => {
        this.clientSales = response.content || [];
        this.clientSalesTotalItems = response.totalItems || 0;
        this.clientSalesTotalPages = response.totalPages || 0;
        this.clientSalesPageSize = response.pageSize || this.clientSalesPageSize;
        this.clientSalesLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load client sales data');
        this.clientSalesLoading = false;
      }
    });
  }

  applyClientSalesFilters() {
    this.clientSalesCurrentPage = 0;
    this.loadClientSales();
  }

  clearClientSalesFilters() {
    this.salesStartDate = '';
    this.salesEndDate = '';
    this.salesClientName = '';
    this.clientSalesCurrentPage = 0;
    this.applyClientSalesFilters();
  }

  onClientSalesPageChange(page: number): void {
    this.clientSalesCurrentPage = page;
    this.loadClientSales(page);
  }

  getClientSalesPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(0, this.clientSalesCurrentPage - 2);
    const endPage = Math.min(this.clientSalesTotalPages - 1, this.clientSalesCurrentPage + 2);
    for (let i = startPage; i <= endPage; i++) {
      if (i >= 0) {
        pages.push(i);
      }
    }
    return pages;
  }

  getSelectedClientName(): string {
    return this.clientSalesForm.value.clientName || '';
  }

  formatDate(dateArray: number[]): string {
    if (dateArray && dateArray.length >= 3) {
      const [year, month, day] = dateArray;
      return new Date(year, month - 1, day).toLocaleDateString();
    }
    return 'Invalid Date';
  }

  getAverageOrderValue(row: DailyReportData): string {
    if (row.invoicedOrdersCount > 0) {
      const average = row.totalRevenue / row.invoicedOrdersCount;
      return average.toFixed(2);
    }
    return '0.00';
  }

  downloadDateRangeCSV() {
    if (this.dateRangeData.length === 0) {
      this.toastr.warning('No data to download');
      return;
    }

    const headers = ['Date', 'Invoiced Orders', 'Invoiced Items', 'Total Revenue', 'Average Order Value'];
    const csvData = this.dateRangeData.map(row => [
      this.formatDate(row.date),
      row.invoicedOrdersCount,
      row.invoicedItemsCount,
      row.totalRevenue,
      this.getAverageOrderValue(row)
    ]);

    this.downloadCSV(headers, csvData, `sales_report_${this.dateRangeForm.value.startDate}_to_${this.dateRangeForm.value.endDate}.csv`);
  }

  downloadClientSalesCSV() {
    if (this.clientSales.length === 0) {
      this.toastr.warning('No data to download');
      return;
    }

    const headers = ['Client Name', 'Quantity Sold', 'Revenue'];
    const csvData = this.clientSales.map(sale => [
      sale.client,
      sale.quantity,
      sale.revenue
    ]);

    this.downloadCSV(headers, csvData, `client_sales_report_${this.salesStartDate || 'all'}_to_${this.salesEndDate || 'all'}.csv`);
  }

  private downloadCSV(headers: string[], data: any[], filename: string) {
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map((cell: any) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toastr.success('CSV report downloaded successfully');
  }
} 