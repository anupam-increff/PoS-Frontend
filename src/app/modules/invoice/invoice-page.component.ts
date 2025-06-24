import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-invoice-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './invoice-page.component.html',
  styleUrl: './invoice-page.component.scss'
})
export class InvoicePageComponent {
  form: FormGroup;
  loading = false;
  successMsg = '';
  errorMsg = '';

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      orderId: ['', Validators.required]
    });
  }

  downloadInvoice() {
    if (this.form.invalid) return;
    this.loading = true;
    this.api.get(`/invoice/${this.form.value.orderId}`, { responseType: 'text' }).subscribe({
      next: (base64: any) => {
        this.saveAsPdf(base64);
        this.successMsg = 'Invoice downloaded!';
        this.loading = false;
        setTimeout(() => this.successMsg = '', 3000);
      },
      error: () => {
        this.errorMsg = 'Failed to download invoice.';
        this.loading = false;
        setTimeout(() => this.errorMsg = '', 3000);
      }
    });
  }

  saveAsPdf(base64: string) {
    const link = document.createElement('a');
    link.href = 'data:application/pdf;base64,' + base64;
    link.download = `invoice_${this.form.value.orderId}.pdf`;
    link.click();
  }
} 