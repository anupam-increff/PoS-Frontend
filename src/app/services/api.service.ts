import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastr: ToastrService
  ) {}

  // --- GET Overloads ---

  get<T>(endpoint: string): Observable<T>;
  get<T>(endpoint: string, options: {
    params?: { [param: string]: string | number | boolean },
    responseType?: 'json'
  }): Observable<T>;
  get(endpoint: string, options: {
    params?: { [param: string]: string | number | boolean },
    responseType: 'blob'
  }): Observable<Blob>;
  get(endpoint: string, options: {
    params?: { [param: string]: string | number | boolean },
    responseType: 'text'
  }): Observable<string>;

  // --- GET Implementation ---
  get(endpoint: string, options: any = {}): Observable<any> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('GET', url, options);

    // Check if this is a protected operation
    if (this.isProtectedOperation(endpoint) && !this.authService.isAuthenticated()) {
      this.toastr.error('Please login to access this feature', 'Authentication Required');
      return throwError(() => ({ status: 401, message: 'Authentication required' }));
    }

    // Check role-based access for authenticated users
    if (this.authService.isAuthenticated() && this.isRestrictedOperation(endpoint)) {
      const userRole = this.authService.getUserRole();
      if (userRole === 'operator' && this.isOperatorRestricted(endpoint)) {
        this.toastr.error('You do not have permission to access this feature', 'Access Denied');
        return throwError(() => ({ status: 403, message: 'Access denied' }));
      }
    }

    const headers = this.getRequestHeaders();
    
    return this.http.get(url, {
      ...options,
      headers,
      withCredentials: true,
      params: new HttpParams({ fromObject: options?.params || {} })
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // --- POST ---
  post<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('POST', url, body);
    
    // Check if this is a protected operation
    if (this.isProtectedOperation(endpoint) && !this.authService.isAuthenticated()) {
      this.toastr.error('Please login to perform this action', 'Authentication Required');
      return throwError(() => ({ status: 401, message: 'Authentication required' }));
    }

    // Check role-based access for authenticated users
    if (this.authService.isAuthenticated() && this.isRestrictedOperation(endpoint)) {
      const userRole = this.authService.getUserRole();
      if (userRole === 'operator' && this.isOperatorRestricted(endpoint)) {
        this.toastr.error('You do not have permission to perform this action', 'Access Denied');
        return throwError(() => ({ status: 403, message: 'Access denied' }));
      }
    }
    
    // Handle FormData (file uploads) differently
    let headers = this.getRequestHeaders();
    if (body instanceof FormData) {
      // Don't set Content-Type for FormData - let browser set it with boundary
      headers = new HttpHeaders();
    }
    
    return this.http.post<T>(url, body, { 
      headers,
      withCredentials: true 
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // --- PUT ---
  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('PUT', url, body);
    
    // Check if this is a protected operation
    if (this.isProtectedOperation(endpoint) && !this.authService.isAuthenticated()) {
      this.toastr.error('Please login to perform this action', 'Authentication Required');
      return throwError(() => ({ status: 401, message: 'Authentication required' }));
    }

    // PUT operations are restricted to supervisor only
    if (this.authService.isAuthenticated()) {
      const userRole = this.authService.getUserRole();
      if (userRole !== 'supervisor' && userRole !== 'admin') {
        this.toastr.error('Only supervisors can perform edit operations', 'Access Denied');
        return throwError(() => ({ status: 403, message: 'Access denied' }));
      }
    }
    
    const headers = this.getRequestHeaders();
    
    return this.http.put<T>(url, body, { 
      headers,
      withCredentials: true 
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // --- DELETE ---
  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('DELETE', url);
    
    // Check if this is a protected operation
    if (this.isProtectedOperation(endpoint) && !this.authService.isAuthenticated()) {
      this.toastr.error('Please login to perform this action', 'Authentication Required');
      return throwError(() => ({ status: 401, message: 'Authentication required' }));
    }

    // Check role-based access for authenticated users
    if (this.authService.isAuthenticated() && this.isRestrictedOperation(endpoint)) {
      const userRole = this.authService.getUserRole();
      if (userRole === 'operator' && this.isOperatorRestricted(endpoint)) {
        this.toastr.error('You do not have permission to perform this action', 'Access Denied');
        return throwError(() => ({ status: 403, message: 'Access denied' }));
      }
    }
    
    const headers = this.getRequestHeaders();
    
    return this.http.delete<T>(url, { 
      headers,
      withCredentials: true 
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  private getRequestHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  private isProtectedOperation(endpoint: string): boolean {
    const protectedEndpoints = [
      // Add/Edit operations
      '/client/add',
      '/client/edit',
      '/client/delete',
      '/product/add',
      '/product/edit', 
      '/product/delete',
      '/inventory/add',
      '/inventory/edit',
      '/inventory/delete',
      '/order/add',
      '/order/edit',
      '/order/delete',
      
      // Bulk uploads
      '/product/upload',
      '/inventory/upload',
      '/client/upload',
      
      // Invoice generation
      '/order/generate-invoice',
      '/invoice/generate',
      
      // Reports
      '/reports/',
      '/report/',
      
      // Protected data operations
      '/client/search',
      '/product/search',
      '/inventory/search',
      '/order/search'
    ];

    return protectedEndpoints.some(endpointPath => endpoint.includes(endpointPath));
  }

  private isRestrictedOperation(endpoint: string): boolean {
    const restrictedEndpoints = [
      // Reports (operator cannot access)
      '/reports/',
      '/report/',
      
      // Edit operations (operator cannot do)
      '/client/edit',
      '/client/delete',
      '/product/edit',
      '/product/delete',
      '/inventory/edit',
      '/inventory/delete',
      '/order/edit',
      '/order/delete',
      
      // Upload operations (operator cannot do)
      '/product/upload',
      '/inventory/upload',
      '/client/upload',
      
      // Invoice generation (operator cannot do)
      '/order/generate-invoice',
      '/invoice/generate'
    ];

    return restrictedEndpoints.some(endpointPath => endpoint.includes(endpointPath));
  }

  private isOperatorRestricted(endpoint: string): boolean {
    // Operators can download invoices but not generate them
    if (endpoint.includes('/invoice/download') || endpoint.includes('/order/download-invoice')) {
      return false; // Operators can download
    }
    
    // Operators can do inline editing of inventory
    if (endpoint.includes('/inventory/update-quantity')) {
      return false; // Operators can update quantity
    }
    
    return true; // Everything else is restricted for operators
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    
    if (error.status === 403) {
      const message = error.error?.message || 'Access denied: You don\'t have permission to perform this action';
      this.toastr.error(message, 'Access Denied');
    } else if (error.status === 401) {
      this.toastr.error('Session expired. Please login again.', 'Authentication Error');
      this.authService.logout();
    } else if (error.status === 0) {
      this.toastr.error('Unable to connect to server. Please check your connection.', 'Connection Error');
    } else {
      const message = error.error?.message || 'An unexpected error occurred';
      this.toastr.error(message, 'Error');
    }
    
    return throwError(() => error);
  }

  // --- Report Methods ---
  
  async getClients(): Promise<any[]> {
    const result = await this.get<any[]>('/clients').toPromise();
    return result || [];
  }

  // --- Client Methods ---
  
  getClientsPaginated(page: number = 0, pageSize: number = 10): Observable<any> {
    return this.get('/client', {
      params: { page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  searchClientsPaginated(query: string, page: number = 0, pageSize: number = 10): Observable<any> {
    return this.get('/client/search', {
      params: { query, page: page.toString(), pageSize: pageSize.toString() }
    });
  }

  async getDateRangeReport(startDate: string, endDate: string): Promise<any[]> {
    const result = await this.get<any[]>('/reports/day-sales', {
      params: { start: startDate, end: endDate }
    }).toPromise();
    return result || [];
  }

  async getClientSalesReport(clientName: string): Promise<any[]> {
    const result = await this.get<any[]>('/reports/sales', {
      params: { clientName }
    }).toPromise();
    return result || [];
  }
}
