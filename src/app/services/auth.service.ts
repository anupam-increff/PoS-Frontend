import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  userId: string;
  email: string;
  role: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  email: string;
  role: string;
  userId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private readonly USER_KEY = 'currentUser';
  private readonly SESSION_KEY = 'jsessionId';
  private logoutInProgress = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const user = this.getStoredUser();
    const sessionId = this.getSessionId();
    console.log('Initializing auth - stored user:', user);
    console.log('Session ID:', sessionId);
    if (user && sessionId) {
      this.currentUserSubject.next(user);
      // Check if session is still valid
      this.checkSessionValidity();
    }
  }

  private checkSessionValidity(): void {
    console.log('Checking session validity...');
    this.http.get<boolean>(`${environment.apiBaseUrl}/auth/session-check`, {
      withCredentials: true
    }).subscribe({
      next: (isValid) => {
        console.log('Session validity check result:', isValid);
        if (!isValid) {
          console.log('Session invalid, clearing session and redirecting to login');
          this.clearSession();
          this.router.navigate(['/auth']);
        }
      },
      error: (error) => {
        console.log('Session check error:', error);
        // If session check fails, clear session and redirect to login
        this.clearSession();
        this.router.navigate(['/auth']);
      }
    });
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    console.log('Attempting login with:', credentials);
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, credentials, {
      withCredentials: true
    }).pipe(
      tap((response) => {
        console.log('Login response:', response);
        const sessionId = this.extractSessionId();
        console.log('Extracted session ID:', sessionId);
        if (sessionId) {
          const user: User = {
            userId: response.userId || response.email,
            email: response.email,
            role: response.role,
            name: response.email.split('@')[0]
          };
          
          console.log('Creating user object:', user);
          this.storeUser(user, sessionId);
          this.currentUserSubject.next(user);
          console.log('User stored and current user updated');
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => ({ 
          error: { 
            message: error.error?.message || 'Login failed. Please check your credentials.' 
          } 
        }));
      })
    );
  }

  logout(): void {
    if (this.logoutInProgress) {
      return;
    }
    
    this.logoutInProgress = true;
    console.log('Logging out...');
    
    this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}, { 
      withCredentials: true 
    }).subscribe({
      next: () => {
        console.log('Logout successful');
        this.clearSession();
        this.router.navigate(['/auth']);
        this.logoutInProgress = false;
      },
      error: (error) => {
        console.log('Logout error:', error);
        this.clearSession();
        this.router.navigate(['/auth']);
        this.logoutInProgress = false;
      }
    });
  }

  isAuthenticated(): boolean {
    const user = this.getStoredUser();
    const sessionId = this.getSessionId();
    const isAuth = !!(user && sessionId);
    console.log('isAuthenticated check:', isAuth, 'user:', user, 'sessionId:', sessionId);
    return isAuth;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    const user = this.getCurrentUser();
    return user ? user.role : null;
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  isSupervisor(): boolean {
    return this.getUserRole() === 'supervisor';
  }

  isOperator(): boolean {
    return this.getUserRole() === 'operator';
  }

  isStandard(): boolean {
    return this.getUserRole() === 'standard';
  }

  canAccessFeature(feature: string): boolean {
    const role = this.getUserRole();
    
    if (!role) return false;
    
    if (role === 'supervisor' || role === 'admin') return true;
    
    if (role === 'operator') {
      const restrictedFeatures = [
        'reports', 'product-edit', 'product-delete', 'client-edit', 
        'client-delete', 'inventory-edit', 'inventory-delete', 
        'order-edit', 'order-delete', 'product-upload', 
        'inventory-upload', 'client-upload', 'generate-invoice'
      ];
      return !restrictedFeatures.includes(feature);
    }
    
    return false;
  }

  canPerformAction(action: string): boolean {
    const role = this.getUserRole();
    
    if (!role) return false;
    
    if (role === 'supervisor' || role === 'admin') return true;
    
    if (role === 'operator') {
      const allowedActions = [
        'view-dashboard', 'view-clients', 'view-products', 
        'view-inventory', 'view-orders', 'search-clients',
        'search-products', 'search-inventory', 'search-orders',
        'download-invoice', 'inline-edit-inventory'
      ];
      return allowedActions.includes(action);
    }
    
    return false;
  }

  getAuthHeaders(): any {
    return {
      'Content-Type': 'application/json'
    };
  }

  private storeUser(user: User, sessionId: string): void {
    sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
    sessionStorage.setItem(this.SESSION_KEY, sessionId);
    // Also store in localStorage for cross-tab persistence
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.SESSION_KEY, sessionId);
  }

  private getStoredUser(): User | null {
    try {
      // Try sessionStorage first, then localStorage
      let userStr = sessionStorage.getItem(this.USER_KEY);
      if (!userStr) {
        userStr = localStorage.getItem(this.USER_KEY);
      }
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private getSessionId(): string | null {
    // Try sessionStorage first, then localStorage
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = localStorage.getItem(this.SESSION_KEY);
    }
    return sessionId;
  }

  private extractSessionId(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'JSESSIONID') {
        return value;
      }
    }
    return null;
  }

  private clearSession(): void {
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.SESSION_KEY);
    this.currentUserSubject.next(null);
  }
} 