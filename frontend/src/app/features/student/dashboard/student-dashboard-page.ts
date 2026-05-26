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
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { EMPTY } from 'rxjs';
import { expand, finalize, map, reduce } from 'rxjs/operators';
import { Router } from '@angular/router';

import {
  AttendanceSessionMethod,
  StudentActiveAttendanceSessionDto,
  StudentSessionDetailViewModel,
  StudentSessionListItem,
  StudentSessionsOverviewViewModel,
  StudentAttendanceSessionSummaryDto,
} from '../../../core/attendance/models/student-attendance.model';
import { StudentAttendanceService } from '../../../core/attendance/services/student-attendance.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { Modal } from '../../../shared/components/modal/modal';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StudentAlertBanner } from '../../../shared/components/student-alert-banner/student-alert-banner';
import { StudentModuleCard } from '../../../shared/components/student-module-card/student-module-card';
import { STUDENT_JUSTIFICATIONS } from '../student-demo.data';
import {
  canOpenJustification,
  enrichSessionDetail,
  enrichSessionListItem,
  isAbsenceJustified,
  shouldShowJustificationCard,
} from '../student-session-enrichment';

type DashboardQuickCard = {
  readonly id: string;
  readonly title: string;
  readonly value: number;
  readonly subtitle: string;
  readonly ctaLabel: string;
  readonly icon: string;
  readonly variant: 'default' | 'warning' | 'success';
  readonly route: string;
};

type AbsenceWarning = {
  readonly moduleLabel: string;
  readonly absenceCount: number;
};

type AttendanceFlowPhase =
  | 'idle'
  | 'qr-scanning'
  | 'qr-detected'
  | 'face-countdown'
  | 'face-captured'
  | 'face-validated';

