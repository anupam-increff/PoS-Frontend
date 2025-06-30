import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';
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
  showImageModal = false;
  imageToZoom = '';
  searchClientId: string = '';
  editProduct: any = null;

  constructor(private api: ApiService, private fb: FormBuilder, private toastr: ToastrService) {
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
    if (tab === 'client') this.products = [];
  }

  loadProducts() {
    this.loading = true;
    this.api.get<any[]>('/product').subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load products');
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
    this.api.post('/product/upload-tsv', formData).subscribe({
      next: () => {
        this.toastr.success('Product master uploaded!');
        this.setTab('list');
        this.productForm.reset();
      },
      error: () => this.toastr.error('Upload failed')
    });
  }

  searchByClientId() {
    const query = this.searchClientId.trim();
    if (!query) return;

    this.loading = true;
    this.api.get<any[]>(`/product?clientId=${encodeURIComponent(query)}`).subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load products');
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

  openImageModal(url: string) {
    this.imageToZoom = url;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.imageToZoom = '';
  }

  saveEdit() {
    this.api.put(`/product/${this.editProduct.id}`, this.editProduct).subscribe({
      next: () => {
        this.toastr.success('Product updated');
        this.loadProducts();
        this.closeEditModal();
      },
      error: () => this.toastr.error('Failed to update product')
    });
  }
}
