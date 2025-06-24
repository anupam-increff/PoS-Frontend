import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, params?: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('GET', url, params);
    return this.http.get<T>(url, { params });
  }

  post<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('POST', url, body);
    return this.http.post<T>(url, body);
  }

  put<T>(endpoint: string, body: any): Observable<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('PUT', url, body);
    return this.http.put<T>(url, body);
  }
} 