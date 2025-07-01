import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';
import { DatePipe, CommonModule, NgClass } from '@angular/common';
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
  status: 'completed' | 'pending';
  items: OrderItem[];
  invoicePath?: string;
  total?: number;
}

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgClass
  ],
  providers: [DatePipe],
  templateUrl: './order-page.component.html',
  styleUrls: ['./order-page.component.scss']
})
export class OrderPageComponent implements OnInit {
  tab: 'create' | 'list' = 'create';
  orderForm: FormGroup;
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  paginatedOrders: Order[] = [];
  loadingOrders = false;
  showViewModal = false;
  viewedItems: OrderItem[] = [];
  viewedOrderId!: number;
  loading = false;

  // Filters & pagination
  searchQuery = '';
  dateFilter: 'all' | 'today' | 'week' | 'month' = 'all';
  statusFilter: 'all' | 'completed' | 'pending' = 'all';
  currentPage = 1;
  pageSize = 5;
  totalPages = 1;
  startIndex = 0;
  endIndex = 0;

  // Order summary
  orderSummary = {
    totalItems: 0,
    totalQuantity: 0,
    totalAmount: 0
  };

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

  ngOnInit() {
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
    const fg = this.fb.group({
      barcode: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      sellingPrice: [{ value: null, disabled: true }, Validators.required]
    });

    fg.get('barcode')!.valueChanges.subscribe(code => {
      if (code && code.length > 2) {
        this.api.get<any>(`/product/barcode/${encodeURIComponent(code)}`).subscribe({
          next: p => {
            fg.get('sellingPrice')!.setValue(p.mrp);
            this.updateOrderSummary();
          },
          error: () => {
            fg.get('sellingPrice')!.reset();
            this.toastr.error(`Product not found: ${code}`);
            this.updateOrderSummary();
          }
        });
      } else {
        fg.get('sellingPrice')!.reset();
        this.updateOrderSummary();
      }
    });

    fg.get('quantity')!.valueChanges.subscribe(() => this.updateOrderSummary());

    this.items.push(fg);
    this.updateOrderSummary();
  }

  removeItem(i: number) {
    if (this.items.length > 1) {
      this.items.removeAt(i);
      this.updateOrderSummary();
    }
  }

  onBarcodeChange(i: number, event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.items.at(i).get('barcode')!.setValue(val);
  }

  updateOrderSummary() {
    const values = this.items.getRawValue() as OrderItem[];
    this.orderSummary.totalItems = values.length;
    this.orderSummary.totalQuantity = values.reduce((sum, it) => sum + (it.quantity || 0), 0);
    this.orderSummary.totalAmount = values.reduce(
      (sum, it) => sum + ((it.sellingPrice || 0) * it.quantity), 0
    );
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.toastr.error('Fix the form before submitting');
      return;
    }

    const payload = {
      items: this.items.getRawValue().map(i => ({
        barcode: i.barcode,
        quantity: i.quantity,
        sellingPrice: i.sellingPrice
      }))
    };

    this.loading = true;
    this.api.post<number>('/order', payload).subscribe({
      next: orderId => {
        this.toastr.success(`Order #${orderId} placed`);
        this.resetForm();
        this.loading = false;
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

  loadOrders() {
    this.loadingOrders = true;
    this.api.get<Order[]>('/order').subscribe({
      next: data => {
        this.orders = data.map(o => ({
          ...o,
          placedAt: new Date(Number(o.time) * 1000)
        }));
        this.applyFilters();
        this.loadingOrders = false;
      },
      error: () => {
        this.toastr.error('Could not load orders');
        this.loadingOrders = false;
      }
    });
  }

  onSearchChange() {
    this.currentPage = 1;
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.orders];

    if (this.searchQuery) {
      filtered = filtered.filter(o => o.id.toString().includes(this.searchQuery));
    }

    const now = new Date();
    if (this.dateFilter !== 'all') {
      filtered = filtered.filter(o => {
        const diff = (now.getTime() - o.placedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (this.dateFilter === 'today') return diff < 1;
        if (this.dateFilter === 'week') return diff < 7;
        if (this.dateFilter === 'month') return diff < 30;
        return true;
      });
    }

    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === this.statusFilter);
    }

    this.filteredOrders = filtered;
    this.totalPages = Math.ceil(filtered.length / this.pageSize) || 1;
    this.paginate();
  }

  clearFilters() {
    this.searchQuery = '';
    this.dateFilter = 'all';
    this.statusFilter = 'all';
    this.currentPage = 1;
    this.applyFilters();
  }

  paginate() {
    this.startIndex = (this.currentPage - 1) * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.filteredOrders.length);
    this.paginatedOrders = this.filteredOrders.slice(this.startIndex, this.endIndex);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.paginate();
  }

  getPageNumbers(): number[] {
    const delta = 2;
    const range: number[] = [];
    for (let i = Math.max(1, this.currentPage - delta); i <= Math.min(this.totalPages, this.currentPage + delta); i++) {
      range.push(i);
    }
    return range;
  }

  trackByOrderId(index: number, order: Order) {
    return order.id;
  }

  openViewItems(orderId: number) {
    this.viewedOrderId = orderId;
    this.api.get<OrderItem[]>(`/order/${orderId}`).subscribe({
      next: items => {
        this.viewedItems = items;
        this.showViewModal = true;
      },
      error: () => this.toastr.error('Could not fetch items')
    });
  }

  closeViewModal() {
    this.showViewModal = false;
    this.viewedItems = [];
  }

  handleInvoice(order: Order) {
    window.location.href = `/api/invoice/${order.id}`;
  }

  duplicateOrder(order: Order) {
    this.resetForm();
    order.items.forEach(item => {
      const fg = this.fb.group({
        barcode: [item.barcode, Validators.required],
        quantity: [item.quantity, [Validators.required, Validators.min(1)]],
        sellingPrice: [{ value: item.sellingPrice ?? 0, disabled: true }, Validators.required]
      });
      this.items.push(fg);
    });
    this.tab = 'create';
    this.updateOrderSummary();
  }

  duplicateViewedOrder() {
    this.duplicateOrder({
      id: this.viewedOrderId,
      time: '',
      placedAt: new Date(),
      status: 'pending',
      items: this.viewedItems
    });
    this.closeViewModal();
  }

  getProductInfo(i: number) {
    const fg = this.items.at(i);
    return fg.get('sellingPrice')!.value ? { name: fg.get('barcode')!.value } : null;
  }

  getProductName(barcode: string): string {
    return barcode;
  }

  calculateOrderTotal(order: Order): number {
    if (!order.items || order.items.length === 0) {
      return order.total ?? 0;
    }
    return order.items.reduce(
      (sum, it) => sum + ((it.sellingPrice ?? 0) * it.quantity), 0
    );
  }

  fmtDate(dt: Date): string {
    return this.datePipe.transform(dt, 'MMM dd, yyyy hh:mm a', 'Asia/Kolkata')!;
  }

  getViewedOrderTotal(): number {
    return (this.viewedItems ?? []).reduce(
      (sum, it) => sum + ((it.sellingPrice ?? 0) * it.quantity), 0
    );
  }
}
