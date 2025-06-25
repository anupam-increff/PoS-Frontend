import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

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

    return this.http.get(url, {
      ...options,
      params: new HttpParams({ fromObject: options?.params || {} })
    });
  }

  // --- POST ---
  post<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('POST', url, body);
    return this.http.post<T>(url, body);
  }

  // --- PUT ---
  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('PUT', url, body);
    return this.http.put<T>(url, body);
  }
}
