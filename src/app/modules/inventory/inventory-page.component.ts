import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';

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

  constructor(private fb: FormBuilder, private api: ApiService, private toastr: ToastrService) {
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

    this.api.post('/inventory/upload', formData).subscribe(() => {
      this.successMsg = 'Inventory uploaded.';
      this.uploadForm.reset();
      this.loadInventory();
      setTimeout(() => this.successMsg = '', 3000);
    }, () => {
      this.errorMsg = 'Upload failed.';
      setTimeout(() => this.errorMsg = '', 3000);
    });
  }

  addInventory() {
    if (this.addForm.invalid) return;

    const payload = {
      barcode: this.addForm.value.barcode,
      quantity: this.addForm.value.quantity
    };

    this.api.post('/inventory', payload).subscribe(() => {
      this.successMsg = 'Inventory added.';
      this.addForm.reset();
      this.loadInventory();
      setTimeout(() => this.successMsg = '', 3000);
    }, () => {
      this.errorMsg = 'Failed to add inventory.';
      setTimeout(() => this.errorMsg = '', 3000);
    });
  }

  loadInventory() {
    this.loading = true;
    this.api.get<any[]>('/inventory').subscribe(data => {
      this.inventory = data;
      this.loading = false;
    }, () => {
      this.errorMsg = 'Failed to load inventory.';
      this.loading = false;
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

  searchByBarcode() {
    const barcode = this.searchBarcode.trim();
    if (!barcode) {
      this.toastr.warning('Enter a barcode to search');
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.api.get<any>(`/inventory/barcode/${encodeURIComponent(barcode)}`).subscribe({
      next: item => {
        this.inventory = [item];
        this.loading = false;
      },
      error: () => {
        this.inventory = [];
        this.loading = false;
        this.errorMsg = 'No inventory found for this barcode.';
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
}