@Component({
  selector: 'app-student-dashboard-page',
  imports: [
    StudentAlertBanner,
    StudentModuleCard,
    DataTable,
    DataTableCellDef,
    StatusBadge,
    Modal,
    ZXingScannerModule,
  ],
  templateUrl: './student-dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly studentProfileService = inject(StudentProfileService);
  private readonly attendanceService = inject(StudentAttendanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly overview = signal<StudentSessionsOverviewViewModel | null>(null);
  readonly recentSessions = signal<readonly StudentSessionListItem[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly selectedSessionId = signal<number | null>(null);
  readonly activeSessionDetail = signal<StudentSessionDetailViewModel | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly detailCache = signal<Record<number, StudentSessionDetailViewModel>>({});
  readonly sessionRowId = (row: StudentSessionListItem) => String(row.id);
  readonly absenceWarning = signal<AbsenceWarning | null>(null);
  readonly activeAttendanceSession = signal<StudentActiveAttendanceSessionDto | null>(null);
  readonly activeAttendanceError = signal<string | null>(null);
  readonly attendanceCameraOpen = signal(false);
  readonly isStartingCamera = signal(false);
  readonly cameraError = signal<string | null>(null);
  readonly attendanceVideo = viewChild<ElementRef<HTMLVideoElement>>('attendanceVideo');
  readonly attendanceFlowPhase = signal<AttendanceFlowPhase>('idle');
  readonly faceCountdown = signal(5);
  readonly capturedFaceImage = signal<string | null>(null);
  readonly qrScannerEnabled = signal(false);
  readonly qrScannerDevices = signal<readonly MediaDeviceInfo[]>([]);
  readonly selectedQrDevice = signal<MediaDeviceInfo | undefined>(undefined);
  readonly scannedQrContent = signal<string | null>(null);
  readonly qrFormats = [BarcodeFormat.QR_CODE];
  private activeCameraStream: MediaStream | null = null;
  private faceCountdownTimerId: number | null = null;

  readonly currentUserName = computed(() => {
    const user = this.authService.currentUser;
    if (!user) {
      return 'Marie Dupont';
    }

    const nameParts = [user.prenom, user.nom]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }

    if (typeof user.email === 'string' && user.email.trim().length > 0) {
      return user.email.trim();
    }

    return 'Étudiant';
  });

  readonly studentMetaLine = computed(() => {
    const profile = this.studentProfileService.profile();
    const program = this.normalizeLabel(profile?.filiere);
    const group = this.normalizeLabel(profile?.groupe);

    if (program && group) {
      return `Filière: ${program} | Groupe: ${group}`;
    }

    if (program) {
      return `Filière: ${program}`;
    }

    if (group) {
      return `Groupe: ${group}`;
    }

    return null;
  });

  readonly quickCards = computed<readonly DashboardQuickCard[]>(() => {
    const overview = this.overview();
    const pendingJustifications = STUDENT_JUSTIFICATIONS.filter(
      (row) => row.status === 'En attente',
    ).length;

    return [
      {
        id: 'sessions',
        title: 'Nombre de séances',
        value: overview?.totalSessions ?? 0,
        subtitle: 'séances suivies',
        ctaLabel: 'Voir les séances',
        icon: 'fa-regular fa-calendar',
        variant: 'default',
        route: '/student/sessions',
      },
      {
        id: 'absences',
        title: "Nombre d'absences",
        value: overview?.absentCount ?? 0,
        subtitle: 'séances absentes',
        ctaLabel: 'Voir les absences',
        icon: 'fa-solid fa-user-xmark',
        variant: 'warning',
        route: '/student/sessions',
      },
      {
        id: 'pending',
        title: 'Justifications en attente',
        value: pendingJustifications,
        subtitle: 'dossiers en cours',
        ctaLabel: 'Voir les justifications',
        icon: 'fa-regular fa-file-lines',
        variant: 'success',
        route: '/student/justifications',
      },
    ];
  });

  readonly activeAttendanceMethodLabel = computed(() => {
    const session = this.activeAttendanceSession();
    return session ? this.methodLabel(session.sessionMethod) : '';
  });

  readonly activeAttendanceCameraLabel = computed(() => {
    const session = this.activeAttendanceSession();
    if (!session) {
      return '';
    }

    return session.sessionMethod === 'FACE_ID' ? 'Caméra frontale' : 'Caméra arrière';
  });

  readonly activeAttendanceCtaLabel = computed(() => {
    const session = this.activeAttendanceSession();
    if (!session) {
      return 'Marquer ma présence';
    }

    return session.sessionMethod === 'FACE_ID'
      ? 'Démarrer la vérification faciale'
      : 'Scanner le QR code';
  });

  readonly activeAttendanceCtaIcon = computed(() => {
    const session = this.activeAttendanceSession();
    return session?.sessionMethod === 'FACE_ID' ? 'fa-solid fa-user-check' : 'fa-solid fa-qrcode';
  });

  readonly canStartAttendanceFlow = computed(() => {
    const session = this.activeAttendanceSession();
    return session?.attendanceStatus === 'UNKNOWN';
  });

  readonly activeAttendanceStateIcon = computed(() => {
    const session = this.activeAttendanceSession();
    switch (session?.attendanceStatus) {
      case 'PRESENT':
        return 'fa-solid fa-circle-check';
      case 'ABSENT':
        return 'fa-solid fa-circle-exclamation';
      case 'UNKNOWN':
      default:
        return this.activeAttendanceCtaIcon();
    }
  });

  readonly activeAttendanceStateMessage = computed(() => {
    const session = this.activeAttendanceSession();
    switch (session?.attendanceStatus) {
      case 'PRESENT':
        return 'Présence confirmée. Aucune autre action n’est nécessaire.';
      case 'ABSENT':
        return 'Absence enregistrée pour cette séance. Le pointage étudiant est verrouillé.';
      case 'UNKNOWN':
      default:
        return '';
      // return session?.sessionMethod === 'FACE_ID'
      //   ? 'Vérifie ton identité avec la caméra frontale.'
      //   : 'Scanne le QR code projeté par l’enseignant.';
    }
  });

  readonly activeAttendanceStateClasses = computed(() => {
    const session = this.activeAttendanceSession();
    switch (session?.attendanceStatus) {
      case 'PRESENT':
        return 'border-success/25 bg-success-soft text-success';
      case 'ABSENT':
        return 'border-warning/25 bg-warning-soft text-warning';
      case 'UNKNOWN':
      default:
        return 'border-primary-soft bg-primary-soft text-primary';
    }
  });

  readonly cameraModalTitle = computed(() => {
    const session = this.activeAttendanceSession();
    if (!session) {
      return '';
    }

    return session.sessionMethod === 'FACE_ID' ? 'Vérification faciale' : 'Scanner le QR code';
  });

  readonly cameraModalDescription = computed(() => {
    const session = this.activeAttendanceSession();
    if (!session) {
      return '';
    }

    return session.sessionMethod === 'FACE_ID'
      ? 'Utilise la caméra frontale pour préparer la vérification.'
      : 'Utilise la caméra arrière pour viser le QR code projeté.';
  });

  readonly cameraInstruction = computed(() => {
    const session = this.activeAttendanceSession();
    if (!session) {
      return '';
    }

    return session.sessionMethod === 'FACE_ID'
      ? 'Garde ton visage dans le cadre.'
      : 'Place le QR code dans le cadre.';
  });

  readonly cameraHelperText = computed(() => {
    const session = this.activeAttendanceSession();
    if (!session) {
      return '';
    }

    return session.sessionMethod === 'FACE_ID'
      ? 'Reste immobile, face éclairée, regard vers l’écran.'
      : 'Rapproche ou éloigne le téléphone jusqu’à ce que le code soit net.';
  });

  // readonly activeAttendanceStatusLabel = computed(() => {
  //   const session = this.activeAttendanceSession();
  //   if (!session) {
  //     return '';
  //   }

  //   switch (session.attendanceStatus) {
  //     case 'PRESENT':
  //       return 'Présence déjà détectée';
  //     case 'ABSENT':
  //       return 'Absence enregistrée';
  //     case 'UNKNOWN':
  //     default:
  //       return 'En attente de pointage';
  //   }
  // });

  readonly columns: readonly DataTableColumn<StudentSessionListItem>[] = [
    {
      id: 'session',
      header: 'Séance',
      accessor: (row) => `${row.dateLabel} ${row.timeLabel}`,
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.courseLabel,
      width: '16rem',
    },
    {
      id: 'roomLabel',
      header: 'Salle',
      accessor: (row) => row.roomLabel,
      width: '11rem',
    },
    {
      id: 'attendanceStatus',
      header: 'Présence',
      accessor: (row) => row.attendanceLabel,
      align: 'end',
      width: '9rem',
    },
    {
      id: 'justificationStatus',
      header: 'Justification',
      accessor: (row) => row.justificationStatus ?? 'Aucune',
      align: 'end',
      width: '10rem',
    },
  ];

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.loadDashboardData();
    this.loadAbsenceWarning();
    this.loadActiveAttendanceSession();
    this.destroyRef.onDestroy(() => this.releaseAttendanceCapture());
  }

  goTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  openJustifications(): void {
    void this.router.navigateByUrl('/student/justifications');
  }

  openAttendanceCamera(): void {
    const session = this.activeAttendanceSession();
    if (!session || this.attendanceCameraOpen() || session.attendanceStatus !== 'UNKNOWN') {
      return;
    }

    this.resetAttendanceFlow();
    this.cameraError.set(null);
    this.attendanceCameraOpen.set(true);

    if (session.sessionMethod === 'QR_CODE') {
      this.attendanceFlowPhase.set('qr-scanning');
      this.qrScannerEnabled.set(true);
      return;
    }

    window.setTimeout(() => void this.startFaceCamera(), 0);
  }

  closeAttendanceCamera(): void {
    this.releaseAttendanceCapture();
    this.attendanceCameraOpen.set(false);
    this.cameraError.set(null);
    this.isStartingCamera.set(false);
    this.resetAttendanceFlow();
  }

  onQrCamerasFound(devices: MediaDeviceInfo[]): void {
    this.qrScannerDevices.set(devices);
    this.selectedQrDevice.set(this.pickRearCamera(devices));
  }

  onQrCamerasNotFound(): void {
    this.cameraError.set('Aucune caméra disponible pour scanner le QR code.');
  }

  onQrPermissionResponse(hasPermission: boolean): void {
    if (!hasPermission) {
      this.cameraError.set('Accès caméra refusé. Autorise la caméra pour scanner le QR code.');
    }
  }

  onQrScanError(): void {
    if (!this.cameraError()) {
      this.cameraError.set('Impossible de lire le QR code pour le moment.');
    }
  }

  onQrScanSuccess(content: string): void {
    if (this.attendanceFlowPhase() === 'qr-detected') {
      return;
    }

    this.qrScannerEnabled.set(false);
    this.scannedQrContent.set(content);
    this.attendanceFlowPhase.set('qr-detected');
    console.log('QR attendance content:', content);
  }

  restartQrScan(): void {
    this.scannedQrContent.set(null);
    this.cameraError.set(null);
    this.attendanceFlowPhase.set('qr-scanning');
    this.qrScannerEnabled.set(true);
  }

  retakeFaceCapture(): void {
    this.capturedFaceImage.set(null);
    this.cameraError.set(null);
    void this.startFaceCamera();
  }

  validateFaceCapture(): void {
    const session = this.activeAttendanceSession();
    const image = this.capturedFaceImage();
    if (!session || !image) {
      return;
    }

    console.log('FACE_ID attendance payload ready:', {
      sessionId: session.sessionId,
      method: session.sessionMethod,
      capturedAt: new Date().toISOString(),
      imageDataUrlLength: image.length,
    });
    this.attendanceFlowPhase.set('face-validated');
  }

  openSessionDetails(session: StudentSessionListItem): void {
    this.selectedSessionId.set(session.id);
    this.detailError.set(null);

    const cachedDetail = this.detailCache()[session.id];
    if (cachedDetail) {
      this.activeSessionDetail.set(cachedDetail);
      return;
    }

    this.activeSessionDetail.set(null);
    this.detailLoading.set(true);
    this.attendanceService
      .getStudentSession(session.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.detailLoading.set(false)),
      )
      .subscribe({
        next: (detailDto) => {
          const detail = enrichSessionDetail(
            this.attendanceService.toSessionDetailViewModel(detailDto),
          );
          this.detailCache.update((current) => ({ ...current, [detail.sessionId]: detail }));
          this.activeSessionDetail.set(detail);
        },
        error: () => {
          this.detailError.set('Impossible de charger la séance.');
        },
      });
  }

  private normalizeLabel(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private loadAbsenceWarning(): void {
    const initialQuery = {
      status: 'ABSENT' as const,
      page: 0,
      size: 50,
      sort: 'startedAt,desc',
    };

    this.attendanceService
      .getStudentSessions(initialQuery)
      .pipe(
        expand((response) => {
          const nextPage = response.page + 1;
          if (nextPage >= response.totalPages) {
            return EMPTY;
          }

          return this.attendanceService.getStudentSessions({
            ...initialQuery,
            page: nextPage,
            size: response.size,
          });
        }),
        map((response) => response.items),
        reduce((all, items) => [...all, ...items], [] as StudentAttendanceSessionSummaryDto[]),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (absentSessions) => {
          this.absenceWarning.set(this.buildAbsenceWarning(absentSessions));
        },
        error: () => {
          this.absenceWarning.set(null);
        },
      });
  }

  private loadActiveAttendanceSession(): void {
    this.activeAttendanceError.set(null);
    this.attendanceService
      .getActiveStudentSession()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          if (session?.sessionMethod === 'MANUAL') {
            this.activeAttendanceSession.set(null);
            return;
          }

          this.activeAttendanceSession.set(session);
        },
        error: () => {
          this.activeAttendanceError.set('Impossible de vérifier la séance active.');
          this.activeAttendanceSession.set(null);
        },
      });
  }

  private buildAbsenceWarning(
    sessions: readonly StudentAttendanceSessionSummaryDto[],
  ): AbsenceWarning | null {
    const eligibleSessions = sessions.filter((session) => !isAbsenceJustified(session.sessionId));

    if (eligibleSessions.length === 0) {
      return null;
    }

    const counts = new Map<string, number>();
    for (const session of eligibleSessions) {
      const label = this.normalizeLabel(session.courseLabel);
      if (!label) {
        continue;
      }

      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    for (const session of eligibleSessions) {
      const label = this.normalizeLabel(session.courseLabel);
      if (!label) {
        continue;
      }

      const count = counts.get(label) ?? 0;
      if (count >= 2) {
        return { moduleLabel: label, absenceCount: count };
      }
    }

    return null;
  }

  closeSessionDetails(): void {
    this.selectedSessionId.set(null);
    this.activeSessionDetail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  shouldShowJustificationCard(session: StudentSessionDetailViewModel): boolean {
    return shouldShowJustificationCard(session);
  }

  canOpenJustification(session: StudentSessionDetailViewModel): boolean {
    return canOpenJustification(session);
  }

  openJustificationFromCard(session: StudentSessionDetailViewModel): void {
    if (!session.justificationRoute || !this.canOpenJustification(session)) {
      return;
    }

    this.closeSessionDetails();
    void this.router.navigateByUrl(session.justificationRoute);
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.attendanceService
      .getStudentOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overviewDto) => {
          this.overview.set(this.attendanceService.toOverviewViewModel(overviewDto));
        },
      });

    this.attendanceService
      .getStudentSessions({ page: 0, size: 4, sort: 'startedAt,desc' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.recentSessions.set(
            response.items
              .map((item) => this.attendanceService.toSessionListItem(item))
              .map((row) => enrichSessionListItem(row)),
          );
        },
        error: () => {
          this.errorMessage.set('Impossible de charger les dernières séances.');
        },
      });
  }

  private async startFaceCamera(): Promise<void> {
    const session = this.activeAttendanceSession();
    if (!session || !this.isBrowser) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('La caméra n’est pas disponible dans ce navigateur.');
      return;
    }

    this.stopCamera();
    this.clearFaceCountdown();
    this.isStartingCamera.set(true);
    this.cameraError.set(null);
    this.faceCountdown.set(3);
    this.attendanceFlowPhase.set('face-countdown');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: this.cameraFacingMode(session.sessionMethod),
        audio: false,
      });
      this.activeCameraStream = stream;
      const video = this.attendanceVideo()?.nativeElement;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      this.startFaceCountdown();
    } catch {
      this.cameraError.set('Accès caméra refusé ou caméra indisponible.');
      this.attendanceFlowPhase.set('idle');
    } finally {
      this.isStartingCamera.set(false);
    }
  }

  private startFaceCountdown(): void {
    this.clearFaceCountdown();
    this.faceCountdown.set(5);
    this.faceCountdownTimerId = window.setInterval(() => {
      const nextValue = this.faceCountdown() - 1;
      if (nextValue <= 0) {
        this.clearFaceCountdown();
        this.captureFaceImage();
        return;
      }

      this.faceCountdown.set(nextValue);
    }, 1000);
  }

  private captureFaceImage(): void {
    const video = this.attendanceVideo()?.nativeElement;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      this.cameraError.set('Impossible de capturer l’image. Réessaie avec une caméra active.');
      this.stopCamera();
      this.attendanceFlowPhase.set('idle');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraError.set('Capture indisponible dans ce navigateur.');
      this.stopCamera();
      this.attendanceFlowPhase.set('idle');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    this.capturedFaceImage.set(canvas.toDataURL('image/jpeg', 0.88));
    this.stopCamera();
    this.attendanceFlowPhase.set('face-captured');
  }

  private releaseAttendanceCapture(): void {
    this.qrScannerEnabled.set(false);
    this.clearFaceCountdown();
    this.stopCamera();
  }

  private stopCamera(): void {
    if (!this.activeCameraStream) {
      return;
    }

    for (const track of this.activeCameraStream.getTracks()) {
      track.stop();
    }
    this.activeCameraStream = null;

    const video = this.attendanceVideo()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private clearFaceCountdown(): void {
    if (this.faceCountdownTimerId === null) {
      return;
    }

    window.clearInterval(this.faceCountdownTimerId);
    this.faceCountdownTimerId = null;
  }

  private resetAttendanceFlow(): void {
    this.attendanceFlowPhase.set('idle');
    this.scannedQrContent.set(null);
    this.capturedFaceImage.set(null);
    this.qrScannerEnabled.set(false);
    this.clearFaceCountdown();
    this.faceCountdown.set(5);
  }

  private pickRearCamera(devices: readonly MediaDeviceInfo[]): MediaDeviceInfo | undefined {
    return (
      devices.find((device) => /back|rear|environment|arrière/i.test(device.label)) ??
      devices[devices.length - 1]
    );
  }

  private cameraFacingMode(method: AttendanceSessionMethod): MediaTrackConstraints {
    if (method === 'FACE_ID') {
      return { facingMode: 'user' };
    }

    return { facingMode: { ideal: 'environment' } };
  }

  private methodLabel(method: AttendanceSessionMethod): string {
    switch (method) {
      case 'QR_CODE':
        return 'QR code';
      case 'FACE_ID':
        return 'Reconnaissance faciale';
      case 'MANUAL':
        return 'Manuel';
      default:
        return method;
    }
  }
}
