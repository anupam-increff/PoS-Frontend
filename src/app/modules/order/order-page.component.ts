import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormArray,
  Validators
} from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { DatePipe, CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

declare var bootstrap: any;

interface OrderItem {
  barcode: string;
  productName?: string;  // Add productName field
  quantity: number;
  mrp: number;
  sellingPrice: number;
}

interface Order {
  id: number;
  placedAt: Date;
  orderStatus: 'CREATED' | 'INVOICE_GENERATED';
  invoiceId?: number;
  total?: number; // Will be calculated from items
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
  showNewOrderModal = false;
  confirmSummary: OrderItem[] = [];
  confirmTotal = 0;
  private confirmModal: any;
  calculatingTotals = false;

  searchQuery = '';
  startDate = '';
  endDate = '';
  invoiceStatus: 'all' | 'true' | 'false' = 'all';
  currentPage = 0;
  pageSize = 10;
  totalPages = 1;
  totalItems = 0;
  Math = Math;

  // Autocomplete for barcode search
  barcodeSuggestions: any[] = [];
  showBarcodeSuggestions: boolean = false;
  currentBarcodeIndex: number = -1;
  suggestionPosition = { top: 0, left: 0 };

  searchOrderId: number | null = null;


  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public authService: AuthService,
    private toastr: ToastrService,
    private datePipe: DatePipe
  ) {
    this.orderForm = this.fb.group({
      items: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadCartFromStorage();
    
    // Set default dates: start as beginning of current month, end as today
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDayOfMonth.toISOString().split('T')[0];
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
      mrp: ['', Validators.required],
      sellingPrice: ['', Validators.required]
    });

    this.items.push(group);
    this.saveCartToStorage();
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.saveCartToStorage();
    } else {
      // Clear the only row
      this.items.at(0).reset();
      this.items.at(0).get('quantity')!.setValue(1);
      this.saveCartToStorage();
    }
  }

  updateMRPForItem(index: number) {
    const group = this.items.at(index);
    const barcode = group.get('barcode')!.value;

    if (!barcode || barcode.length < 3) return;

    this.api.get<any>(`/product/barcode/${encodeURIComponent(barcode)}`).subscribe({
      next: (product) => {
        group.get('mrp')!.setValue(product.mrp);
        group.get('sellingPrice')!.setValue(product.mrp);
        this.updateItemTotal(index);
          },
          error: () => {
        group.get('mrp')!.reset();
        group.get('sellingPrice')!.reset();
        this.toastr.error(`Product with barcode ${barcode} not found.`, 'Product Not Found', {
          timeOut: 0,
          extendedTimeOut: 0,
          closeButton: true,
          tapToDismiss: false
        });
      }
    });
  }

    onBarcodeInput(index: number) {
    const group = this.items.at(index);
    const barcode = group.get('barcode')!.value;
    
    if (!barcode || barcode.length < 2) {
      this.barcodeSuggestions = [];
      this.showBarcodeSuggestions = false;
      return;
    }

    this.currentBarcodeIndex = index;
    this.updateSuggestionPosition(index);
    this.getBarcodeSuggestions(barcode);
  }

  updateSuggestionPosition(index: number) {
    setTimeout(() => {
      const inputElement = document.querySelector(`tbody tr:nth-child(${index + 1}) .barcode-input`) as HTMLElement;
      if (inputElement) {
        const rect = inputElement.getBoundingClientRect();
        this.suggestionPosition = {
          top: rect.bottom + 5, // Remove window.scrollY for fixed positioning
          left: rect.left // Remove window.scrollX for fixed positioning
        };
      }
    }, 0);
  }

  onBarcodeKeydown(event: KeyboardEvent, index: number) {
    if (this.showBarcodeSuggestions && this.barcodeSuggestions.length > 0) {
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        this.selectBarcodeSuggestion(this.barcodeSuggestions[0]);
      }
    }
  }

  getBarcodeSuggestions(barcode: string) {
    this.api.get<any>('/product/search', { 
      params: { 
        barcode: barcode,
        page: '0', 
        pageSize: '5' 
      } 
    }).subscribe({
      next: (response) => {
        this.barcodeSuggestions = response.content || [];
        this.showBarcodeSuggestions = this.barcodeSuggestions.length > 0;
      },
      error: () => {
        this.barcodeSuggestions = [];
        this.showBarcodeSuggestions = false;
      }
    });
  }

  selectBarcodeSuggestion(suggestion: any) {
    if (this.currentBarcodeIndex >= 0) {
      const group = this.items.at(this.currentBarcodeIndex);
      group.get('barcode')!.setValue(suggestion.barcode);
      group.get('mrp')!.setValue(suggestion.mrp);
      group.get('sellingPrice')!.setValue(suggestion.mrp);
      this.updateItemTotal(this.currentBarcodeIndex);
      this.hideBarcodeSuggestions();
    }
  }

  // Prevent scientific notation in number inputs
  onNumberKeyPress(event: KeyboardEvent) {
    const char = String.fromCharCode(event.which);
    // Allow only digits, decimal point, and control keys
    if (!/[0-9.]/.test(char) && event.which !== 8 && event.which !== 9 && event.which !== 46) {
      event.preventDefault();
    }
    // Prevent 'e', 'E', '+', '-' which can create scientific notation
    if (['e', 'E', '+', '-'].includes(char)) {
      event.preventDefault();
    }
  }

  // Prevent scientific notation in integer inputs
  onIntegerKeyPress(event: KeyboardEvent) {
    const char = String.fromCharCode(event.which);
    // Allow only digits and control keys
    if (!/[0-9]/.test(char) && event.which !== 8 && event.which !== 9 && event.which !== 46) {
      event.preventDefault();
    }
    // Prevent 'e', 'E', '+', '-', '.' which can create scientific notation or decimals
    if (['e', 'E', '+', '-', '.'].includes(char)) {
      event.preventDefault();
    }
  }

  hideBarcodeSuggestions() {
    this.barcodeSuggestions = [];
    this.showBarcodeSuggestions = false;
  }


  validateSellingPrice(index: number) {
    const group = this.items.at(index);
    const sellingPrice = group.get('sellingPrice')!.value;
    const mrp = group.get('mrp')!.value;

    if (sellingPrice > mrp) {
      this.toastr.warning('Selling price cannot be greater than MRP');
      group.get('sellingPrice')!.setValue(mrp);
    }
  }

  updateItemTotal(index: number) {
    const group = this.items.at(index);
    const quantity = group.get('quantity')!.value;
    const sellingPrice = group.get('sellingPrice')!.value;
    
    if (quantity && sellingPrice) {
      // Trigger change detection for the total display
      this.orderForm.updateValueAndValidity();
      this.saveCartToStorage();
    }
  }

  getItemTotal(index: number): number {
    const group = this.items.at(index);
    const quantity = group.get('quantity')!.value;
    const sellingPrice = group.get('sellingPrice')!.value;
    
    return quantity && sellingPrice ? quantity * sellingPrice : 0;
  }

  getOrderTotal(): number {
    let total = 0;
    for (let i = 0; i < this.items.length; i++) {
      total += this.getItemTotal(i);
    }
    return total;
  }

  getTotalQuantity(): number {
    return this.items.controls.reduce((total, item) => {
      const quantity = item.get('quantity')!.value || 0;
      return total + quantity;
    }, 0);
  }

  getValidItemsCount(): number {
    return this.items.value.filter((item: any) => 
      item.barcode && item.barcode.trim() && 
      item.quantity > 0 && 
      item.sellingPrice > 0
    ).length;
  }

  getDuplicateBarcodes(): string[] {
    const barcodes: string[] = [];
    const duplicates: string[] = [];
    
    this.items.value.forEach((item: any) => {
      if (item.barcode && item.barcode.trim()) {
        const barcode = item.barcode.trim();
        if (barcodes.includes(barcode) && !duplicates.includes(barcode)) {
          duplicates.push(barcode);
        } else {
          barcodes.push(barcode);
        }
      }
    });
    
    return duplicates;
  }

  validateNoDuplicateBarcodes(): boolean {
    const duplicates = this.getDuplicateBarcodes();
    if (duplicates.length > 0) {
      this.toastr.warning(`Duplicate barcodes found: ${duplicates.join(', ')}. Please use different products or combine quantities.`, 'Duplicate Barcodes');
      return false;
    }
    return true;
  }

  clearAllItems() {
    while (this.items.length > 1) {
      this.items.removeAt(this.items.length - 1);
    }
    // Reset the first item
    this.items.at(0).reset();
    this.items.at(0).get('quantity')!.setValue(1);
    this.saveCartToStorage();
  }

  loadCartFromStorage() {
    const savedCart = localStorage.getItem('orderCart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        this.items.clear();
        cartData.forEach((item: any) => {
          const group = this.fb.group({
            barcode: [item.barcode || '', Validators.required],
            quantity: [item.quantity || 1, [Validators.required, Validators.min(1)]],
            mrp: [item.mrp || '', Validators.required],
            sellingPrice: [item.sellingPrice || '', Validators.required]
          });
          this.items.push(group);
        });
        this.toastr.info('Cart restored from previous session');
      } catch (error) {
        this.addItem(); // Fallback to empty cart
      }
    } else {
      this.addItem(); // No saved cart, start fresh
    }
  }

  saveCartToStorage() {
    const cartData = this.items.value;
    // Only save if there are items with barcodes
    const validItems = cartData.filter((item: any) => item.barcode && item.barcode.trim());
    if (validItems.length > 0) {
      localStorage.setItem('orderCart', JSON.stringify(validItems));
    } else {
      localStorage.removeItem('orderCart');
    }
  }

  clearCartFromStorage() {
    localStorage.removeItem('orderCart');
  }

  increaseQuantity(index: number) {
    const group = this.items.at(index);
    const currentQuantity = group.get('quantity')!.value;
    group.get('quantity')!.setValue(currentQuantity + 1);
    this.updateItemTotal(index);
  }

  decreaseQuantity(index: number) {
    const group = this.items.at(index);
    const currentQuantity = group.get('quantity')!.value;
    if (currentQuantity > 1) {
      group.get('quantity')!.setValue(currentQuantity - 1);
      this.updateItemTotal(index);
    }
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.toastr.error('Fix the form before placing order');
      return;
    }

    // Check for duplicate barcodes
    if (!this.validateNoDuplicateBarcodes()) {
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
          mrp: item.mrp || 0,
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
    
    // Show modern modal
    this.showConfirmModal = true;
  }

  confirmOrderSubmit() {
    this.loading = true;
    const payload = { items: this.confirmSummary };

    this.api.post<any>('/order', payload).subscribe({
      next: (response) => {
        const orderId = response?.id || response;
        this.toastr.success(`Order #${orderId} placed successfully!`);
        this.loading = false;
        this.closeConfirmModal();
        this.closeNewOrderModal(); // Close the new order modal too
        this.clearCartFromStorage(); // Clear cart on successful order
        this.resetForm();
        this.loadOrders(0); // Reload orders to show the new one
      },
      error: () => {
        this.toastr.error('Failed to place order');
        this.loading = false;
      }
    });
  }

  closeConfirmModal() {
    this.showConfirmModal = false;
  }

  resetForm() {
    this.orderForm.reset();
    this.items.clear();
    this.addItem();
  }

  onOrderIdSearch() {
    // Remove automatic search on input change
    // Search will only happen when Enter is pressed or Apply button is clicked
  }

  onOrderIdKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.applyFilters();
    }
  }

  loadOrders(page = 0) {
    this.loadingOrders = true;
    this.currentPage = page;
    
    // Clear totals cache when loading new orders
    this.orderTotalsCache.clear();
    
    // Validate date range - max 31 days
    if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 31) {
        this.toastr.error('Date range cannot be greater than 31 days', 'Invalid Date Range');
        this.loadingOrders = false;
        return;
      }
    }
    
    // Build query parameters for GET request
    const params: any = {
      page: page.toString(),
      size: this.pageSize.toString()
    };
    
    // Only add dates if they exist
    if (this.startDate) {
      params.startDate = new Date(this.startDate + 'T00:00:00').toISOString();
    }
    if (this.endDate) {
      params.endDate = new Date(this.endDate + 'T23:59:59').toISOString();
    }
    
    // Add optional parameters
    if (this.searchOrderId) {
      params.query = this.searchOrderId.toString();
    }
    if (this.invoiceStatus !== 'all') {
      params.orderStatus = this.invoiceStatus === 'true' ? 'INVOICE_GENERATED' : 'CREATED';
    }
    
    // Use GET request with query parameters
    this.api.get<any>('/order/search', { params }).subscribe({
      next: (res) => {
        this.orders = res.content.map((o: any) => ({
          ...o,
          placedAt: new Date(Number(o.placedAt) * 1000),
          items: [],
          total: 0 // Will be calculated
        }));
        this.totalItems = res.totalItems;
        this.totalPages = res.totalPages;
        this.currentPage = res.currentPage;
        this.pageSize = res.pageSize;
        this.loadingOrders = false;
        
        // Calculate totals for all orders
        this.calculateOrderTotals();
      },
      error: () => {
        this.toastr.error('Failed to fetch orders');
        this.loadingOrders = false;
      }
    });
  }

  // Cache for order totals to avoid redundant API calls
  private orderTotalsCache = new Map<number, number>();

  async calculateOrderTotals() {
    this.calculatingTotals = true;
    // Calculate totals for all orders by fetching their items
    const promises = this.orders.map(async (order) => {
      try {
        // Check cache first
        if (this.orderTotalsCache.has(order.id)) {
          order.total = this.orderTotalsCache.get(order.id);
          return;
        }
        
        const total = await this.fetchOrderTotal(order.id);
        order.total = total;
        // Cache the result
        this.orderTotalsCache.set(order.id, total);
      } catch (error) {
        console.error(`Failed to calculate total for order ${order.id}:`, error);
        order.total = 0;
      }
    });
    
    // Wait for all totals to be calculated
    await Promise.all(promises);
    this.calculatingTotals = false;
  }

  async fetchOrderTotal(orderId: number): Promise<number> {
    try {
      const items = await this.api.get<OrderItem[]>(`/order/${orderId}`).toPromise();
      if (!items || items.length === 0) {
        return 0;
      }
      return items.reduce((total, item) => total + (item.quantity * item.sellingPrice), 0);
    } catch (error) {
      console.error('Error fetching order items:', error);
      return 0;
    }
  }

  applyFilters() {
    this.currentPage = 0;
    this.loadOrders();
  }

  clearFilters() {
    this.searchQuery = '';
    this.searchOrderId = null;
    this.startDate = '';
    this.endDate = '';
    this.invoiceStatus = 'all';
    this.currentPage = 0;
    
    // Set default dates: start as beginning of current month, end as today
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    this.startDate = firstDayOfMonth.toISOString().split('T')[0];
    this.endDate = today.toISOString().split('T')[0];
    
    this.loadOrders();
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

  openNewOrderModal() {
    this.showNewOrderModal = true;
    // Reset form and ensure we have at least one item
    this.resetForm();
  }

  closeNewOrderModal() {
    this.showNewOrderModal = false;
    this.resetForm();
  }

  onItemChange() {
    // Save to localStorage when any item changes
    this.saveCartToStorage();
  }

  handleInvoice(order: any) {
    if (order.orderStatus === 'INVOICE_GENERATED' && order.invoiceId) {
      // Download existing invoice using invoiceId
      this.downloadInvoice(order.invoiceId, order.id);
    } else if (order.orderStatus === 'INVOICE_GENERATED' && !order.invoiceId) {
      // Edge case: invoice was generated but invoiceId is missing
      this.toastr.warning('Invoice ID is missing. Please regenerate the invoice.', 'Invoice Error');
    } else {
      // Generate new invoice
      this.generateInvoice(order.id);
    }
  }

  generateInvoice(orderId: number) {
    this.api.post<number>(`/invoice/generate?orderId=${orderId}`, {}).subscribe({
      next: (invoiceId: number) => {
        this.toastr.success('Invoice generated successfully');
        // Update the order in the local list with the new invoiceId
        const orderIndex = this.orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
          this.orders[orderIndex].orderStatus = 'INVOICE_GENERATED';
          this.orders[orderIndex].invoiceId = invoiceId;
        }
        // Optionally refresh the orders list to get latest data
        // this.loadOrders(this.currentPage);
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to generate invoice');
      }
    });
  }

  downloadInvoice(invoiceId: number, orderId: number) {
    this.api.get(`/invoice/${invoiceId}`, { responseType: 'blob' }).subscribe({
      next: (blob: Blob) => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${orderId}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        this.toastr.success('Invoice downloaded successfully');
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to download invoice');
      }
    });
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



  getViewedOrderTotal(): number {
    return this.viewedItems.reduce((sum, item) => sum + (item.quantity * item.sellingPrice), 0);
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
      
      // Return formatted date and time in local timezone
      return date.toLocaleDateString('en-IN') + ' ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
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
      
      return date.toLocaleDateString('en-IN');
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
      
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
  }
}
}