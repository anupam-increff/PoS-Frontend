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
    // Set default end date as today
    const today = new Date().toISOString().split('T')[0];
    this.dateRangeForm.patchValue({
      endDate: today
    });
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
} 