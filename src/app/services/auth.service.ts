import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private readonly USER_KEY = 'currentUser';
  private readonly SESSION_KEY = 'jsessionId';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const user = this.getStoredUser();
    const sessionId = this.getSessionId();
    if (user && sessionId) {
      this.currentUserSubject.next(user);
    }
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    // Call the actual backend login endpoint
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/auth/login`, credentials, {
      withCredentials: true // Important for JSESSIONID
    }).pipe(
      tap((response) => {
        // Extract JSESSIONID from cookies
        const sessionId = this.extractSessionId();
        if (sessionId) {
          const user: User = {
            userId: response.email,
            email: response.email,
            role: response.role,
            name: response.email.split('@')[0]
          };
          
          // Store user data and session ID
          sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
          sessionStorage.setItem(this.SESSION_KEY, sessionId);
          
          // Update current user
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => {
        return throwError(() => ({ error: { message: 'Invalid credentials' } }));
      })
    );
  }

  logout(): void {
    // Clear session on backend (if endpoint exists)
    this.http.post(`${environment.apiBaseUrl}/auth/logout`, {}, { 
      withCredentials: true 
    }).subscribe({
      next: () => {
        this.clearSession();
        this.router.navigate(['/auth']);
      },
      error: () => {
        // If logout endpoint doesn't exist, just clear local session
        this.clearSession();
        this.router.navigate(['/auth']);
      }
    });
  }

  isAuthenticated(): boolean {
    const user = this.getStoredUser();
    const sessionId = this.getSessionId();
    return !!(user && sessionId);
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

  isStandard(): boolean {
    return this.getUserRole() === 'standard';
  }

  canAccessFeature(feature: string): boolean {
    const role = this.getUserRole();
    
    if (!role) return false;
    
    // Admin has access to everything
    if (role === 'admin') return true;
    
    // Standard user restrictions
    if (role === 'standard') {
      const restrictedFeatures = [
        'product-upload',
        'inventory-upload', 
        'order-placement',
        'client-delete',
        'product-delete',
        'inventory-delete',
        'reports'
      ];
      
      return !restrictedFeatures.includes(feature);
    }
    
    return false;
  }

  getAuthHeaders(): HttpHeaders {
    const sessionId = this.getSessionId();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (sessionId) {
      // Add JSESSIONID to headers
      headers = headers.set('Cookie', `JSESSIONID=${sessionId}`);
    }

    return headers;
  }

  private getStoredUser(): User | null {
    try {
      const userStr = sessionStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  private getSessionId(): string | null {
    return sessionStorage.getItem(this.SESSION_KEY);
  }

  private extractSessionId(): string | null {
    // Extract JSESSIONID from cookies
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
    this.currentUserSubject.next(null);
  }
} 