import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-order-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './order-page.component.html',
  styleUrl: './order-page.component.scss'
})
export class OrderPageComponent implements OnInit {
  orderForm: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.orderForm = this.fb.group({
      items: this.fb.array([])
    });
  }

  ngOnInit() {
    this.addItem();
  }

  get items() {
    return this.orderForm.get('items') as FormArray;
  }

  addItem() {
    this.items.push(this.fb.group({
      barcode: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      mrp: [0, [Validators.required, Validators.min(0)]]
    }));
  }

  removeItem(i: number) {
    if (this.items.length > 1) this.items.removeAt(i);
  }

  submitOrder() {
    if (this.orderForm.invalid) return;
    this.loading = true;
    this.api.post('/order', { items: this.items.value }).subscribe({
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
}
