import { isPlatformBrowser, NgOptimizedImage } from '@angular/common';
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
import { catchError, finalize, switchMap } from 'rxjs/operators';

import { AuthService } from '../../../core/auth/services/auth.service';
import { FaceEnrollmentService } from '../../../core/student/services/face-enrollment.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

type EnrollmentPhase =
  | 'idle'
  | 'camera-starting'
  | 'preview'
  | 'captured'
  | 'submitting'
  | 'success';

@Component({
  selector: 'app-face-enrollment-page',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './face-enrollment-page.html',
})
export class FaceEnrollmentPage {
  private readonly authService = inject(AuthService);
  private readonly enrollmentService = inject(FaceEnrollmentService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private activeCameraStream: MediaStream | null = null;

  readonly faceVideo = viewChild<ElementRef<HTMLVideoElement>>('faceVideo');
  readonly phase = signal<EnrollmentPhase>('idle');
  readonly capturedImage = signal<string | null>(null);
  readonly cameraError = signal<string | null>(null);
  readonly enrollmentError = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly isBusy = computed(
    () => this.phase() === 'camera-starting' || this.phase() === 'submitting',
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopCamera());
  }

  async startCamera(): Promise<void> {
    if (!this.isBrowser || this.isBusy()) {
      return;
    }

    this.resetMessages();

    if (!this.isCameraContextAllowed()) {
      this.cameraError.set(
        'La caméra nécessite une connexion sécurisée. Utilisez HTTPS ou ouvrez l’application sur localhost.',
      );
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('La caméra n’est pas disponible dans ce navigateur.');
      return;
    }

    this.stopCamera();
    this.capturedImage.set(null);
    this.phase.set('camera-starting');

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
      const video = this.faceVideo()?.nativeElement;
      if (!video) {
        this.stopCamera();
        this.cameraError.set('Impossible d’initialiser l’aperçu de la caméra.');
        this.phase.set('idle');
        return;
      }

      video.srcObject = stream;
      await video.play();
      this.phase.set('preview');
    } catch (error) {
      this.stopCamera();
      this.cameraError.set(this.cameraFailureMessage(error));
      this.phase.set('idle');
    }
  }

  captureImage(): void {
    if (!this.isBrowser || this.phase() !== 'preview') {
      return;
    }

    const video = this.faceVideo()?.nativeElement;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      this.cameraError.set('La caméra n’est pas encore prête. Patientez puis réessayez.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraError.set('La capture d’image n’est pas disponible dans ce navigateur.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedImage.set(canvas.toDataURL('image/jpeg', 0.88));
    this.stopCamera();
    this.cameraError.set(null);
    this.phase.set('captured');
  }

  retakeImage(): void {
    if (this.phase() === 'submitting') {
      return;
    }
    this.capturedImage.set(null);
    this.resetMessages();
    this.phase.set('idle');
    void this.startCamera();
  }

  submitEnrollment(): void {
    const image = this.capturedImage();
    if (!image || this.phase() === 'submitting') {
      return;
    }

    let imageBlob: Blob;
    try {
      imageBlob = this.dataUrlToBlob(image);
    } catch {
      this.enrollmentError.set('La capture est invalide. Reprenez la photo.');
      return;
    }

    this.enrollmentError.set(null);
    this.successMessage.set(null);
    this.phase.set('submitting');
    this.enrollmentService
      .enroll(imageBlob)
      .pipe(
        switchMap((response) => {
          if (!response.authenticationRefreshRequired) {
            return of(null);
          }

          return this.authService.refreshSession().pipe(
            catchError(() => {
              // Enrollment succeeded, but a stale JWT must never unlock the dashboard.
              this.authService.logout();
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.phase() === 'submitting') {
            this.phase.set('captured');
          }
        }),
      )
      .subscribe({
        next: (user) => {
          const message = 'Votre visage a été enregistré avec succès.';
          this.successMessage.set(message);
          this.phase.set('success');
          this.toastService.success('Enrôlement terminé', message);
          if (user) {
            this.authService.redirectToRoleHome(user, true);
          }
        },
        error: (error) => {
          this.enrollmentError.set(this.enrollmentService.toUserMessage(error));
          this.phase.set('captured');
        },
      });
  }

  logout(): void {
    this.stopCamera();
    this.authService.logout();
  }

  private stopCamera(): void {
    if (this.activeCameraStream) {
      for (const track of this.activeCameraStream.getTracks()) {
        track.stop();
      }
      this.activeCameraStream = null;
    }

    const video = this.faceVideo()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private resetMessages(): void {
    this.cameraError.set(null);
    this.enrollmentError.set(null);
    this.successMessage.set(null);
  }

  private isCameraContextAllowed(): boolean {
    const hostname = window.location.hostname;
    return (
      window.isSecureContext ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    );
  }

  private cameraFailureMessage(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'L’accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur.';
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return 'Aucune caméra compatible n’a été détectée.';
    }
    if (name === 'NotReadableError' || name === 'AbortError') {
      return 'La caméra est indisponible ou déjà utilisée par une autre application.';
    }
    return 'Impossible d’ouvrir la caméra. Vérifiez les autorisations puis réessayez.';
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
