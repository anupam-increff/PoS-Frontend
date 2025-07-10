import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, Router, NavigationEnd, RouterLinkActive } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService, User } from './services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

declare var bootstrap: any;

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
  private authSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;
  private logoutModal: any;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;
    });
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });
    this.checkExistingSession();
  }

  ngOnDestroy() {
    if (this.authSubscription) this.authSubscription.unsubscribe();
    if (this.routerSubscription) this.routerSubscription.unsubscribe();
  }

  private checkExistingSession(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.currentUser = user;
        this.isAuthenticated = true;
      }
    }
  }

  showLogoutConfirm(): void {
    // Try to initialize Bootstrap modal if not already done
    if (!this.logoutModal) {
      const modalElement = document.getElementById('logoutModal');
      if (modalElement) {
        // Try Bootstrap first
        if (typeof bootstrap !== 'undefined') {
          this.logoutModal = new bootstrap.Modal(modalElement);
        }
      }
    }
    
    // If Bootstrap modal is available, use it
    if (this.logoutModal) {
      this.logoutModal.show();
      return;
    }
    
    // Fallback: show modal manually
    const modalElement = document.getElementById('logoutModal');
    if (modalElement) {
      modalElement.classList.add('show');
      modalElement.style.display = 'block';
      modalElement.setAttribute('aria-hidden', 'false');
      
      // Add backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
      
      // Add click handler to backdrop to close modal
      backdrop.addEventListener('click', () => {
        this.closeLogoutModal();
      });
    }
  }

  logout(): void {
    this.authService.logout();
    this.closeLogoutModal();
  }

  closeLogoutModal(): void {
    if (this.logoutModal) {
      this.logoutModal.hide();
    } else {
      // Handle fallback modal
      const modalElement = document.getElementById('logoutModal');
      if (modalElement) {
        modalElement.classList.remove('show');
        modalElement.style.display = 'none';
        modalElement.setAttribute('aria-hidden', 'true');
        // Remove backdrop
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    }
  }

  get sessionStorage() {
    return window.sessionStorage;
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route;
  }
}
