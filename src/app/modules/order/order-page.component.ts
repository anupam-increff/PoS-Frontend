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

declare var bootstrap: any;

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
  private confirmModal: any;

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
    
    // Set default dates: start as 1 Jan 1970, end as today
    const today = new Date();
    this.startDate = '1970-01-01';
    this.endDate = today.toISOString().split('T')[0];
    
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

    // Validate that all items have required fields
    for (const item of summary) {
      if (!item.barcode || !item.barcode.trim()) {
        this.toastr.error('All items must have a barcode');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        this.toastr.error('All items must have a valid quantity');
        return;
      }
      if (!item.sellingPrice || item.sellingPrice <= 0) {
        this.toastr.error('All items must have a valid selling price');
        return;
      }
    }

    // Group items by barcode
    for (const item of summary) {
      if (!grouped[item.barcode]) {
        grouped[item.barcode] = {
          barcode: item.barcode,
          quantity: 0,
          sellingPrice: item.sellingPrice || 0
        };
      }
      grouped[item.barcode].quantity += item.quantity;
    }

    // Check if we have any valid items
    if (Object.keys(grouped).length === 0) {
      this.toastr.error('No valid items to order');
      return;
    }

    this.confirmSummary = Object.values(grouped);
    this.confirmTotal = this.confirmSummary.reduce(
      (sum, it) => sum + it.quantity * it.sellingPrice,
      0
    );
    
    // Show modal using Bootstrap
    setTimeout(() => {
      if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap not loaded, trying alternative method');
        // Fallback: try to show modal manually
        const modalElement = document.getElementById('confirmOrderModal');
        if (modalElement) {
          modalElement.classList.add('show');
          modalElement.style.display = 'block';
          modalElement.setAttribute('aria-hidden', 'false');
          // Add backdrop
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
        }
        return;
      }
      
      if (!this.confirmModal) {
        const modalElement = document.getElementById('confirmOrderModal');
        if (modalElement) {
          this.confirmModal = new bootstrap.Modal(modalElement);
        }
      }
      
      if (this.confirmModal) {
        this.confirmModal.show();
      } else {
        console.error('Could not initialize confirm modal');
      }
    }, 100);
  }

  confirmOrderSubmit() {
    this.loading = true;
    const payload = { items: this.confirmSummary };

    this.api.post<number>('/order', payload).subscribe({
      next: (id) => {
        this.toastr.success(`Order #${id} placed`);
        this.loading = false;
        this.closeConfirmModal();
        this.resetForm();
        this.setTab('list');
      },
      error: () => {
        this.toastr.error('Failed to place order');
        this.loading = false;
      }
    });
  }

  closeConfirmModal() {
    if (this.confirmModal) {
      this.confirmModal.hide();
    } else {
      // Handle fallback modal
      const modalElement = document.getElementById('confirmOrderModal');
      if (modalElement) {
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    }
  }

  resetForm() {
    this.orderForm.reset();
    this.items.clear();
    this.addItem();
  }

  loadOrders(page = 0) {
    this.loadingOrders = true;
    this.currentPage = page;
    
    // Use the new OrderSearchForm structure
    const searchForm = {
      startDate: this.startDate || '',
      endDate: this.endDate || '',
      invoiceGenerated: this.invoiceStatus === 'all' ? null : this.invoiceStatus === 'true',
      page: page,
      size: this.pageSize
    };
    
    // Add search query if provided
    if (this.searchQuery) {
      // For now, we'll use the existing endpoint structure
      // The backend should handle the search query in the OrderSearchForm
      const params: any = {
        ...searchForm,
        query: this.searchQuery
      };
      
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
    } else {
      // Use the new OrderSearchForm structure
      this.api.post<any>('/order/search', searchForm).subscribe({
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
    
    // If not found in current form, try to fetch from API
    // For now, return a formatted version of the barcode
    return barcode || 'Unknown Product';
  }

  // Fix date formatting for order history - show only one formatted date
  formatOrderDate(dateInput: string | Date): string {
    if (!dateInput) return '';
    
    try {
      let date: Date;
      
      // Convert to Date object
      if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        date = new Date(dateInput);
      }
      
      if (isNaN(date.getTime())) {
        return dateInput.toString();
      }
      
      // Return formatted date and time
      return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateInput.toString();
    }
  }

  // Get only the date part for order history
  getOrderDate(dateInput: string | Date): string {
    if (!dateInput) return '';
    
    try {
      let date: Date;
      
      if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        date = new Date(dateInput);
      }
      
      if (isNaN(date.getTime())) {
        return dateInput.toString();
      }
      
      return date.toLocaleDateString('en-GB');
    } catch (error) {
      return dateInput.toString();
    }
  }

  // Get only the time part for order history
  getOrderTime(dateInput: string | Date): string {
    if (!dateInput) return '';
    
    try {
      let date: Date;
      
      if (dateInput instanceof Date) {
        date = dateInput;
      } else {
        date = new Date(dateInput);
      }
      
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  }
}