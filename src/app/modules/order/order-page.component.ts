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
  orders: any[] = [];
  loadingOrders = false;
  showViewModal = false;
  viewedItems: any[] = [];
  viewedOrderId!: number;
  loading = false;

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
    if (t === 'list') {
      this.loadOrders();
    }
  }

  addItem() {
    const fg = this.fb.group({
      barcode: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      mrp: [{ value: null, disabled: true }, Validators.required]
    });
    fg.get('barcode')!.valueChanges.subscribe(code => {
      if (code && code.length > 2) {
        this.api.get<any>(`/product/barcode/${encodeURIComponent(code)}`)
          .subscribe({
            next: p => fg.get('mrp')!.setValue(p.mrp),
            error: () => {
              fg.get('mrp')!.reset();
              this.toastr.error(`Product not found: ${code}`);
            }
          });
      } else {
        fg.get('mrp')!.reset();
      }
    });
    this.items.push(fg);
  }

  removeItem(i: number) {
    if (this.items.length > 1) {
      this.items.removeAt(i);
    }
  }

  submitOrder() {
    if (this.orderForm.invalid) {
      this.toastr.error('Fix the form before submitting');
      return;
    }
    this.loading = true;
    const payload = { items: this.items.getRawValue() };
    this.api.post<number>('/order', payload).subscribe({
      next: orderId => {
        this.toastr.success(`Order #${orderId} placed`);
        this.orderForm.reset();
        this.items.clear();
        this.addItem();
        this.loading = false;
        this.setTab('list');
      },
      error: () => {
        this.toastr.error('Failed to place order');
        this.loading = false;
      }
    });
  }

  loadOrders() {
    this.loadingOrders = true;
    this.api.get<any[]>('/order').subscribe({
      next: data => {
        this.orders = data.map(o => ({ ...o, placedAt: new Date(o.time) }));
        this.loadingOrders = false;
      },
      error: () => {
        this.toastr.error('Could not load orders');
        this.loadingOrders = false;
      }
    });
  }

  openViewItems(orderId: number) {
    this.viewedOrderId = orderId;
    this.api.get<any[]>(`/order/${orderId}`).subscribe({
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

  handleInvoice(order: any) {
    location.href = `/api/invoice/${order.id}`;
  }

  fmtDate(dt: Date): string {
    return this.datePipe.transform(dt, 'medium', 'Asia/Kolkata')!;
  }
}
