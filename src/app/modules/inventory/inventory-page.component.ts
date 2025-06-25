import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

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

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.uploadForm = this.fb.group({
      file: [null, Validators.required]
    });

    this.addForm = this.fb.group({
      productId: [null, Validators.required],
      quantity: [null, [Validators.required, Validators.min(1)]]
    });

    this.editForm = this.fb.group({
      id: [{ value: null, disabled: true }],
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
      productId: this.addForm.value.productId,
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
      id: item.id,
      quantity: item.quantity
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
  }

  saveEdit() {
    if (this.editForm.invalid) return;

    const payload = {
      productId: this.editForm.getRawValue().id,
      quantity: this.editForm.value.quantity
    };

    this.api.put(`/inventory/${payload.productId}`, payload).subscribe(() => {
      this.successMsg = 'Inventory updated.';
      this.closeEditModal();
      this.loadInventory();
      setTimeout(() => this.successMsg = '', 3000);
    }, () => {
      this.errorMsg = 'Failed to update inventory.';
      setTimeout(() => this.errorMsg = '', 3000);
    });
  }
}
