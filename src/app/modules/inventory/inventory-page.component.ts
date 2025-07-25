import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

declare var bootstrap: any;

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventory-page.component.html',
  styleUrls: ['./inventory-page.component.scss']
})
export class InventoryPageComponent implements OnInit {
  tab: 'upload' | 'add' | 'snapshot' = 'snapshot';
  uploadForm: FormGroup;
  addForm: FormGroup;
  editForm: FormGroup;
  inventory: any[] = [];
  showEditModal = false;
  loading = false;
  errorMsg = '';
  successMsg = '';
  editIndex: number | null = null;
  editItem: any = null;
  searchBarcode: string = '';
  searchTimeout: any = null;
  searchSuggestions: any[] = [];
  showSuggestions: boolean = false;
  showAddInventoryModal = false;
  activeTab: 'single' | 'bulk' = 'single';
  showSchema = false;
  private addInventoryModal: any = null;
  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  pageSize = 10;
  Math = Math;
  
  // Barcode autocomplete for add form
  addBarcodeSuggestions: any[] = [];
  showAddBarcodeSuggestions: boolean = false;
  addBarcodeSearchTimeout: any;

  constructor(private fb: FormBuilder, private api: ApiService, private toastr: ToastrService, public authService: AuthService) {
    this.uploadForm = this.fb.group({
      file: [null, Validators.required]
    });

    this.addForm = this.fb.group({
      barcode: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]]
    });

    this.editForm = this.fb.group({
      barcode: [{ value: null, disabled: true }],
      quantity: [null, [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit() {
    this.loadInventory();
  }

  private initializeAddInventoryModal() {
    // Try to initialize immediately
    this.tryInitializeModal();
    
    // If not successful, try again after a delay
    setTimeout(() => {
      this.tryInitializeModal();
    }, 100);
    
    // Try again after a longer delay
    setTimeout(() => {
      this.tryInitializeModal();
    }, 500);
    
    // Final attempt
    setTimeout(() => {
      this.tryInitializeModal();
    }, 1000);
  }

  private tryInitializeModal() {
    if (typeof bootstrap !== 'undefined') {
      const modalElement = document.getElementById('addInventoryModal');
      if (modalElement && !this.addInventoryModal) {
        try {
          this.addInventoryModal = new bootstrap.Modal(modalElement);
        } catch (error) {
          console.log('Bootstrap modal initialization failed, will use fallback');
        }
      }
    }
  }

  setTab(tab: 'upload' | 'add' | 'snapshot') {
    this.tab = tab;
    if (tab === 'snapshot') {
      this.loadInventory();
    }
  }

  onFileChange(event: any) {
    if (event.target.files.length > 0) {
      this.uploadForm.patchValue({ file: event.target.files[0] });
    }
  }

  uploadInventory() {
    if (this.uploadForm.invalid) return;
    const formData = new FormData();
    formData.append('file', this.uploadForm.value.file);
    this.api.post('/inventory/upload-tsv', formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(res?.message || 'Inventory uploaded.');
          this.closeAddInventoryModal();
          this.uploadForm.reset();
          this.loadInventory(); // Reload inventory instead of redirecting
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
        let errorMessage = err?.error?.message || 'Upload failed.';
        
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

  addInventory() {
    if (this.addForm.invalid) return;
    const payload = {
      barcode: this.addForm.value.barcode,
      quantity: this.addForm.value.quantity
    };
    this.api.post('/inventory', payload).subscribe({
      next: (res: any) => {
        this.toastr.success(res?.message || 'Inventory added.');
        this.closeAddInventoryModal();
        this.addForm.reset();
        this.loadInventory();
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to add inventory.');
        this.closeAddInventoryModal();
      }
    });
  }

  loadInventory(page: number = 0) {
    this.loading = true;
    this.currentPage = page;
    this.api.get<any>('/inventory', { params: { page: page.toString(), pageSize: this.pageSize.toString() } }).subscribe({
      next: (response) => {
        this.inventory = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load inventory.';
        this.loading = false;
      }
    });
  }
  

  openEditModal(item: any) {
    this.editForm.setValue({
      barcode: item.barcode,
      quantity: item.quantity
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  startEdit(i: number, item: any) {
    this.editIndex = i;
    this.editItem = { ...item };
  }

  cancelEdit() {
    this.editIndex = null;
    this.editItem = null;
  }

  trackByInventoryId(index: number, item: any) {
    return item.barcode;
  }

  searchByBarcode(page: number = 0) {
    if (!this.searchBarcode.trim()) {
      this.loadInventory(page);
      return;
    }
    
    this.loading = true;
    this.currentPage = page;
    this.api.get<any>('/inventory/search', { 
      params: { 
        barcode: this.searchBarcode,
        page: page.toString(), 
        pageSize: this.pageSize.toString() 
      } 
    }).subscribe({
      next: (response) => {
        this.inventory = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to search inventory.';
        this.loading = false;
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
    
    this.api.get<any>('/inventory/search', {
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
      this.loadInventory();
      return;
    }
    this.loading = true;
    this.api.get<any>('/inventory/search', {
      params: {
        barcode: barcode,
        page: this.currentPage.toString(),
        pageSize: this.pageSize.toString()
      }
    }).subscribe({
      next: (response) => {
        this.inventory = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to search inventory.';
        this.loading = false;
      }
    });
  }

  clearBarcodeSearch() {
    this.searchBarcode = '';
    this.loadInventory();
  }

  saveEdit() {
    if (!this.editItem) return;
    const payload = { ...this.editItem, barcode: this.editItem.barcode };
    this.api.put(`/inventory/`, payload).subscribe({
      next: () => {
        this.toastr.success('Inventory updated');
        this.inventory[this.editIndex!] = { ...this.editItem };
        this.editIndex = null;
        this.editItem = null;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to update inventory');
      }
    });
  }

  downloadSampleTSV() {
    const headerRow = ['barcode', 'quantity'];
    const tsvContent = headerRow.join('\t');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_inventory.tsv';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('Inventory TSV header downloaded!');
  }

  canAccessFeature(feature: string): boolean {
    return this.authService.canAccessFeature(feature);
  }

  // ===== Modal helpers =====
  openAddInventoryModal() {
    this.activeTab = 'single';
    this.showAddInventoryModal = true;
  }

  closeAddInventoryModal() {
    this.showAddInventoryModal = false;
    this.addForm.reset();
    this.uploadForm.reset();
  }

  handleInventoryModalSubmit() {
    if (this.activeTab === 'single') {
      this.addInventory();
    } else {
      this.uploadInventory();
    }
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

  // Barcode autocomplete methods for add form
  onAddBarcodeInput() {
    const barcode = this.addForm.get('barcode')?.value;
    
    if (!barcode || barcode.length < 2) {
      this.addBarcodeSuggestions = [];
      this.showAddBarcodeSuggestions = false;
      return;
    }

    // Debounce the search
    if (this.addBarcodeSearchTimeout) {
      clearTimeout(this.addBarcodeSearchTimeout);
    }
    this.addBarcodeSearchTimeout = setTimeout(() => {
      this.getAddBarcodeSuggestions(barcode);
    }, 300);
  }

  onAddBarcodeFocus() {
    const barcode = this.addForm.get('barcode')?.value;
    if (barcode && barcode.length >= 2) {
      this.getAddBarcodeSuggestions(barcode);
    }
  }

  onAddBarcodeBlur() {
    setTimeout(() => {
      this.showAddBarcodeSuggestions = false;
    }, 200);
  }

  // Prevent scientific notation in integer inputs
  onIntegerKeyPress(event: KeyboardEvent) {
    const char = String.fromCharCode(event.which);
    // Allow only digits and control keys (backspace, delete, tab)
    if (!/[0-9]/.test(char) && event.which !== 8 && event.which !== 9 && event.which !== 46) {
      event.preventDefault();
    }
    // Prevent 'e', 'E', '+', '-', '.' which can create scientific notation or decimals
    if (['e', 'E', '+', '-', '.'].includes(char)) {
      event.preventDefault();
    }
  }

  getAddBarcodeSuggestions(barcode: string) {
    this.api.get<any>('/product/search', { 
      params: { 
        barcode: barcode,
        page: '0', 
        pageSize: '5' 
      } 
    }).subscribe({
      next: (response) => {
        this.addBarcodeSuggestions = response.content || [];
        this.showAddBarcodeSuggestions = this.addBarcodeSuggestions.length > 0;
      },
      error: () => {
        this.addBarcodeSuggestions = [];
        this.showAddBarcodeSuggestions = false;
      }
    });
  }

  selectAddBarcodeSuggestion(product: any) {
    this.addForm.get('barcode')?.setValue(product.barcode);
    this.addBarcodeSuggestions = [];
    this.showAddBarcodeSuggestions = false;
  }

  onPageChange(page: number): void {
    if (this.searchBarcode) {
      this.searchByBarcode(page);
    } else {
      this.loadInventory(page);
    }
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

  saveInventoryItem() {
    if (this.editForm.invalid) {
      this.toastr.error('Please fill in all required fields correctly.');
      return;
    }

    this.loading = true;
    const payload = {
      barcode: this.editForm.value.barcode,
      quantity: this.editForm.value.quantity
    };

    this.api.post(`${environment.apiBaseUrl}/inventory`, payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success('Inventory updated successfully');
        this.closeEditModal();
        this.loadInventory();
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error?.message || 'Failed to update inventory');
        // Keep modal open for single item errors so user can fix and retry
      }
    });
  }

  addSingleInventory() {
    if (this.addForm.invalid) {
      this.toastr.error('Please fill in all required fields correctly.');
      return;
    }

    this.loading = true;
    const payload = {
      barcode: this.addForm.value.barcode,
      quantity: this.addForm.value.quantity
    };

    this.api.post(`${environment.apiBaseUrl}/inventory`, payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastr.success('Inventory item added successfully');
        this.closeAddInventoryModal(); // Close modal on success
        this.loadInventory();
        this.addForm.reset();
      },
      error: (error) => {
        this.loading = false;
        this.toastr.error(error.error?.message || 'Failed to add inventory item');
        // Keep modal open for single item errors so user can fix and retry
      }
    });
  }
}
