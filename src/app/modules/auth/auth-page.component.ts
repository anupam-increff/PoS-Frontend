import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './auth-page.component.html',
  styleUrls: ['./auth-page.component.scss']
})
export class AuthPageComponent implements OnInit {
  loginForm: FormGroup;
  signupForm: FormGroup;
  loading = false;
  errorMessage = '';
  mode: 'login' | 'signup' = 'login';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });

    this.signupForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
    
    // Handle autofill detection after a short delay
    setTimeout(() => {
      this.checkAutofill();
    }, 100);
  }

  checkAutofill() {
    // Check if form fields have been autofilled
    const emailControl = this.loginForm.get('email');
    const passwordControl = this.loginForm.get('password');
    
    // Get the actual DOM elements
    const emailElement = document.querySelector('input[formControlName="email"]') as HTMLInputElement;
    const passwordElement = document.querySelector('input[formControlName="password"]') as HTMLInputElement;
    
    if (emailElement && passwordElement && emailElement.value && passwordElement.value) {
      // Update the form controls with autofilled values
      emailControl?.setValue(emailElement.value);
      passwordControl?.setValue(passwordElement.value);
      
      // Mark as touched to trigger validation
      emailControl?.markAsTouched();
      passwordControl?.markAsTouched();
      
      // Update form validation status
      this.loginForm.updateValueAndValidity();
    }
  }

  onInputChange() {
    // Update form validation when user types or autofill occurs
    this.loginForm.updateValueAndValidity();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  switchMode(newMode: 'login' | 'signup') {
    this.mode = newMode;
    this.errorMessage = '';
    this.loginForm.reset();
    this.signupForm.reset();
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const credentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.password
    };

    console.log('Attempting login with:', credentials);

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('Login successful:', response);
        this.loading = false;
        this.toastr.success('Login successful!');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Login failed. Please check your credentials.';
        this.toastr.error(this.errorMessage, 'Login Failed');
      }
    });
  }

  onSignup() {
    if (this.signupForm.invalid) {
      this.markFormGroupTouched(this.signupForm);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const signupData = {
      email: this.signupForm.value.email,
      password: this.signupForm.value.password,
      confirmPassword: this.signupForm.value.confirmPassword
    };

    console.log('Attempting signup with:', signupData);

    this.authService.signup(signupData).subscribe({
      next: (response: any) => {
        console.log('Signup successful:', response);
        this.loading = false;
        this.toastr.success('Account created successfully! Please login.', 'Signup Successful');
        this.switchMode('login');
      },
      error: (error: any) => {
        console.error('Signup error:', error);
        this.loading = false;
        this.errorMessage = error.error?.message || 'Signup failed. Please try again.';
        this.toastr.error(this.errorMessage, 'Signup Failed');
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
} 