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
  searchBarcode: string = '';
  editIndex: number | null = null;
  editProduct: any = null;
  searchClientName: string = '';

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
    private toastr: ToastrService
  ) {
    this.productForm = this.fb.group({
      file: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.loadProducts();
  }

  setTab(tab: 'upload' | 'client' | 'list') {
    this.tab = tab;
    if (tab === 'list') {
      this.searchBarcode = '';
      this.loadProducts();
    }
    if (tab === 'client') {
      this.products = [];
      this.errorMsg = '';
    }
  }

  loadProducts() {
    this.loading = true;
    this.errorMsg = '';
    this.api.get<any[]>('/product').subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load products');
        this.loading = false;
        this.errorMsg = 'Unable to fetch products.';
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
    if (!query) {
      this.toastr.warning('Enter a client ID to search');
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.api.get<any[]>(`/product?clientId=${encodeURIComponent(query)}`).subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
        this.errorMsg = 'No products found for this client.';
      }
    });
  }

  searchByBarcode() {
    const barcode = this.searchBarcode.trim();
    if (!barcode) {
      this.toastr.warning('Enter a barcode to search');
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.api.get<any>(`/product/barcode/${encodeURIComponent(barcode)}`).subscribe({
      next: product => {
        this.products = [product];
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
        this.errorMsg = 'Product not found for this barcode.';
      }
    });
  }

  clearBarcodeSearch() {
    this.searchBarcode = '';
    this.loadProducts();
  }

  startEdit(i: number, product: any) {
    this.editIndex = i;
    this.editProduct = { ...product };
  }

  cancelEdit() {
    this.editIndex = null;
    this.editProduct = null;
  }

  saveEdit() {
    if (!this.editProduct) return;
    this.api.put(`/product/${this.editProduct.id}`, this.editProduct).subscribe({
      next: () => {
        this.toastr.success('Product updated');
        this.products[this.editIndex!] = { ...this.editProduct };
        this.editIndex = null;
        this.editProduct = null;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to update product');
      }
    });
  }

  trackByProductId(index: number, product: any) {
    return product.id;
  }

  openImageModal(url: string) {
    this.imageToZoom = url;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.imageToZoom = '';
  }

  searchByClientName() {
    const query = this.searchClientName.trim();
    if (!query) {
      this.toastr.warning('Enter a client name to search');
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.api.get<any[]>(`/product?clientName=${encodeURIComponent(query)}`).subscribe({
      next: data => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
        this.errorMsg = 'No products found for this client.';
      }
    });
  }

  downloadSampleTSV() {
    const sampleData = [
      ['clientName', 'barcode', 'name', 'mrp', 'imageUrl'],
      ['ABC Company', '1234567890123', 'Premium Wireless Headphones', '2999.00', 'https://example.com/headphones.jpg'],
      ['XYZ Electronics', '9876543210987', 'Smart LED TV 55 inch', '45999.00', 'https://example.com/tv.jpg']
    ];
    
    const tsvContent = sampleData.map(row => row.join('\t')).join('\n');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_products.tsv';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('Sample TSV file downloaded successfully!');
  }
}
