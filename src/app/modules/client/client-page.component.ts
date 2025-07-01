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

  loadClients(): void {
    this.loading = true;
    this.api.get<any[]>('/client').subscribe({
      next: data => {
        this.clients = data;
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

  startEdit(client: any): void {
    this.openModal(client);
  }

  searchClient(): void {
    const name = this.searchName.trim().toLowerCase();
    if (!name) {
      this.toastr.warning('Please enter a client name to search.');
      return;
    }

    this.api.get<any>(`/client/${name}`).subscribe({
      next: res => {
        this.searchResult = res;
        this.clients = [res];
        this.toastr.success('Client found!');
      },
      error: () => {
        this.searchResult = null;
        this.clients = [];
        this.toastr.warning('Client not found.');
      }
    });
  }

  clearSearch(): void {
    this.searchName = '';
    this.searchResult = null;
    this.loadClients();
  }
}