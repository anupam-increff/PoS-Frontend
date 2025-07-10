import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

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
  showAddInventoryModal = false;
  showSchema = false;
  // Pagination
  currentPage = 0;
  totalPages = 0;
  totalItems = 0;
  pageSize = 10;
  Math = Math;

  constructor(private fb: FormBuilder, private api: ApiService, private toastr: ToastrService, private authService: AuthService) {
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
    this.api.post('/inventory/upload', formData).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toastr.success(res?.message || 'Inventory uploaded.');
          this.uploadForm.reset();
          this.loadInventory();
        } else {
          // Handle validation errors
          let errorMessage = `Upload failed: ${res.message}\n\n`;
          errorMessage += `Total Rows: ${res.totalRows}\n`;
          errorMessage += `Success: ${res.successRows}\n`;
          errorMessage += `Errors: ${res.errorRows}\n\n`;
          errorMessage += 'Validation Errors:\n';
          res.errors.forEach((error: string) => {
            errorMessage += `• ${error}\n`;
          });
          
          this.toastr.error(errorMessage, 'Upload Failed', {
            timeOut: 10000,
            extendedTimeOut: 5000,
            closeButton: true
          });
          
          // Download the error TSV file if available
          if (res.downloadUrl) {
            this.downloadErrorTSV(res.downloadUrl);
          }
        }
      },
      error: (err) => {
        let errorMessage = err?.error?.message || 'Upload failed.';
        
        // Handle detailed error response
        if (err?.error?.errors) {
          errorMessage += '\n\nValidation Errors:\n';
          err.error.errors.forEach((error: string) => {
            errorMessage += `• ${error}\n`;
          });
        }
        
        this.toastr.error(errorMessage, 'Upload Failed', {
          timeOut: 10000,
          extendedTimeOut: 5000,
          closeButton: true
        });
        
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
    const barcode = this.searchBarcode.trim();
    if (!barcode) {
      this.toastr.warning('Enter a barcode to search');
      return;
    }
    this.loading = true;
    this.currentPage = page;
    this.api.get<any>('/inventory/search', { params: { barcode, page: page.toString(), pageSize: this.pageSize.toString() } }).subscribe({
      next: (response) => {
        this.inventory = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.inventory = [];
        this.errorMsg = 'No inventory found for this barcode.';
        this.loading = false;
      }
    });
  }

  saveEdit() {
    if (!this.editItem) return;
    const payload = { ...this.editItem, barcode: this.editItem.barcode };
    this.api.put(`/inventory/${this.editItem.barcode}`, payload).subscribe({
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
    const sampleData = [
      ['barcode', 'quantity'],
      ['1234567890123', '50'],
      ['9876543210987', '25']
    ];
    
    const tsvContent = sampleData.map(row => row.join('\t')).join('\n');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_inventory.tsv';
    link.click();
    window.URL.revokeObjectURL(url);
    this.toastr.success('Sample inventory TSV file downloaded successfully!');
  }

  canAccessFeature(feature: string): boolean {
    return this.authService.canAccessFeature(feature);
  }

  openAddInventoryModal() {
    this.showAddInventoryModal = true;
  }

  closeAddInventoryModal() {
    this.showAddInventoryModal = false;
    this.addForm.reset();
  }

  toggleSchema() {
    this.showSchema = !this.showSchema;
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
}
