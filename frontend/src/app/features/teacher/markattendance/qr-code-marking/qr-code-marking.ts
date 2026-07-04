import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BarcodeFormat, QRCodeWriter } from '@zxing/library';
import { Subscription, finalize } from 'rxjs';

import {
  AttendanceSessionResponse,
  AttendanceStudentStatus,
  AttendanceStudentView,
} from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import {
  QrAttendanceService,
  QrPayloadResponse,
} from '../../../../core/attendance/services/qr-attendance.service';
import {
  AttendanceWebSocketService,
  AttendanceUpdateNotification,
} from '../../../../core/websocket/websocket.service';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';

interface ScannedStudent {
  id: number;
  name: string;
  studentId: string;
  pfpUrl?: string | null;
  scannedAt: string;
}

type ManualAttendanceStatus = 'present' | 'absent';

interface ManualStudent {
  id: number;
  name: string;
  studentId: string;
  pfpUrl?: string | null;
  status: ManualAttendanceStatus;
}

@Component({
  selector: 'app-qr-code-marking',
  imports: [UserAvatar],
  templateUrl: './qr-code-marking.html',
  styleUrl: './qr-code-marking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeMarking implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attendanceService = inject(AttendanceService);
  private readonly qrAttendanceService = inject(QrAttendanceService);
  private readonly webSocketService = inject(AttendanceWebSocketService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly writer = new QRCodeWriter();
  private readonly qrContainer = viewChild<ElementRef<HTMLDivElement>>('qrContainer');

  readonly session = signal<AttendanceSessionResponse | null>(null);
  readonly countdownSeconds = signal(0);
  readonly maxSeconds = signal(60);
  readonly qrLoading = signal(false);
  readonly qrError = signal<string | null>(null);
  readonly activePayload = signal<QrPayloadResponse | null>(null);
  readonly scannedStudents = signal<ScannedStudent[]>([]);
  readonly manualStudents = signal<ManualStudent[]>([]);
  readonly totalStudents = signal(0);
  readonly error = signal<string | null>(null);
  readonly ending = signal(false);
  readonly currentSessionId = signal<number | null>(null);
  readonly savingStudentId = signal<number | null>(null);
  readonly webSocketEnabled = signal(true);
  readonly webSocketConnected = signal(false);

  readonly presentCount = computed(
    () => this.manualStudents().filter((student) => student.status === 'present').length,
  );
  readonly absentCount = computed(
    () => this.manualStudents().filter((student) => student.status === 'absent').length,
  );

  private refreshTimer?: ReturnType<typeof setInterval>;
  private qrRefreshTimer?: number;
  private qrCountdownTimer?: number;
  private webSocketSubscription?: Subscription;

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.queryParamMap.get('sessionId'));
    const validSessionId = Number.isFinite(sessionId) && sessionId > 0 ? sessionId : null;
    this.currentSessionId.set(validSessionId);
    this.loadSession(validSessionId);

    // Démarrer le polling comme fallback (mais avec intervalle plus long si WebSocket est actif)
    this.startRefreshTimer();

    // Configurer WebSocket si disponible
    this.setupWebSocket(validSessionId);
  }

  ngOnDestroy(): void {
    clearInterval(this.refreshTimer);
    this.clearQrTimers();
    this.webSocketSubscription?.unsubscribe();
    this.webSocketService.disconnect();
  }

  private startRefreshTimer(): void {
    // Intervalle de base : 5 secondes
    // Si WebSocket connecté, on peut réduire la fréquence ou garder un fallback
    const interval = this.webSocketConnected() ? 15000 : 5000;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    this.refreshTimer = setInterval(() => {
      // Si WebSocket est connecté, on peut skip le refresh ou le faire moins souvent
      if (!this.webSocketConnected() || !this.webSocketEnabled()) {
        this.refreshSession();
      } else {
        // Refresh léger uniquement pour la cohérence
        this.refreshSessionLight();
      }
    }, interval);
  }

  private setupWebSocket(sessionId: number | null): void {
    if (!sessionId || !this.isBrowser) return;

    // Essayer de connecter WebSocket
    this.webSocketService
      .connect(sessionId)
      .then(() => {
        this.webSocketConnected.set(true);
        this.startRefreshTimer(); // Réajuster l'intervalle
        this.subscribeToWebSocketEvents();
      })
      .catch((error) => {
        console.warn('⚠️ WebSocket non disponible, fallback sur polling:', error);
        this.webSocketEnabled.set(false);
        this.webSocketConnected.set(false);
        this.error.set('Mode hors ligne: les mises à jour seront moins fréquentes');

        // Afficher un message temporaire
        setTimeout(() => {
          if (this.error() === 'Mode hors ligne: les mises à jour seront moins fréquentes') {
            this.error.set(null);
          }
        }, 5000);
      });

    // Surveiller les changements de connexion WebSocket
    this.webSocketService.connection$.subscribe((connected) => {
      this.webSocketConnected.set(connected);
      this.startRefreshTimer(); // Réajuster l'intervalle
    });
  }

  private subscribeToWebSocketEvents(): void {
    this.webSocketSubscription?.unsubscribe();
    this.webSocketSubscription = this.webSocketService.events$.subscribe((notification) => {
      if (notification.eventType === 'ATTENDANCE_UPDATED') {
        this.handleAttendanceUpdate(notification);
        return;
      }

      this.session.update((current) =>
        current
          ? {
              ...current,
              status: 'FINALIZED',
              presentCount: notification.presentCount,
              absentCount: notification.absentCount,
              unknownCount: notification.unknownCount,
            }
          : current,
      );
    });
  }

  private handleAttendanceUpdate(notification: AttendanceUpdateNotification): void {
    const student =
      this.session()?.students?.find((item) => item.studentId === notification.studentId) ?? null;

    if (
      student &&
      notification.status === 'PRESENT' &&
      (notification.markMethod === 'QR_CODE' || notification.markMethod === 'FACE_ID')
    ) {
      const name = `${student.firstName} ${student.lastName}`.trim();
      const newScannedStudent: ScannedStudent = {
        id: notification.studentId,
        name,
        studentId: student.numApogee,
        pfpUrl: student.pfpUrl,
        scannedAt: new Date(notification.markedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };

      this.scannedStudents.update((students) => [
        newScannedStudent,
        ...students.filter((item) => item.id !== notification.studentId),
      ]);
    }

    this.manualStudents.update((students) =>
      students.map((student) =>
        student.id === notification.studentId
          ? { ...student, status: notification.status === 'PRESENT' ? 'present' : 'absent' }
          : student,
      ),
    );

    this.session.update((current) =>
      current
        ? {
            ...current,
            presentCount: notification.presentCount,
            absentCount: notification.absentCount,
            unknownCount: notification.unknownCount,
            students: current.students?.map((student) =>
              student.studentId === notification.studentId
                ? {
                    ...student,
                    status: notification.status,
                    markMethod: notification.markMethod,
                    markedAt: notification.markedAt,
                  }
                : student,
            ),
          }
        : current,
    );

    this.showScanAnimation(notification.studentId);

    if (notification.markMethod === 'QR_CODE' || notification.markMethod === 'FACE_ID') {
      this.playScanSound();
    }
  }

  private showScanAnimation(studentId: number): void {
    // Ajouter une classe CSS pour animation
    const element = document.getElementById(`student-${studentId}`);
    if (element) {
      element.classList.add('scan-flash');
      setTimeout(() => element.classList.remove('scan-flash'), 500);
    }
  }

  private playScanSound(): void {
    // Optionnel: jouer un son lors du scan
    if ('Audio' in window && this.webSocketConnected()) {
      const audio = new Audio('/assets/scan-beep.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {}); // Ignorer si autoplay bloqué
    }
  }

  get sessionInfo() {
    const session = this.session();
    return {
      module: session?.courseLabel ?? 'Session QR Code',
      group: session?.groupIds?.length ? `Groupes ${session.groupIds.join(', ')}` : 'Groupes',
      time: session?.startedAt
        ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${
            session.endsAt
              ? new Date(session.endsAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'en cours'
          }`
        : '',
      location: session?.roomLabel ?? 'Salle non renseignee',
      date: session?.startedAt ? new Date(session.startedAt).toLocaleDateString() : '',
    };
  }

  get formattedCountdown(): string {
    const s = this.countdownSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  get progressPercent(): number {
    const max = this.maxSeconds();
    return max > 0 ? (this.countdownSeconds() / max) * 100 : 0;
  }

  get progressOffset(): string {
    const circumference = 345.575;
    return `${circumference - (circumference * this.progressPercent) / 100}px`;
  }

  regenerateQr(): void {
    this.refreshQrPayload();
  }

  extendTime(): void {
    this.refreshQrPayload();
  }

  markAllPresent(): void {
    this.manualStudents()
      .filter((student) => student.status !== 'present')
      .forEach((student) => this.setManualStatus(student.id, 'present'));
  }

  setManualStatus(studentId: number, status: ManualAttendanceStatus): void {
    const sessionId = this.readSessionId(this.session()) ?? this.currentSessionId();
    if (!sessionId) return;

    const previousStudents = this.manualStudents();
    const previousSession = this.session();
    this.savingStudentId.set(studentId);
    this.manualStudents.update((students) =>
      students.map((student) => (student.id === studentId ? { ...student, status } : student)),
    );

    this.attendanceService
      .updateAttendance(sessionId, {
        studentId,
        status: status === 'present' ? 'PRESENT' : 'ABSENT',
      })
      .pipe(finalize(() => this.savingStudentId.set(null)))
      .subscribe({
        next: (update) => {
          this.session.update((current) =>
            current
              ? {
                  ...current,
                  presentCount: update.presentCount,
                  absentCount: update.absentCount,
                  unknownCount: update.unknownCount,
                  students: current.students?.map((student) =>
                    student.studentId === studentId
                      ? {
                          ...student,
                          status: update.status,
                          markMethod: update.markMethod,
                          markedAt: update.markedAt,
                        }
                      : student,
                  ),
                }
              : current,
          );

          // Si WebSocket est actif, on laisse le WebSocket gérer les maj
          // Sinon, on refresh manuellement
          if (!this.webSocketConnected()) {
            this.refreshSession();
          }
        },
        error: () => {
          this.manualStudents.set(previousStudents);
          this.session.set(previousSession);
          this.error.set('Impossible de mettre a jour la presence de cet etudiant.');
        },
      });
  }

  endSession(): void {
    const sessionId = this.readSessionId(this.session()) ?? this.currentSessionId();
    if (!sessionId) return;

    this.ending.set(true);
    this.attendanceService.endSession(sessionId).subscribe({
      next: () => {
        this.webSocketService.disconnect();
        this.router.navigate(['/teacher/sessions']);
      },
      error: () => {
        this.ending.set(false);
        this.error.set('Impossible de terminer la session.');
      },
    });
  }

  private loadSession(sessionId: number | null): void {
    const request = sessionId
      ? this.attendanceService.getSession(sessionId)
      : this.attendanceService.getActiveSession();

    request.subscribe({
      next: (session) => this.applySession(session),
      error: () => this.error.set('Impossible de charger la session QR.'),
    });
  }

  private refreshSession(): void {
    const sessionId = this.readSessionId(this.session()) ?? this.currentSessionId();
    if (!sessionId) return;

    this.attendanceService.getSession(sessionId).subscribe({
      next: (session) => {
        // Vérifier si on a besoin de mettre à jour (éviter les doublons)
        const currentPresentCount = this.session()?.presentCount;
        if (!this.webSocketConnected() || currentPresentCount !== session.presentCount) {
          this.applySession(session);
        }
      },
      error: () => undefined,
    });
  }

  private refreshSessionLight(): void {
    // Refresh léger pour la cohérence sans surcharger
    const sessionId = this.readSessionId(this.session()) ?? this.currentSessionId();
    if (!sessionId) return;

    this.attendanceService.getSession(sessionId).subscribe({
      next: (session) => {
        // Ne mettre à jour que les compteurs, pas toute la liste
        if (this.session()?.presentCount !== session.presentCount) {
          this.session.update((current) =>
            current
              ? { ...current, presentCount: session.presentCount, absentCount: session.absentCount }
              : current,
          );
        }
      },
      error: () => undefined,
    });
  }

  private applySession(session: AttendanceSessionResponse): void {
    const previousSessionId = this.currentSessionId();
    const resolvedSessionId = this.readSessionId(session) ?? previousSessionId;
    this.currentSessionId.set(resolvedSessionId);
    this.session.set(session);
    this.totalStudents.set(session.students?.length ?? session.studentCount ?? 0);

    // Éviter de recréer les listes si pas nécessaire (optimisation)
    this.scannedStudents.set(
      (session.students ?? [])
        .filter(
          (student) =>
            student.status === 'PRESENT' &&
            (student.markMethod === 'QR_CODE' || student.markMethod === 'FACE_ID'),
        )
        .map((student) => this.toScannedStudent(student)),
    );

    this.manualStudents.set(
      (session.students ?? []).map((student) => this.toManualStudent(student)),
    );

    if (resolvedSessionId && (!this.activePayload() || resolvedSessionId !== previousSessionId)) {
      this.refreshQrPayload();
    }
  }

  private toScannedStudent(student: AttendanceStudentView): ScannedStudent {
    const name = `${student.firstName} ${student.lastName}`.trim();
    return {
      id: student.studentId,
      name,
      studentId: student.numApogee,
      pfpUrl: student.pfpUrl,
      scannedAt: student.markedAt
        ? new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--',
    };
  }

  private toManualStudent(student: AttendanceStudentView): ManualStudent {
    const name = `${student.firstName} ${student.lastName}`.trim();
    return {
      id: student.studentId,
      name,
      studentId: student.numApogee,
      pfpUrl: student.pfpUrl,
      status: this.fromApiStatus(student.status),
    };
  }

  private fromApiStatus(status: AttendanceStudentStatus): ManualAttendanceStatus {
    return status === 'PRESENT' ? 'present' : 'absent';
  }

  private refreshQrPayload(): void {
    const sessionId = this.readSessionId(this.session()) ?? this.currentSessionId();
    if (!sessionId) {
      this.qrError.set('Session active introuvable pour generer le QR.');
      return;
    }

    this.qrLoading.set(true);
    this.qrError.set(null);

    this.qrAttendanceService.createTeacherPayload(sessionId).subscribe({
      next: (payload) => {
        this.activePayload.set(payload);
        this.renderQrAfterViewUpdate(payload.payload);
        this.scheduleQrRefresh(payload);
        this.qrLoading.set(false);
      },
      error: (error) => {
        this.qrLoading.set(false);
        this.activePayload.set(null);
        this.clearQr();
        this.clearQrTimers();
        this.qrError.set(this.qrAttendanceService.toUserMessage(error));
      },
    });
  }

  private renderQrAfterViewUpdate(payload: string): void {
    if (!this.isBrowser) return;
    window.setTimeout(() => this.renderQr(payload), 0);
  }

  private renderQr(payload: string): void {
    const container = this.qrContainer()?.nativeElement;
    if (!container || !this.isBrowser) return;

    const svg = this.buildQrSvg(payload, 260);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code de pointage');
    container.replaceChildren(svg);
  }

  private buildQrSvg(payload: string, size: number): SVGSVGElement {
    const matrix = this.writer.encode(payload, BarcodeFormat.QR_CODE, size, size, new Map());
    const width = matrix.getWidth();
    const height = matrix.getHeight();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', String(width));
    background.setAttribute('height', String(height));
    background.setAttribute('fill', '#ffffff');
    svg.appendChild(background);

    let pathData = '';
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (matrix.get(x, y)) {
          pathData += `M${x},${y}h1v1h-1z`;
        }
      }
    }

    const modules = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    modules.setAttribute('d', pathData);
    modules.setAttribute('fill', '#111827');
    svg.appendChild(modules);
    return svg;
  }

  private scheduleQrRefresh(payload: QrPayloadResponse): void {
    this.clearQrTimers();
    const expiresAt = new Date(payload.expiresAt).getTime();

    // Planifier le prochain rafraîchissement
    if (!this.isBrowser) return;

    const refreshDelayMs = Math.max(1000, (payload.refreshAfterSeconds - 2) * 1000);
    this.qrRefreshTimer = window.setTimeout(() => this.refreshQrPayload(), refreshDelayMs);
  }

  private updateQrCountdown(expiresAt: number): void {
    this.countdownSeconds.set(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)));
  }

  private clearQr(): void {
    this.qrContainer()?.nativeElement.replaceChildren();
    this.countdownSeconds.set(0);
  }

  private clearQrTimers(): void {
    if (!this.isBrowser) return;
    if (this.qrRefreshTimer !== undefined) {
      window.clearTimeout(this.qrRefreshTimer);
      this.qrRefreshTimer = undefined;
    }
  }

  private readSessionId(session: AttendanceSessionResponse | null): number | null {
    return session?.sessionId ?? session?.id ?? null;
  }
}
