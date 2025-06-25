import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './order-page.component.html',
  styleUrls: ['./order-page.component.scss']
})
export class OrderPageComponent implements OnInit {
  orderForm: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';
  searchInput = '';

  tab: 'create' | 'search' | 'list' = 'create';

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.orderForm = this.fb.group({ items: this.fb.array([]) });
  }

  ngOnInit() {
    this.addItem();
  }

  setTab(tab: 'create' | 'search' | 'list') {
    this.tab = tab;
    if (tab === 'search') this.searchInput = '';
  }

  get items() {
    return this.orderForm.get('items') as FormArray;
  }

  addItem() {
    this.items.push(this.fb.group({
      barcode: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
      sellingPrice: [null, [Validators.required, Validators.min(0)]]
    }));
  }

  removeItem(index: number) {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  submitOrder() {
    if (this.orderForm.invalid) return;
    this.loading = true;
    const payload = { items: this.items.value };

    this.api.post('/order', payload).subscribe({
      next: () => {
        this.successMsg = 'Order created successfully!';
        this.loading = false;
        this.orderForm.reset();
        this.items.clear();
        this.addItem();
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => {
        this.errorMsg = 'Failed to create order.';
        this.loading = false;
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }

  searchOrder() {
    if (!this.searchInput.trim()) return;
    this.loading = true;

    this.api.get(`/order/search?query=${this.searchInput}`).subscribe({
      next: (res: any) => {
        console.log(res); // Optionally update UI with found order
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Order not found.';
        this.loading = false;
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }
}
