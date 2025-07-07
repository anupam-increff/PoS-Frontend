import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';

interface DailyReportData {
  id: number;
  date: string;
  orderCount: number;
  totalItems: number;
  revenue: number;
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
    private apiService: ApiService
  ) {
    this.dateRangeForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
    
    this.clientSalesForm = this.fb.group({
      clientId: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadClients();
  }

  setTab(tab: string) {
    this.tab = tab;
    this.clearErrors();
  }

  clearErrors() {
    this.dateRangeError = '';
    this.clientSalesError = '';
  }

  async loadClients() {
    try {
      this.clients = await this.apiService.getClients();
    } catch (error) {
      console.error('Error loading clients:', error);
    }
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
      const { clientId } = this.clientSalesForm.value;
      
      // Call API to get client sales report
      this.clientSalesData = await this.apiService.getClientSalesReport(clientId);
      
    } catch (error: any) {
      this.clientSalesError = error.message || 'Failed to generate client sales report';
    } finally {
      this.loading = false;
    }
  }

  getSelectedClientName(): string {
    const clientId = this.clientSalesForm.value.clientId;
    const client = this.clients.find(c => c.id === clientId);
    return client ? client.name : '';
  }
} 