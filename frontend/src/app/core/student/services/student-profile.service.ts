import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';
import { Role } from '../../auth/models/auth.model';
import { StudentProfile } from '../models/student-profile.model';

@Injectable({ providedIn: 'root' })
export class StudentProfileService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  private readonly profileSignal = signal<StudentProfile | null>(null);
  private readonly isLoadingSignal = signal(false);

  readonly profile = this.profileSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

  ensureLoaded(force = false): void {
    if (!this.isBrowser) {
      return;
    }

    const user = this.authService.currentUser;
    if (!user || user.role !== Role.STUDENT) {
      return;
    }

    if (this.isLoadingSignal()) {
      return;
    }

    if (this.profileSignal() && !force) {
      return;
    }

    this.isLoadingSignal.set(true);
    this.http
      .get<StudentProfile>(`${environment.apiBaseUrl}/users/student/profile`)
      .pipe(
        catchError((error) => {
          console.warn('Failed to load student profile', error);
          return of(null);
        }),
        finalize(() => this.isLoadingSignal.set(false)),
      )
      .subscribe((profile) => {
        if (profile) {
          this.profileSignal.set(profile);
        }
      });
  }

  clear(): void {
    this.profileSignal.set(null);
  }
}
