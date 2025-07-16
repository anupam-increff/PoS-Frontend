import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

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
  searchTimeout: any = null;
  searchSuggestions: any[] = [];
  showSuggestions: boolean = false;
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
  activeTab = 'single';
  private addProductModal: any;
  
  // Client name autocomplete
  clientSuggestions: any[] = [];
  showClientSuggestions: boolean = false;
  clientSearchTimeout: any;

  constructor(
    private api: ApiService,
    public authService: AuthService,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private route: ActivatedRoute
  ) {
    this.productForm = this.fb.group({
      file: [null, Validators.required]
    });
    this.singleProductForm = this.fb.group({
      clientName: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9\s\-_@.]+$/)]],
      barcode: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9\s\-_@()]+$/)]],
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9\s\-_@()]+$/)]],
      mrp: ['', [Validators.required, Validators.min(0)]],
      imageUrl: ['', [Validators.pattern(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i)]] // Optional with proper image extension validation
    });
  }

  ngOnInit() {
    // Always load products on init
    this.loadProducts();
    
    // Check for tab parameter from query params
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.setTab(params['tab'] as 'upload' | 'client' | 'list');
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
        if (res.success) {
          this.toastr.success(res?.message || 'Product master uploaded!');
          this.closeAddProductModal();
          this.productForm.reset();
          this.loadProducts(); // Reload products instead of redirecting
        } else {
          // Handle validation errors with shorter message
          let errorMessage = `Upload failed: ${res.message}`;
          if (res.errors && res.errors.length > 0) {
            errorMessage += `\n\nFirst 3 errors:\n`;
            res.errors.slice(0, 3).forEach((error: string) => {
              errorMessage += `• ${error}\n`;
            });
            if (res.errors.length > 3) {
              errorMessage += `... and ${res.errors.length - 3} more errors.`;
            }
          }
          
          this.toastr.error(errorMessage, 'Upload Failed', {
            timeOut: 0,
            extendedTimeOut: 0,
            closeButton: true,
            tapToDismiss: false,
            positionClass: 'toast-top-center'
          });
          
          // Keep modal open for user to try again or close manually
          // Download the error TSV file if available
          if (res.downloadUrl) {
            this.downloadErrorTSV(res.downloadUrl);
          }
        }
      },
      error: (err) => {
        let errorMessage = err?.error?.message || 'Upload failed';
        
        // Handle detailed error response with shorter message
        if (err?.error?.errors) {
          errorMessage += '\n\nFirst 3 validation errors:\n';
          err.error.errors.slice(0, 3).forEach((error: string) => {
            errorMessage += `• ${error}\n`;
          });
          if (err.error.errors.length > 3) {
            errorMessage += `... and ${err.error.errors.length - 3} more errors.`;
          }
        }
        
        this.toastr.error(errorMessage, 'Upload Failed', {
          timeOut: 0,
          extendedTimeOut: 0,
          closeButton: true,
          tapToDismiss: false,
          positionClass: 'toast-top-center'
        });
        
        // Keep modal open for user to try again or close manually
        // Download error file if available
        if (err?.error?.downloadUrl) {
          this.downloadErrorTSV(err.error.downloadUrl);
        }
      }
    });
  }

  downloadErrorTSV(downloadUrl: string) {
    // Create full URL if it's a relative path
    const fullUrl = downloadUrl.startsWith('http') ? downloadUrl : `${environment.apiBaseUrl}${downloadUrl}`;
    
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = 'error_report.tsv';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toastr.info('Error report downloaded. Please fix the issues and re-upload.', 'Error Report Downloaded');
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

  onSearchChange() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.getSearchSuggestions();
    }, 300);
  }

  onSearchFocus() {
    if (this.searchBarcode && this.searchBarcode.length >= 2) {
      this.getSearchSuggestions();
    }
  }

  onSearchBlur() {
    // Delay hiding suggestions to allow for click
    setTimeout(() => {
      this.showSuggestions = false;
    }, 300);
  }

  getSearchSuggestions() {
    if (!this.searchBarcode.trim()) {
      this.searchSuggestions = [];
      this.showSuggestions = false;
      return;
    }
    
    this.api.get<any>('/product/search', {
      params: {
        barcode: this.searchBarcode,
        page: '0',
        pageSize: '10'
      }
    }).subscribe({
      next: (response) => {
        this.searchSuggestions = response.content || [];
        this.showSuggestions = this.searchSuggestions.length > 0;
      },
      error: () => {
        this.searchSuggestions = [];
        this.showSuggestions = false;
      }
    });
  }

  selectSuggestion(suggestion: any) {
    this.searchBarcode = suggestion.barcode;
    this.searchSuggestions = [];
    this.showSuggestions = false;
    // Use the selected suggestion's barcode directly
    this.searchByBarcodeWithValue(suggestion.barcode);
  }

  searchByBarcodeWithValue(barcode: string) {
    if (!barcode.trim()) {
      this.loadProducts();
      return;
    }
    this.loading = true;
    this.api.get<any>('/product/search', {
      params: {
        barcode: barcode,
        page: this.currentPage.toString(),
        pageSize: this.pageSize.toString()
      }
    }).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to search products.';
        this.loading = false;
      }
    });
  }

  searchByBarcode() {
    if (!this.searchBarcode.trim()) {
      this.loadProducts();
      return;
    }
    this.loading = true;
    this.api.get<any>('/product/search', {
      params: {
        barcode: this.searchBarcode,
        page: this.currentPage.toString(),
        pageSize: this.pageSize.toString()
      }
    }).subscribe({
      next: (response) => {
        this.products = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to search products.';
        this.loading = false;
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

  toggleSchemaWithScroll() {
    this.showSchema = !this.showSchema;
    if (this.showSchema) {
      // Scroll to show the schema after it's displayed
      setTimeout(() => {
        const modalBody = document.querySelector('.modal-body-modern');
        if (modalBody) {
          modalBody.scrollTop = modalBody.scrollHeight;
        }
      }, 100);
    }
  }

  openAddProductModal() {
    this.showAddProductModal = true;
  }

  closeAddProductModal() {
    this.showAddProductModal = false;
    this.singleProductForm.reset();
  }

  setActiveTab(tab: 'single' | 'bulk') {
    this.activeTab = tab;
  }

  handleModalSubmit() {
    if (this.activeTab === 'single') {
      this.addSingleProduct();
    } else {
      this.uploadMaster();
    }
  }

  downloadSampleTSV() {
    const headerRow = ['clientName', 'barcode', 'name', 'mrp', 'imageUrl'];
    const tsvContent = headerRow.join('\t');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_products.tsv';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('TSV header file downloaded!');
  }

  // Client name autocomplete methods
  onClientNameInput() {
    const clientName = this.singleProductForm.get('clientName')?.value;
    
    if (!clientName || clientName.length < 2) {
      this.clientSuggestions = [];
      this.showClientSuggestions = false;
      return;
    }

    // Debounce the search
    if (this.clientSearchTimeout) {
      clearTimeout(this.clientSearchTimeout);
    }
    this.clientSearchTimeout = setTimeout(() => {
      this.getClientSuggestions(clientName);
    }, 300);
  }

  onClientNameFocus() {
    const clientName = this.singleProductForm.get('clientName')?.value;
    if (clientName && clientName.length >= 2) {
      this.getClientSuggestions(clientName);
    }
  }

  onClientNameBlur() {
    // Delay hiding to allow click on suggestions
    setTimeout(() => {
      this.showClientSuggestions = false;
    }, 200);
  }

  // Prevent scientific notation in number inputs
  onNumberKeyPress(event: KeyboardEvent) {
    const char = String.fromCharCode(event.which);
    // Allow only digits, decimal point, and backspace/delete
    if (!/[0-9.]/.test(char) && event.which !== 8 && event.which !== 9 && event.which !== 46) {
      event.preventDefault();
    }
    // Prevent 'e', 'E', '+', '-' which can create scientific notation
    if (['e', 'E', '+', '-'].includes(char)) {
      event.preventDefault();
    }
  }

  getClientSuggestions(clientName: string) {
    this.api.get<any>('/client/search', { 
      params: { 
        query: clientName,
        page: '0', 
        pageSize: '5' 
      } 
    }).subscribe({
      next: (response) => {
        this.clientSuggestions = response.content || [];
        this.showClientSuggestions = this.clientSuggestions.length > 0;
      },
      error: () => {
        this.clientSuggestions = [];
        this.showClientSuggestions = false;
      }
    });
  }

  selectClientSuggestion(client: any) {
    this.singleProductForm.get('clientName')?.setValue(client.name);
    this.clientSuggestions = [];
    this.showClientSuggestions = false;
  }
}
