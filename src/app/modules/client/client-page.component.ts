import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-client-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './client-page.component.html',
  styleUrls: ['./client-page.component.scss']
})
export class ClientPageComponent implements OnInit {
  clientForm: FormGroup;
  clients: any[] = [];
  editingId: number | null = null;
  showModal = false;

  tab: 'list' = 'list';
  loading = false;
  searchName = '';
  searchResult: any = null;

  editIndex: number | null = null;
  editClient: any = null;

  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  isSearchMode = false;
  
  // Make Math available in template
  Math = Math;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toastr: ToastrService
  ) {
    this.clientForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(page: number = 0): void {
    this.loading = true;
    this.isSearchMode = false;
    this.currentPage = page;
    
    this.api.getClientsPaginated(page, this.pageSize).subscribe({
      next: (response: any) => {
        this.clients = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Failed to load clients.');
        this.loading = false;
      }
    });
  }

  openModal(client?: any): void {
    this.showModal = true;
    this.editingId = client ? client.id : null;
    this.clientForm.reset({
      name: client ? client.name : ''
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.editingId = null;
    this.clientForm.reset();
  }

  saveClient(): void {
    if (this.clientForm.invalid) {
      this.toastr.warning('Please enter a valid name.');
      return;
    }

    const formValue = {
      name: this.clientForm.value.name.trim().toLowerCase()
    };

    if (this.editingId) {
      this.api.put(`/client/${this.editingId}`, formValue).subscribe({
        next: () => {
          this.toastr.success('Client updated successfully!');
          this.loadClients();
          this.closeModal();
        },
        error: err => {
          this.toastr.error(err.error?.message || 'Failed to update client');
        }
      });
    } else {
      this.api.post('/client', formValue).subscribe({
        next: () => {
          this.toastr.success('Client added successfully!');
          this.loadClients();
          this.closeModal();
        },
        error: err => {
          this.toastr.error(err.error?.message || 'Failed to add client');
        }
      });
    }
  }

  startEdit(i: number, client: any) {
    this.editIndex = i;
    this.editClient = { ...client };
  }

  trackByClientId(index: number, client: any) {
    return client.id;
  }

  saveEdit() {
    if (!this.editClient) return;
    this.api.put(`/client/${this.editClient.id}`, this.editClient).subscribe({
      next: () => {
        this.toastr.success('Client updated');
        this.clients[this.editIndex!] = { ...this.editClient };
        this.editIndex = null;
        this.editClient = null;
      },
      error: (err) => {
        this.toastr.error(err?.error?.message || 'Failed to update client');
      }
    });
  }

  searchClient(page: number = 0): void {
    const name = this.searchName.trim();
    if (!name) {
      this.toastr.warning('Please enter a client name to search.');
      return;
    }

    this.loading = true;
    this.isSearchMode = true;
    this.currentPage = page;

    this.api.searchClientsPaginated(name, page, this.pageSize).subscribe({
      next: (response: any) => {
        this.clients = response.content || [];
        this.totalItems = response.totalItems || 0;
        this.totalPages = response.totalPages || 0;
        this.pageSize = response.pageSize || this.pageSize;
        this.loading = false;
        if (this.clients.length > 0) {
          this.toastr.success(`Found ${this.totalItems} client(s)!`);
        } else {
          this.toastr.warning('No clients found.');
        }
      },
      error: () => {
        this.toastr.error('Failed to search clients.');
        this.loading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchName = '';
    this.searchResult = null;
    this.loadClients(0);
  }

  cancelEdit() {
    this.editIndex = null;
    this.editClient = null;
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (this.isSearchMode) {
      this.searchClient(page);
    } else {
      this.loadClients(page);
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