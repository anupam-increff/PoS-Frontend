import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd, RouterLinkActive } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService, User } from './services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, CommonModule, ReactiveFormsModule, RouterLink , RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'PoS-Frontend';
  navbarCollapsed = true;
  
  isAuthenticated = false;
  currentUser: User | null = null;
  currentRoute = '';
  showLogoutModal = false;
  
  private authSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      console.log('Auth state changed:', user);
      this.currentUser = user;
      this.isAuthenticated = !!user;
      console.log('Is authenticated:', this.isAuthenticated);
    });

    // Track current route for navbar highlighting
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });

    // Check for existing session on page load
    this.checkExistingSession();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private checkExistingSession(): void {
    // Check if user is already logged in from another tab
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
      }
    }
  }

  showLogoutConfirm(): void {
    this.showLogoutModal = true;
  }

  hideLogoutConfirm(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.authService.logout();
    this.hideLogoutConfirm();
  }

  get sessionStorage() {
    return window.sessionStorage;
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route;
  }
}
