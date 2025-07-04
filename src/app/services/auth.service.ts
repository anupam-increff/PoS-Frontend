import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  userId: string;
  username: string;
  role: 'admin' | 'standard';
  name?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
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

  login(credentials: LoginCredentials): Observable<any> {
    // Create Basic Auth header
    const authString = btoa(`${credentials.username}:${credentials.password}`);
    const headers = new HttpHeaders({
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json'
    });

    // Make a request to any protected endpoint to get JSESSIONID
    return this.http.get(`${environment.apiBaseUrl}/client`, { 
      headers,
      withCredentials: true // Important for JSESSIONID
    }).pipe(
      tap(() => {
        // Extract JSESSIONID from cookies
        const sessionId = this.extractSessionId();
        if (sessionId) {
          // Determine role based on username
          let role: 'admin' | 'standard' = 'standard';
          if (credentials.username === 'admin') {
            role = 'admin';
          }
          
          const user: User = {
            userId: credentials.username,
            username: credentials.username,
            role: role,
            name: credentials.username
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
    // Clear session on backend
    this.http.post(`${environment.apiBaseUrl}/logout`, {}, { 
      withCredentials: true 
    }).subscribe(() => {
      this.clearSession();
      this.router.navigate(['/auth']);
    }, () => {
      this.clearSession();
      this.router.navigate(['/auth']);
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

  getUserRole(): 'admin' | 'standard' | null {
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