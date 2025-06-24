import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss'
})
export class AuthPageComponent {
  form: FormGroup;
  loading = false;
  errorMsg = '';
  role: 'SUPERVISOR' | 'OPERATOR' | null = null;

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  login() {
    if (this.form.invalid) return;
    this.loading = true;
    // Simulate API call for role assignment
    const email = this.form.value.email.trim().toLowerCase();
    // Example: check email against a hardcoded supervisor list
    const supervisorList = ['admin@increff.com'];
    this.role = supervisorList.includes(email) ? 'SUPERVISOR' : 'OPERATOR';
    sessionStorage.setItem('userId', email);
    sessionStorage.setItem('lastCheckTime', Date.now().toString());
    sessionStorage.setItem('role', this.role);
    this.loading = false;
  }
} 