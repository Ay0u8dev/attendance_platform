import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="forbidden-container">
      <div class="forbidden-content">
        <div class="error-icon">🚫</div>
        <h1>Accès Refusé (403)</h1>
        <p class="error-message">Vous n'avez pas l'autorisation d'accéder à cette ressource.</p>
        <p class="domain-message">
          Assurez-vous d'utiliser votre adresse email autorisée du domaine @ump.ac.ma
        </p>
        <div class="actions">
          <button class="btn-primary" (click)="logout()">Se déconnecter</button>
          <button class="btn-secondary" (click)="goHome()">Accueil</button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .forbidden-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      }

      .forbidden-content {
        text-align: center;
        background: white;
        padding: 60px 40px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        max-width: 500px;
      }

      .error-icon {
        font-size: 80px;
        margin-bottom: 20px;
      }

      h1 {
        color: #333;
        font-size: 32px;
        margin: 20px 0;
        font-weight: 600;
      }

      .error-message {
        color: #666;
        font-size: 16px;
        margin: 15px 0;
        line-height: 1.6;
      }

      .domain-message {
        color: #d32f2f;
        font-size: 14px;
        margin: 20px 0;
        padding: 12px;
        background: #ffebee;
        border-radius: 8px;
        border-left: 4px solid #d32f2f;
      }

      .actions {
        display: flex;
        gap: 12px;
        margin-top: 30px;
        justify-content: center;
      }

      .btn-primary,
      .btn-secondary {
        padding: 12px 24px;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
      }

      .btn-primary {
        background: #d32f2f;
        color: white;
      }

      .btn-primary:hover {
        background: #b71c1c;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(211, 47, 47, 0.3);
      }

      .btn-secondary {
        background: #e0e0e0;
        color: #333;
      }

      .btn-secondary:hover {
        background: #bdbdbd;
        transform: translateY(-2px);
      }
    `,
  ],
})
export class ForbiddenComponent {
  constructor(private router: Router) {}

  logout(): void {
    localStorage.removeItem('backend_access_token');
    sessionStorage.removeItem('oidc_token');
    this.router.navigate(['/']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
