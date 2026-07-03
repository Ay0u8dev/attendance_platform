import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { finalize, tap } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

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
          this.profileSignal.set(this.withCacheBustedProfilePhoto(profile));
        }
      });
  }

  updateProfilePhoto(file: File): Observable<StudentProfile> {
    const contentType = file.type || 'image/jpeg';
    // 1. Get presigned URL
    return this.http
      .get<{ url: string; key: string }>(`${environment.apiBaseUrl}/users/student/profile/photo/presigned-url?contentType=${encodeURIComponent(contentType)}`)
      .pipe(
        switchMap((presignedData) => {
          // 2. Upload directly to Cloudflare R2
          return this.http.put(presignedData.url, file, {
            headers: {
              'Content-Type': contentType
            }
          }).pipe(
            // 3. Send the object key or public URL to the backend
            // In our architecture, the backend just needs the object key or public URL.
            // Assuming the frontend loads it directly via public R2 bucket domain:
            // Since we don't have the bucket public domain in frontend config yet, 
            // we can just send the key, or construct the URL if we know the domain.
            // For now, let's just pass the key (or the full public URL if the backend handles that).
            // Actually, we should send a constructed public URL or just the key. Let's send the key.
            // Wait, the backend requires pfpUrl string. We should prepend the public R2 domain or let backend handle it.
            // Let's send the relative key, and the frontend will prepend the public URL later, or we just send the key.
            switchMap(() => {
              const pfpUrl = `${environment.r2PublicUrl}/${presignedData.key}`;
              return this.http.put<StudentProfile>(`${environment.apiBaseUrl}/users/student/profile/photo`, { pfpUrl });
            })
          );
        }),
        tap((profile) => {
          this.profileSignal.set(this.withCacheBustedProfilePhoto(profile));
        })
      );
  }

  clear(): void {
    this.profileSignal.set(null);
  }

  private withCacheBustedProfilePhoto(profile: StudentProfile): StudentProfile {
    const pfpUrl = profile.pfpUrl?.trim();
    if (!pfpUrl) {
      return profile;
    }

    const separator = pfpUrl.includes('?') ? '&' : '?';
    return {
      ...profile,
      pfpUrl: `${pfpUrl}${separator}v=${Date.now()}`,
    };
  }
}
