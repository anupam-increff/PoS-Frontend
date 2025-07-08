import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { DatePipe, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

interface OrderItem {
  barcode: string;
  quantity: number;
  sellingPrice: number;
}

interface Order {
  id: number;
  time: string;
  placedAt: Date;
  invoicePath?: string;
  total?: number;
  items?: OrderItem[];
}

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './order-page.component.html',
  styleUrls: ['./order-page.component.scss']
})
export class OrderPageComponent implements OnInit {
  tab: 'create' | 'list' = 'create';
  orderForm: FormGroup;
  orders: Order[] = [];
  viewedItems: OrderItem[] = [];
  viewedOrderId!: number;
  loadingOrders = false;
  loading = false;
  showConfirmModal = false;
  showViewModal = false;
  confirmSummary: OrderItem[] = [];
  confirmTotal = 0;

  searchQuery = '';
  startDate = '';
  endDate = '';
  invoiceStatus: 'all' | 'true' | 'false' = 'all';
  currentPage = 0;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService,
    private datePipe: DatePipe
  ) {
    this.orderForm = this.fb.group({
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.addItem();
    this.loadOrders();
  }

  get items(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  setTab(t: 'create' | 'list') {
    this.tab = t;
    if (t === 'list') this.applyFilters();
  }

  addItem() {
    const group = this.fb.group({
      barcode: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      sellingPrice: [{ value: '', disabled: true }, Validators.required]
    });

    this.items.push(group);
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
    }
  }

  updateMRPForItem(index: number) {
    const group = this.items.at(index);
    const barcode = group.get('barcode')!.value;

    if (!barcode || barcode.length < 3) return;

    this.api.get<any>(`/product/barcode/${encodeURIComponent(barcode)}`).subscribe({
      next: (product) => {
        group.get('sellingPrice')!.setValue(product.mrp);
      },
      error: () => {
        group.get('sellingPrice')!.reset();
        this.toastr.error(`Product with barcode ${barcode} not found.`);
      }
    });
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.toastr.error('Fix the form before placing order');
      return;
    }

    const summary = this.items.getRawValue() as OrderItem[];
    const grouped: { [barcode: string]: OrderItem } = {};

    for (const item of summary) {
      if (!item.barcode) continue;
      if (!grouped[item.barcode]) {
        grouped[item.barcode] = {
          barcode: item.barcode,
          quantity: 0,
          sellingPrice: item.sellingPrice || 0
        };
      }
      grouped[item.barcode].quantity += item.quantity;
    }

    this.confirmSummary = Object.values(grouped);
    this.confirmTotal = this.confirmSummary.reduce(
      (sum, it) => sum + it.quantity * it.sellingPrice,
      0
    );
    this.showConfirmModal = true;
  }

  confirmOrderSubmit() {
    this.loading = true;
    const payload = { items: this.confirmSummary };

    this.api.post<number>('/order', payload).subscribe({
      next: (id) => {
        this.toastr.success(`Order #${id} placed`);
        this.loading = false;
        this.showConfirmModal = false;
        this.resetForm();
        this.setTab('list');
      },
      error: () => {
        this.toastr.error('Failed to place order');
        this.loading = false;
      }
    });
  }

  resetForm() {
    this.orderForm.reset();
    this.items.clear();
    this.addItem();
  }

  loadOrders(page = 0) {
    this.loadingOrders = true;
    this.currentPage = page;
    const params: any = {
      page,
      size: this.pageSize
    };
    if (this.startDate) params.startDate = this.startDate;
    if (this.endDate) params.endDate = this.endDate;
    if (this.invoiceStatus !== 'all') params.invoiceGenerated = this.invoiceStatus;
    if (this.searchQuery) params.query = this.searchQuery;
    
    this.api.get<any>('/order/search', { params }).subscribe({
      next: (res) => {
        this.orders = res.content.map((o: any) => ({
          ...o,
          placedAt: new Date(Number(o.time) * 1000),
          items: []
        }));
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.currentPage = res.currentPage;
        this.pageSize = res.pageSize;
        this.loadingOrders = false;
      },
      error: () => {
        this.toastr.error('Failed to fetch orders');
        this.loadingOrders = false;
      }
    });
  }

  applyFilters() {
    this.currentPage = 0;
    this.loadOrders();
  }

  clearFilters() {
    this.searchQuery = '';
    this.startDate = '';
    this.endDate = '';
    this.invoiceStatus = 'all';
    this.currentPage = 0;
    this.applyFilters();
  }

  onSearchChange() {
    this.currentPage = 0;
    this.applyFilters();
  }

  openViewItems(orderId: number) {
    this.viewedOrderId = orderId;
    this.api.get<OrderItem[]>(`/order/${orderId}`).subscribe({
      next: (items) => {
        this.viewedItems = items;
        this.showViewModal = true;
      },
      error: () => this.toastr.error('Could not fetch order items')
    });
  }

  closeViewModal() {
    this.showViewModal = false;
    this.viewedItems = [];
  }

  handleInvoice(order: Order) {
    if (order.invoicePath) {
      // Download existing invoice - use direct API call
      this.api.get(`/invoice/${order.id}`, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `invoice-${order.id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
          this.toastr.success('Invoice downloaded');
        },
        error: () => {
          this.toastr.error('Failed to download invoice');
        }
      });
    } else {
      // Generate new invoice
      this.api.get(`/invoice/generate/${order.id}`).subscribe({
        next: () => {
          this.toastr.success('Invoice generated successfully');
          this.loadOrders(this.currentPage);
        },
        error: () => {
          this.toastr.error('Failed to generate invoice');
        }
      });
    }
  }

  fmtDate(date: Date): string {
    return this.datePipe.transform(date, 'dd/MM/yyyy, hh:mm a') || '';
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(0, current - delta);
    const end = Math.min(total - 1, current + delta);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  }

  onPageChange(p: number) {
    this.currentPage = p;
    this.loadOrders(p);
  }

  duplicateOrder(order: Order) {
    this.setTab('create');
    this.items.clear();
    for (const item of order.items || []) {
      const fg = this.fb.group({
        barcode: [item.barcode, Validators.required],
        quantity: [item.quantity, [Validators.required, Validators.min(1)]],
        sellingPrice: [{ value: item.sellingPrice, disabled: true }, Validators.required]
      });
      this.items.push(fg);
    }
  }

  duplicateViewedOrder() {
    const fakeOrder: Order = {
      id: 0,
      time: '',
      placedAt: new Date(),
      items: this.viewedItems
    };
    this.duplicateOrder(fakeOrder);
    this.closeViewModal();
  }

  getViewedOrderTotal(): number {
    return this.viewedItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
  }

  getProductInfoByBarcode(barcode: string): { name: string } | null {
    // Get product info from the current form items
    const values = this.items.getRawValue();
    for (const item of values) {
      if (item.barcode === barcode) {
        // Try to get product info from API or return barcode as fallback
        return { name: item.barcode }; // For now, return barcode as name
      }
    }
    return null;
  }

  // Add method to get product name from API
  getProductName(barcode: string): string {
    // Try to get product info from the current form items first
    const values = this.items.getRawValue();
    for (const item of values) {
      if (item.barcode === barcode) {
        return item.name || barcode; // Use actual product name if available
      }
    }
    
    // If not found in current form, return barcode as fallback
    return barcode || 'Unknown Product';
  }

  // Fix date formatting for order history
  formatOrderDate(dateInput: string | Date): string {
    if (!dateInput) return '';
    
    try {
      let dateString: string;
      
      // Convert Date object to string if needed
      if (dateInput instanceof Date) {
        dateString = dateInput.toLocaleDateString('en-GB') + ', ' + dateInput.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit'
        });
      } else {
        dateString = dateInput.toString();
      }
      
      // Handle different date formats
      if (dateString.includes(',')) {
        // Format: "30/06/2025, 06:47 PM"
        const parts = dateString.split(',');
        const datePart = parts[0];
        const timePart = parts[1];
        
        const [day, month, year] = datePart.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        return date.toLocaleDateString('en-GB') + timePart;
      } else {
        // Try parsing as ISO string
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
        }
      }
      
      return dateString; // Return original if parsing fails
    } catch (error) {
      return dateInput.toString(); // Return original if parsing fails
    }
  }
}