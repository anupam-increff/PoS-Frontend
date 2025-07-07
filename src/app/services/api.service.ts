import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
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

    const headers = this.getRequestHeaders();
    
    return this.http.get(url, {
      ...options,
      headers,
      params: new HttpParams({ fromObject: options?.params || {} })
    });
  }

  // --- POST ---
  post<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('POST', url, body);
    
    const headers = this.getRequestHeaders();
    
    return this.http.post<T>(url, body, { headers });
  }

  // --- PUT ---
  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('PUT', url, body);
    
    const headers = this.getRequestHeaders();
    
    return this.http.put<T>(url, body, { headers });
  }

  // --- DELETE ---
  delete<T>(endpoint: string): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('DELETE', url);
    
    const headers = this.getRequestHeaders();
    
    return this.http.delete<T>(url, { headers });
  }

  private getRequestHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
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
