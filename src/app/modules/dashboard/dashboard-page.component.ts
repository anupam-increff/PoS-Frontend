import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule 
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  currentTime = new Date();
}
