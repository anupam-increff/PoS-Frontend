import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-client-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './client-page.component.html',
  styleUrl: './client-page.component.scss'
})
export class ClientPageComponent implements OnInit {
  clients: any[] = [];
  clientForm: FormGroup;
  editingId: number | null = null;
  showModal = false;
  loading = false;
  errorMsg = '';

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.clientForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    console.log('ClientPageComponent loaded');
    this.loadClients();
  }

  loadClients() {
    this.loading = true;
    console.log('Calling API: /client');
    this.api.get<any[]>('/client').subscribe({
      next: data => { 
        console.log('API /client response:', data);
        this.clients = data; this.loading = false; 
      },
      error: err => { 
        console.error('API /client error:', err);
        this.errorMsg = 'Failed to load clients.'; this.loading = false; 
      }
    });
  }

  openModal(client?: any) {
    this.showModal = true;
    this.editingId = client ? client.id : null;
    this.clientForm.reset({
      name: client ? client.name : '',
      email: client ? client.email : ''
    });
  }

  closeModal() {
    this.showModal = false;
    this.editingId = null;
    this.clientForm.reset();
  }

  saveClient() {
    if (this.clientForm.invalid) return;
    const formValue = {
      ...this.clientForm.value,
      name: this.clientForm.value.name.trim().toLowerCase(),
      email: this.clientForm.value.email.trim().toLowerCase()
    };
    if (this.editingId) {
      this.api.put(`/client/${this.editingId}`, formValue).subscribe(() => {
        this.loadClients();
        this.closeModal();
      });
    } else {
      this.api.post('/client', formValue).subscribe(() => {
        this.loadClients();
        this.closeModal();
      });
    }
  }

  startEdit(client: any) {
    this.openModal(client);
  }
}
