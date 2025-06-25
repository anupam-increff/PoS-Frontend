import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './product-page.component.html',
  styleUrl: './product-page.component.scss'
})
export class ProductPageComponent implements OnInit {
  tab: 'upload' | 'client' | 'list' = 'list';
  productForm: FormGroup;
  products: any[] = [];
  loading = false;
  errorMsg = '';
  showEditModal = false;
  editProduct: any = null;
  searchClientId: string = '';

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.productForm = this.fb.group({
      file: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.loadProducts();
  }

  setTab(tab: 'upload' | 'client' | 'list') {
    this.tab = tab;
    if (tab === 'list') this.loadProducts();
    if (tab === 'client') this.products = []; // Clear results on tab switch
  }

  loadProducts() {
    this.loading = true;
    this.api.get<any[]>('/product').subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: err => {
        this.errorMsg = 'Failed to load products.';
        this.loading = false;
      }
    });
  }

  onFileChange(event: any) {
    if (event.target.files.length > 0) {
      this.productForm.patchValue({ file: event.target.files[0] });
    }
  }

  uploadMaster() {
    if (this.productForm.invalid) return;
    const formData = new FormData();
    formData.append('file', this.productForm.value.file);
    this.api.post('/product/upload-tsv', formData).subscribe(() => {
      this.setTab('list');
      this.productForm.reset();
    });
  }

  searchByClientId() {
    const query = this.searchClientId.trim();
    if (!query) return;

    this.loading = true;
    this.errorMsg = '';
    this.api.get<any[]>(`/product?clientId=${encodeURIComponent(query)}`).subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: err => {
        this.errorMsg = 'Failed to load products.';
        this.products = [];
        this.loading = false;
      }
    });
  }

  openEditModal(product: any) {
    this.editProduct = { ...product };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editProduct = null;
  }

  saveEdit() {
    this.api.put(`/product/${this.editProduct.id}`, this.editProduct).subscribe(() => {
      this.loadProducts();
      this.closeEditModal();
    });
  }
}
