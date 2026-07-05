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
import { EMPTY, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/services/auth.service';
import { FaceEnrollmentService } from '../../../core/student/services/face-enrollment.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { DeleteModal } from '../../../shared/components/delete-modal/delete-modal';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SettingsSectionCard } from '../../../shared/components/settings/settings-section-card';

type ProfileInfoItem = {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly tone: 'primary' | 'success' | 'warning' | 'info';
};

type FaceEnrollmentPhase = 'idle' | 'captured' | 'saving' | 'saved';

@Component({
  selector: 'app-student-settings-page',
  imports: [PageHeader, Modal, SettingsSectionCard, DeleteModal],
  templateUrl: './student-settings-page.html',
  styleUrls: ['../../../shared/components/settings/settings-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSettingsPage {
  private readonly authService = inject(AuthService);
  private readonly studentProfileService = inject(StudentProfileService);
  private readonly faceEnrollmentService = inject(FaceEnrollmentService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private activeCameraStream: MediaStream | null = null;

  readonly emailNotifications = signal(true);
  readonly sessionReminders = signal(true);
  readonly profileImageFailed = signal(false);
  readonly profile = this.studentProfileService.profile;
  readonly isLoading = this.studentProfileService.isLoading;
  readonly profilePhotoInput = viewChild<ElementRef<HTMLInputElement>>('profilePhotoInput');
  readonly faceVideo = viewChild<ElementRef<HTMLVideoElement>>('faceVideo');
  readonly faceEnrollmentOpen = signal(false);
  readonly faceEnrollmentPhase = signal<FaceEnrollmentPhase>('idle');
  readonly isStartingCamera = signal(false);
  readonly cameraError = signal<string | null>(null);
  readonly profilePhotoUploading = signal(false);
  readonly profilePhotoRemoving = signal(false);
  readonly profilePhotoRemoveOpen = signal(false);
  readonly profilePhotoError = signal<string | null>(null);
  readonly profilePhotoMessage = signal<string | null>(null);
  readonly selectedProfilePhotoPreview = signal<string | null>(null);

  readonly capturedFaceImage = signal<string | null>(null);
  readonly enrollmentMessage = signal<string | null>(null);
  readonly latestFaceEnrollmentAt = signal<string | null>(null);
  readonly isFaceEnrolled = computed(() =>
    Boolean(this.latestFaceEnrollmentAt() || this.profile()?.faceEnrolled),
  );
  readonly faceEnrollmentDate = computed(() => {
    const value = this.latestFaceEnrollmentAt() ?? this.profile()?.faceEnrolledAt;
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  });

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

    return this.email();
  });

  readonly email = computed(() => {
    return (
      this.normalize(this.profile()?.email) ??
      this.normalize(this.authService.currentUser?.email) ??
      '-'
    );
  });

  readonly initials = computed(() => {
    const parts = this.fullName()
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0 || this.fullName() === '-') {
      return 'ET';
    }

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });

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

  readonly primaryInfo = computed<readonly ProfileInfoItem[]>(() => [
    {
      label: 'Annee universitaire',
      value: this.normalize(this.profile()?.academicYear) ?? 'Non renseignée',
      icon: 'fa-regular fa-calendar',
      tone: 'primary',
    },
    {
      label: 'Cycle',
      value: this.normalize(this.profile()?.cycle) ?? 'Non renseigné',
      icon: 'fa-solid fa-layer-group',
      tone: 'info',
    },
    {
      label: 'Filiere',
      value: this.normalize(this.profile()?.filiere) ?? 'Non renseignée',
      icon: 'fa-solid fa-graduation-cap',
      tone: 'success',
    },
    {
      label: 'Groupe',
      value: this.normalize(this.profile()?.groupe) ?? 'Non renseigné',
      icon: 'fa-solid fa-users',
      tone: 'warning',
    },
  ]);

  readonly identityRows = computed<readonly ProfileInfoItem[]>(() => [
    {
      label: 'Prenom',
      value:
        this.normalize(this.profile()?.firstName) ??
        this.normalize(this.authService.currentUser?.firstName) ??
        '-',
      icon: 'fa-regular fa-user',
      tone: 'primary',
    },
    {
      label: 'Nom',
      value:
        this.normalize(this.profile()?.lastName) ??
        this.normalize(this.authService.currentUser?.lastName) ??
        '-',
      icon: 'fa-regular fa-address-card',
      tone: 'primary',
    },
    {
      label: 'Role',
      value: 'Etudiant(e)',
      icon: 'fa-solid fa-user-graduate',
      tone: 'success',
    },
  ]);

  constructor() {
    this.studentProfileService.ensureLoaded();
    this.destroyRef.onDestroy(() => {
      this.releaseCamera();
      this.revokeProfilePhotoPreview();
    });
  }

  toggleEmailNotifications(): void {
    this.emailNotifications.update((value) => !value);
  }

  toggleSessionReminders(): void {
    this.sessionReminders.update((value) => !value);
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

    this.studentProfileService
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

    this.studentProfileService
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

  openFaceEnrollment(): void {
    this.faceEnrollmentOpen.set(true);
    this.resetFaceEnrollment();
    window.setTimeout(() => void this.startFaceCamera(), 0);
  }

  closeFaceEnrollment(): void {
    this.releaseCamera();
    this.faceEnrollmentOpen.set(false);
    this.resetFaceEnrollment();
  }

  retakeFaceCapture(): void {
    this.capturedFaceImage.set(null);
    this.enrollmentMessage.set(null);
    this.cameraError.set(null);
    void this.startFaceCamera();
  }

  saveFaceEmbedding(): void {
    const image = this.capturedFaceImage();
    if (!image || this.faceEnrollmentPhase() === 'saving') {
      return;
    }

    let imageBlob: Blob;
    try {
      imageBlob = this.dataUrlToBlob(image);
    } catch {
      this.cameraError.set('Capture invalide. Reprends la photo puis essaie encore.');
      return;
    }

    this.cameraError.set(null);
    this.enrollmentMessage.set(null);
    this.faceEnrollmentPhase.set('saving');

    this.faceEnrollmentService
      .enroll(imageBlob)
      .pipe(
        switchMap((response) => {
          if (!response.authenticationRefreshRequired) {
            return of(response);
          }

          return this.authService.refreshSession().pipe(
            map(() => response),
            catchError(() => {
              this.authService.logout();
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.faceEnrollmentPhase() === 'saving') {
            this.faceEnrollmentPhase.set('captured');
          }
        }),
      )
      .subscribe({
        next: (response) => {
          this.enrollmentMessage.set('Empreinte faciale mise à jour avec succès.');
          this.latestFaceEnrollmentAt.set(response.faceEnrolledAt);
          this.studentProfileService.ensureLoaded(true);
          this.faceEnrollmentPhase.set('saved');
        },
        error: (error) => {
          this.cameraError.set(this.faceEnrollmentService.toUserMessage(error));
          this.faceEnrollmentPhase.set('captured');
        },
      });
  }

  toneClasses(tone: ProfileInfoItem['tone']): string {
    switch (tone) {
      case 'success':
        return 'bg-secondary-soft text-secondary-strong';
      case 'warning':
        return 'bg-warning-soft text-warning-strong';
      case 'info':
        return 'bg-info-soft text-info';
      default:
        return 'bg-primary-soft text-primary';
    }
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

  private async startFaceCamera(): Promise<void> {
    if (!this.isBrowser || !this.faceEnrollmentOpen()) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set("La caméra n'est pas disponible dans ce navigateur.");
      return;
    }

    this.releaseCamera();
    this.isStartingCamera.set(true);
    this.faceEnrollmentPhase.set('idle');
    this.cameraError.set(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      this.activeCameraStream = stream;

      const timeoutMs = 1000;
      const startedAt = Date.now();

      let video = this.faceVideo()?.nativeElement;
      while (!video && Date.now() - startedAt < timeoutMs) {
        await new Promise((r) => window.setTimeout(r, 50));
        video = this.faceVideo()?.nativeElement;
      }

      if (!video) {
        throw new Error('VIDEO_NOT_READY');
      }

      video.srcObject = stream;
      await video.play();
    } catch (error) {
      this.cameraError.set(
        error instanceof Error && error.message === 'VIDEO_NOT_READY'
          ? 'Impossible d’afficher la caméra (fenêtre pas encore prête). Reprends la capture.'
          : 'Accès caméra refusé ou caméra indisponible.',
      );
      this.faceEnrollmentPhase.set('idle');
    } finally {
      this.isStartingCamera.set(false);
    }
  }

  captureFaceImage(): void {
    const video = this.faceVideo()?.nativeElement;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      this.cameraError.set("Impossible de capturer l'image. Réessaie avec une caméra active.");
      this.releaseCamera();
      this.faceEnrollmentPhase.set('idle');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraError.set('Capture indisponible dans ce navigateur.');
      this.releaseCamera();
      this.faceEnrollmentPhase.set('idle');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedFaceImage.set(canvas.toDataURL('image/jpeg', 0.88));
    this.releaseCamera();
    this.faceEnrollmentPhase.set('captured');
  }

  private releaseCamera(): void {
    if (!this.activeCameraStream) {
      return;
    }

    for (const track of this.activeCameraStream.getTracks()) {
      track.stop();
    }
    this.activeCameraStream = null;

    const video = this.faceVideo()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private resetFaceEnrollment(): void {
    this.cameraError.set(null);
    this.capturedFaceImage.set(null);
    this.enrollmentMessage.set(null);
    this.faceEnrollmentPhase.set('idle');
    this.isStartingCamera.set(false);
  }

  private dataUrlToBlob(dataUrl: string): Blob {
    const [metadata, base64Data] = dataUrl.split(',');
    const mimeMatch = /^data:(.+);base64$/.exec(metadata);
    if (!mimeMatch || !base64Data) {
      throw new Error('Invalid data URL');
    }

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return new Blob([bytes], { type: mimeMatch[1] });
  }
}
