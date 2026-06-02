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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BarcodeFormat, QRCodeWriter } from '@zxing/library';

import {
  QrAttendanceService,
  QrPayloadResponse,
  TeacherAttendanceSessionDetailsDto,
} from '../../../core/attendance/services/qr-attendance.service';

@Component({
  selector: 'app-qr-display-page',
  imports: [ReactiveFormsModule],
  templateUrl: './qr-display-page.html',
  styleUrl: './qr-display-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrDisplayPage {
  private readonly qrAttendanceService = inject(QrAttendanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly writer = new QRCodeWriter();
  private readonly qrContainer = viewChild<ElementRef<HTMLDivElement>>('qrContainer');
  private refreshTimerId: number | null = null;
  private countdownTimerId: number | null = null;

  readonly tokenControl = new FormControl('', { nonNullable: true });
  readonly activeSession = signal<TeacherAttendanceSessionDetailsDto | null>(null);
  readonly activePayload = signal<QrPayloadResponse | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly secondsRemaining = signal(0);

  readonly sessionTitle = computed(() => {
    const session = this.activeSession();
    if (!session) {
      return 'Aucune séance chargée';
    }
    return session.courseLabel;
  });

  readonly sessionMeta = computed(() => {
    const session = this.activeSession();
    if (!session) {
      return 'Colle un JWT enseignant pour afficher le QR code de la séance active.';
    }
    const teacher = session.teacherFullName || 'Enseignant non renseigné';
    return `${session.roomLabel} | ${teacher}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  loadActiveSession(): void {
    const token = this.tokenControl.value.trim();
    if (!token) {
      this.errorMessage.set('Le JWT enseignant est requis.');
      return;
    }

    this.clearTimers();
    this.clearQr();
    this.errorMessage.set(null);
    this.activePayload.set(null);
    this.activeSession.set(null);
    this.isLoading.set(true);

    this.qrAttendanceService
      .getTeacherActiveSessionWithToken(token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session) => {
          this.activeSession.set(session);
          this.refreshPayload();
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(this.qrAttendanceService.toUserMessage(error));
        },
      });
  }

  refreshPayload(): void {
    const token = this.tokenControl.value.trim();
    const session = this.activeSession();
    if (!token || !session) {
      return;
    }

    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.qrAttendanceService
      .createTeacherPayloadWithToken(session.sessionId, token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          this.activePayload.set(payload);
          this.renderQrAfterViewUpdate(payload.payload);
          this.scheduleRefresh(payload);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.clearTimers();
          this.errorMessage.set(this.qrAttendanceService.toUserMessage(error));
        },
      });
  }

  private renderQr(payload: string): void {
    if (!this.isBrowser) {
      return;
    }

    const container = this.qrContainer()?.nativeElement;
    if (!container) {
      return;
    }

    const svg = this.buildQrSvg(payload, 420);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR code de pointage');
    container.replaceChildren(svg);
  }

  private renderQrAfterViewUpdate(payload: string): void {
    if (!this.isBrowser) {
      return;
    }

    window.setTimeout(() => this.renderQr(payload), 0);
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

  private scheduleRefresh(payload: QrPayloadResponse): void {
    this.clearTimers();
    const expiresAt = new Date(payload.expiresAt).getTime();
    this.updateSecondsRemaining(expiresAt);

    if (!this.isBrowser) {
      return;
    }

    this.countdownTimerId = window.setInterval(() => this.updateSecondsRemaining(expiresAt), 1000);
    const refreshDelayMs = Math.max(1000, (payload.refreshAfterSeconds - 2) * 1000);
    this.refreshTimerId = window.setTimeout(() => this.refreshPayload(), refreshDelayMs);
  }

  private updateSecondsRemaining(expiresAt: number): void {
    const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    this.secondsRemaining.set(remaining);
  }

  private clearQr(): void {
    this.qrContainer()?.nativeElement.replaceChildren();
    this.secondsRemaining.set(0);
  }

  private clearTimers(): void {
    if (!this.isBrowser) {
      return;
    }
    if (this.refreshTimerId !== null) {
      window.clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    if (this.countdownTimerId !== null) {
      window.clearInterval(this.countdownTimerId);
      this.countdownTimerId = null;
    }
  }
}
