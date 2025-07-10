import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

declare var bootstrap: any;

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
  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  pageSize = 10;
  Math = Math;
  // Single Product Add Form
  singleProductForm: FormGroup;
  showSchema = false;
  showAddProductModal = false;
  private addProductModal: any;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      file: [null, Validators.required]
    });
    this.singleProductForm = this.fb.group({
      clientName: ['', Validators.required],
      barcode: ['', Validators.required],
      name: ['', Validators.required],
      mrp: ['', [Validators.required, Validators.min(0)]],
      imageUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
    });
  }

  ngOnInit() {
    // Check for tab parameter from query params
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.setTab(params['tab'] as 'upload' | 'client' | 'list');
      } else {
        this.loadProducts();
      }
    });
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

  loadProducts(page: number = 0) {
    this.loading = true;
    this.errorMsg = '';
    this.currentPage = page;
    this.api.get<any>('/product', { params: { page: page.toString(), pageSize: this.pageSize.toString() } }).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
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
      next: (res: any) => {
        this.toastr.success(res?.message || 'Product master uploaded!');
        this.setTab('list');
        this.productForm.reset();
      },
      error: (err) => this.toastr.error(err?.error?.message || 'Upload failed')
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

  searchByBarcode(page: number = 0) {
    const barcode = this.searchBarcode.trim();
    if (!barcode) {
      this.toastr.warning('Enter a barcode to search');
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.currentPage = page;
    this.api.get<any>('/product/search', { params: { barcode, page: page.toString(), pageSize: this.pageSize.toString() } }).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
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
    // Validate imageUrl is required
    if (!this.editProduct.imageUrl || this.editProduct.imageUrl.trim() === '') {
      this.toastr.error('Image URL is required');
      return;
    }
    // Ensure clientName is present in the payload
    const payload = {
      clientName: this.editProduct.clientName,
      barcode: this.editProduct.barcode,
      name: this.editProduct.name,
      mrp: this.editProduct.mrp,
      imageUrl: this.editProduct.imageUrl
    };
    this.api.put(`/product/${this.editProduct.id}`, payload).subscribe({
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

  canAccessFeature(feature: string): boolean {
    return this.authService.canAccessFeature(feature);
  }

  openImageModal(url: string) {
    this.imageToZoom = url;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.imageToZoom = '';
  }

  searchByClientName(page: number = 0) {
    const clientName = this.searchClientName.trim();
    if (!clientName) {
      this.toastr.warning('Enter a client name to search');
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.currentPage = page;
    this.api.get<any>('/product', { params: { clientName, page: page.toString(), pageSize: this.pageSize.toString() } }).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
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

  onPageChange(page: number): void {
    this.loadProducts(page);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const startPage = Math.max(0, this.currentPage - 2);
    const endPage = Math.min(this.totalPages - 1, this.currentPage + 2);
    for (let i = startPage; i <= endPage; i++) {
      if (i >= 0) {
        pages.push(i);
      }
    }
    return pages;
  }

  addSingleProduct() {
    if (this.singleProductForm.invalid) return;
    const payload = this.singleProductForm.value;
    this.api.post('/product', payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || 'Product added successfully!');
        this.closeAddProductModal();
        this.setTab('list');
        this.singleProductForm.reset();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to add product');
        this.closeAddProductModal();
      }
    });
  }

  toggleSchema() {
    this.showSchema = !this.showSchema;
  }

  openAddProductModal() {
    // Wait for Bootstrap to be available
    setTimeout(() => {
      if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap not loaded, trying alternative method');
        // Fallback: try to show modal manually
        const modalElement = document.getElementById('addProductModal');
        if (modalElement) {
          modalElement.classList.add('show');
          modalElement.style.display = 'block';
          modalElement.setAttribute('aria-hidden', 'false');
          // Add backdrop
          const backdrop = document.createElement('div');
          backdrop.className = 'modal-backdrop fade show';
          document.body.appendChild(backdrop);
        }
        return;
      }
      
      if (!this.addProductModal) {
        const modalElement = document.getElementById('addProductModal');
        if (modalElement) {
          this.addProductModal = new bootstrap.Modal(modalElement);
        }
      }
      
      if (this.addProductModal) {
        this.addProductModal.show();
      } else {
        console.error('Could not initialize add product modal');
      }
    }, 100);
  }

  closeAddProductModal() {
    if (this.addProductModal) {
      this.addProductModal.hide();
    } else {
      // Handle fallback modal
      const modalElement = document.getElementById('addProductModal');
      if (modalElement) {
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    }
    this.singleProductForm.reset();
  }
}
