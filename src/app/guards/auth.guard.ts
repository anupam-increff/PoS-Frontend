import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth'], { queryParams: { returnUrl: state.url } });
      return of(false);
    }

    // Check for role-based access
    const requiredRole = route.data['requiredRole'];
    if (requiredRole) {
      const userRole = this.authService.getUserRole();
      if (userRole !== requiredRole) {
        this.router.navigate(['/dashboard']);
        return of(false);
      }
    }

    // Check for feature-based access
    const requiredFeature = route.data['requiredFeature'];
    if (requiredFeature) {
      if (!this.authService.canAccessFeature(requiredFeature)) {
        this.router.navigate(['/dashboard']);
        return of(false);
      }
    }

    return of(true);
  }
} 