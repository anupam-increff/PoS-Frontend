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
  tab: 'master' | 'inventory' | 'list' = 'list';
  productForm: FormGroup;
  inventoryForm: FormGroup;
  products: any[] = [];
  loading = false;
  errorMsg = '';
  showEditModal = false;
  editProduct: any = null;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.productForm = this.fb.group({
      file: [null, Validators.required]
    });
    this.inventoryForm = this.fb.group({
      file: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.api.get<any[]>('/product').subscribe({
      next: data => { this.products = data; this.loading = false; },
      error: err => { this.errorMsg = 'Failed to load products.'; this.loading = false; }
    });
  }

  setTab(tab: 'master' | 'inventory' | 'list') {
    this.tab = tab;
    if (tab === 'list') this.loadProducts();
  }

  onFileChange(event: any, form: FormGroup) {
    if (event.target.files.length > 0) {
      form.patchValue({ file: event.target.files[0] });
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

  uploadInventory() {
    if (this.inventoryForm.invalid) return;
    const formData = new FormData();
    formData.append('file', this.inventoryForm.value.file);
    this.api.post('/product/upload-inventory', formData).subscribe(() => {
      this.setTab('list');
      this.inventoryForm.reset();
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
