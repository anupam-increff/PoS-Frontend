import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-inventory-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './inventory-page.component.html',
  styleUrls: ['./inventory-page.component.scss'],
})
export class InventoryPageComponent implements OnInit {
  tab: 'upload' | 'add' | 'snapshot' = 'snapshot';

  uploadForm!: FormGroup;
  addForm!: FormGroup;
  editForm!: FormGroup;

  inventory: Array<{ barcode: string; quantity: number; name?: string }> = [];
  loading = false;

  // Search
  searchBarcode = '';

  // Messages
  successMsg = '';
  errorMsg = '';

  // Edit modal state
  showEditModal = false;
  private selectedItem: { barcode: string; quantity: number } | null = null;

  constructor(private fb: FormBuilder, private api: ApiService) {}

  ngOnInit(): void {
    // Initialize forms
    this.uploadForm = this.fb.group({
      file: [null, Validators.required],
    });

    this.addForm = this.fb.group({
      barcode: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]],
    });

    this.editForm = this.fb.group({
      barcode: [{ value: '', disabled: true }],
      quantity: [null, [Validators.required, Validators.min(1)]],
    });

    // Load initial data
    this.loadInventory();
  }

  // Tab navigation
  setTab(t: 'upload' | 'add' | 'snapshot'): void {
    this.tab = t;
    this.clearMessages();
    if (t === 'snapshot') {
      this.loadInventory();
    }
  }

  // Load all inventory
  loadInventory(): void {
    this.loading = true;
    this.api.get<{ barcode: string; quantity: number; name?: string }[]>('/inventory')
      .subscribe({
        next: (data) => {
          this.inventory = data;
          this.loading = false;
        },
        error: (err: any) => {
          console.error(err);
          this.errorMsg = 'Failed to load inventory.';
          this.loading = false;
        }
      });
  }

  // Handle file input
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.uploadForm.patchValue({ file });
  }

  // Upload TSV file
  uploadInventory(): void {
    if (this.uploadForm.invalid) return;
    const formData = new FormData();
    formData.append('file', this.uploadForm.value.file);

    this.api.post<void>('/inventory/upload', formData)
      .subscribe({
        next: () => {
          this.successMsg = 'File uploaded successfully!';
          this.uploadForm.reset();
          this.loadInventory();
        },
        error: (err: any) => {
          console.error(err);
          this.errorMsg = 'Upload failed.';
        }
      });
  }

  // Add a new item
  addInventory(): void {
    if (this.addForm.invalid) return;
    const payload = this.addForm.value;

    this.api.post<void>('/inventory', payload)
      .subscribe({
        next: () => {
          this.successMsg = 'Item added successfully!';
          this.addForm.reset();
          this.loadInventory();
        },
        error: (err: any) => {
          console.error(err);
          this.errorMsg = 'Add failed.';
        }
      });
  }

  // Search by barcode via backend
  searchInventory(): void {
    const code = this.searchBarcode.trim();
    if (!code) {
      this.loadInventory();
      return;
    }

    this.loading = true;
    this.api.get<{ barcode: string; quantity: number; name?: string }[]>('/inventory/search', {
      params: { barcode: code }
    }).subscribe({
      next: (data) => {
        this.inventory = data;
        this.loading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.errorMsg = 'Search failed.';
        this.loading = false;
      }
    });
  }

  // Clear search and reload
  clearSearch(): void {
    this.searchBarcode = '';
    this.loadInventory();
  }

  // Open edit modal
  openEditModal(item: { barcode: string; quantity: number }): void {
    this.selectedItem = item;
    this.editForm.setValue({
      barcode: item.barcode,
      quantity: item.quantity
    });
    this.showEditModal = true;
  }

  // Save edited (delta) quantity
  saveEdit(): void {
    if (!this.selectedItem || this.editForm.invalid) return;
    const newQty = this.editForm.value.quantity;
    const delta = newQty - this.selectedItem.quantity;

    // Send only delta
    this.api.put<void>(`/inventory/${this.selectedItem.barcode}`, { quantity: delta })
      .subscribe({
        next: () => {
          this.successMsg = 'Quantity updated!';
          this.closeEditModal();
          this.loadInventory();
        },
        error: (err: any) => {
          console.error(err);
          this.errorMsg = 'Update failed.';
        }
      });
  }

  // Close modal
  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedItem = null;
    this.editForm.reset();
  }

  // TrackBy for table rows
  trackByBarcode(_: number, item: { barcode: string }): string {
    return item.barcode;
  }

  // Clear messages
  private clearMessages(): void {
    this.successMsg = '';
    this.errorMsg = '';
  }
}
