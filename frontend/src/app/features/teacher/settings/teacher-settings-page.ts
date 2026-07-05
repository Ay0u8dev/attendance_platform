import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/services/auth.service';
import {
  SESSION_DURATION_OPTIONS,
  SessionDurationMinutes,
} from '../../../core/teacher/models/teacher-preferences.model';
import { TeacherProfileService } from '../../../core/teacher/services/teacher-profile.service';
import { TeacherPreferencesService } from '../../../core/teacher/services/teacher-preferences.service';
import { DeleteModal } from '../../../shared/components/delete-modal/delete-modal';
import { SettingsSectionCard } from '../../../shared/components/settings/settings-section-card';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-teacher-settings-page',
  imports: [PageHeader, SettingsSectionCard, DeleteModal],
  templateUrl: './teacher-settings-page.html',
  styleUrls: [
    '../../../shared/components/settings/settings-page.css',
    '../teacher-page.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSettingsPage {
  private readonly authService = inject(AuthService);
  private readonly teacherProfileService = inject(TeacherProfileService);
  private readonly teacherPreferences = inject(TeacherPreferencesService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly profile = this.teacherProfileService.profile;
  readonly isLoading = this.teacherProfileService.isLoading;
  readonly profilePhotoInput = viewChild<ElementRef<HTMLInputElement>>('profilePhotoInput');
  readonly profileImageFailed = signal(false);
  readonly profilePhotoUploading = signal(false);
  readonly profilePhotoRemoving = signal(false);
  readonly profilePhotoRemoveOpen = signal(false);
  readonly profilePhotoError = signal<string | null>(null);
  readonly profilePhotoMessage = signal<string | null>(null);
  readonly selectedProfilePhotoPreview = signal<string | null>(null);
  readonly durationDropdownOpen = signal(false);
  readonly draftDurationMinutes = signal<SessionDurationMinutes>(
    this.teacherPreferences.sessionDurationMinutes(),
  );
  readonly savedMessage = signal<string | null>(null);

  readonly durationOptions = SESSION_DURATION_OPTIONS;

  readonly fullName = computed(() => {
    const profile = this.profile();
    const user = this.authService.currentUser;

    const profileName = this.buildName(profile?.firstName, profile?.lastName);
    if (profileName) {
      return profileName;
    }

    const userName = this.buildName(user?.firstName, user?.lastName);
    if (userName) {
      return userName;
    }

    return this.email() || 'Enseignant';
  });

  readonly email = computed(() => {
    return (
      this.normalize(this.profile()?.email) ??
      this.normalize(this.authService.currentUser?.email) ??
      '-'
    );
  });

  readonly initials = computed(() =>
    this.fullName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'PR',
  );

  readonly profileImageUrl = computed(() => {
    const preview = this.selectedProfilePhotoPreview();
    if (preview) {
      return preview;
    }

    if (this.profileImageFailed()) {
      return null;
    }

    const value = this.profile()?.pfpUrl?.trim();
    return value && value.length > 0 ? value : null;
  });

  readonly persistedProfilePhotoUrl = computed(() => {
    const value = this.profile()?.pfpUrl?.trim();
    return value && value.length > 0 ? value : null;
  });

  readonly selectedDurationLabel = computed(
    () =>
      this.durationOptions.find((option) => option.value === this.draftDurationMinutes())?.label ??
      `${this.draftDurationMinutes()} min`,
  );

  readonly hasUnsavedDuration = computed(
    () => this.draftDurationMinutes() !== this.teacherPreferences.sessionDurationMinutes(),
  );

  constructor() {
    this.teacherProfileService.ensureLoaded();
    this.destroyRef.onDestroy(() => this.revokeProfilePhotoPreview());
  }

  toggleDurationDropdown(): void {
    this.durationDropdownOpen.update((value) => !value);
  }

  closeDurationDropdown(): void {
    this.durationDropdownOpen.set(false);
  }

  selectDuration(minutes: SessionDurationMinutes): void {
    this.draftDurationMinutes.set(minutes);
    this.closeDurationDropdown();
  }

  saveClassPreferences(): void {
    this.teacherPreferences.setSessionDuration(this.draftDurationMinutes());
    this.savedMessage.set('Préférences de cours enregistrées.');
    this.toastService.success(
      'Préférences mises à jour',
      `Durée de séance fixée à ${this.teacherPreferences.sessionDurationLabel()}.`,
    );

    window.setTimeout(() => this.savedMessage.set(null), 3000);
  }

  onProfileImageError(): void {
    this.profileImageFailed.set(true);
    if (this.profile()?.pfpUrl) {
      this.profilePhotoError.set(
        "La photo est enregistrée, mais l'aperçu ne peut pas être chargé pour le moment.",
      );
    }
  }

  triggerProfilePhotoInput(): void {
    if (this.profilePhotoUploading() || this.profilePhotoRemoving()) {
      return;
    }

    this.profilePhotoError.set(null);
    this.profilePhotoMessage.set(null);
    this.profilePhotoInput()?.nativeElement.click();
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file || this.profilePhotoUploading() || this.profilePhotoRemoving()) {
      return;
    }

    if (!this.isValidProfilePhoto(file)) {
      this.profilePhotoError.set('Choisissez une image JPG, PNG ou WebP de 5 Mo maximum.');
      this.profilePhotoMessage.set(null);
      return;
    }

    this.setProfilePhotoPreview(file);
    this.profilePhotoUploading.set(true);
    this.profilePhotoError.set(null);
    this.profilePhotoMessage.set(null);

    this.teacherProfileService
      .updateProfilePhoto(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.profilePhotoUploading.set(false)),
      )
      .subscribe({
        next: () => {
          this.profileImageFailed.set(false);
          this.profilePhotoMessage.set('Photo de profil mise à jour avec succès.');
        },
        error: (error) => {
          this.revokeProfilePhotoPreview();
          this.profilePhotoError.set(this.profilePhotoFailureMessage(error));
        },
      });
  }

  openProfilePhotoRemoval(): void {
    if (!this.persistedProfilePhotoUrl() || this.profilePhotoUploading() || this.profilePhotoRemoving()) {
      return;
    }

    this.profilePhotoError.set(null);
    this.profilePhotoMessage.set(null);
    this.profilePhotoRemoveOpen.set(true);
  }

  closeProfilePhotoRemoval(): void {
    if (!this.profilePhotoRemoving()) {
      this.profilePhotoRemoveOpen.set(false);
    }
  }

  confirmProfilePhotoRemoval(): void {
    if (!this.persistedProfilePhotoUrl() || this.profilePhotoUploading() || this.profilePhotoRemoving()) {
      return;
    }

    this.profilePhotoRemoving.set(true);
    this.profilePhotoError.set(null);
    this.profilePhotoMessage.set(null);

    this.teacherProfileService
      .removeProfilePhoto()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.profilePhotoRemoving.set(false)),
      )
      .subscribe({
        next: () => {
          this.revokeProfilePhotoPreview();
          this.profileImageFailed.set(false);
          this.profilePhotoRemoveOpen.set(false);
          this.profilePhotoMessage.set('Photo de profil supprimée.');
        },
        error: (error) => {
          this.profilePhotoRemoveOpen.set(false);
          this.profilePhotoError.set(this.profilePhotoRemovalFailureMessage(error));
        },
      });
  }

  private normalize(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private buildName(firstName: unknown, lastName: unknown): string | null {
    const parts = [this.normalize(firstName), this.normalize(lastName)].filter(
      (value): value is string => Boolean(value),
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }

  private isValidProfilePhoto(file: File): boolean {
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    return allowedTypes.has(file.type) && file.size <= 5 * 1024 * 1024;
  }

  private setProfilePhotoPreview(file: File): void {
    if (!this.isBrowser) {
      return;
    }

    this.revokeProfilePhotoPreview();
    this.selectedProfilePhotoPreview.set(URL.createObjectURL(file));
    this.profileImageFailed.set(false);
  }

  private revokeProfilePhotoPreview(): void {
    const previewUrl = this.selectedProfilePhotoPreview();
    if (this.isBrowser && previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    this.selectedProfilePhotoPreview.set(null);
  }

  private profilePhotoFailureMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez que le backend est démarré.";
      }
      if (error.status === 400) {
        return 'Photo refusée par le serveur. Utilisez une image JPG, PNG ou WebP de 5 Mo maximum.';
      }
      if (error.status === 401 || error.status === 403) {
        return 'Session non autorisée. Reconnectez-vous puis réessayez.';
      }
      if (error.status >= 500) {
        return "Le serveur n'a pas pu enregistrer la photo. Réessayez dans un instant.";
      }
    }

    return 'Impossible de mettre à jour la photo. Réessayez.';
  }

  private profilePhotoRemovalFailureMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return "Impossible de contacter le serveur. Vérifiez que le backend est démarré.";
      }
      if (error.status === 401 || error.status === 403) {
        return 'Session non autorisée. Reconnectez-vous puis réessayez.';
      }
      if (error.status >= 500) {
        return "Le serveur n'a pas pu supprimer la photo. Réessayez dans un instant.";
      }
    }

    return 'Impossible de supprimer la photo. Réessayez.';
  }
}
