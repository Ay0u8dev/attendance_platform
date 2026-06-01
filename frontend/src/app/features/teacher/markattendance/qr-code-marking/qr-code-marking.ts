import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AttendanceSessionResponse,
  AttendanceStudentView,
} from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';

interface ScannedStudent {
  id: number;
  name: string;
  studentId: string;
  initials: string;
  scannedAt: string;
}

@Component({
  selector: 'app-qr-code-marking',
  templateUrl: './qr-code-marking.html',
  styleUrl: './qr-code-marking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeMarking implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attendanceService = inject(AttendanceService);

  readonly session = signal<AttendanceSessionResponse | null>(null);
  readonly countdownSeconds = signal(600);
  readonly maxSeconds = 600;
  readonly scannedStudents = signal<ScannedStudent[]>([]);
  readonly totalStudents = signal(0);
  readonly error = signal<string | null>(null);
  readonly ending = signal(false);

  private timer?: ReturnType<typeof setInterval>;
  private refreshTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.queryParamMap.get('sessionId'));
    this.loadSession(Number.isFinite(sessionId) && sessionId > 0 ? sessionId : null);

    this.timer = setInterval(() => {
      this.countdownSeconds.update((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    this.refreshTimer = setInterval(() => this.refreshSession(), 5000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearInterval(this.refreshTimer);
  }

  get sessionInfo() {
    const session = this.session();
    return {
      module: session?.courseLabel ?? 'Session QR Code',
      group: session?.groupIds?.length ? `Groupes ${session.groupIds.join(', ')}` : 'Groupes',
      time: session?.startedAt
        ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${
            session.endsAt
              ? new Date(session.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'en cours'
          }`
        : '',
      location: session?.roomLabel ?? 'Salle non renseignee',
      date: session?.startedAt
        ? new Date(session.startedAt).toLocaleDateString()
        : '',
    };
  }

  get formattedCountdown(): string {
    const s = this.countdownSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  get progressPercent(): number {
    return (this.countdownSeconds() / this.maxSeconds) * 100;
  }

  regenerateQr(): void {
    this.countdownSeconds.set(600);
    this.refreshSession();
  }

  extendTime(): void {
    this.countdownSeconds.update((s) => Math.min(s + 300, this.maxSeconds));
  }

  endSession(): void {
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;

    this.ending.set(true);
    this.attendanceService.endSession(sessionId).subscribe({
      next: () => this.router.navigate(['/teacher/sessions']),
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
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;
    this.attendanceService.getSession(sessionId).subscribe({
      next: (session) => this.applySession(session),
      error: () => undefined,
    });
  }

  private applySession(session: AttendanceSessionResponse): void {
    this.session.set(session);
    this.totalStudents.set(session.students?.length ?? session.studentCount ?? 0);
    this.scannedStudents.set(
      (session.students ?? [])
        .filter((student) => student.status === 'PRESENT')
        .map((student) => this.toScannedStudent(student)),
    );
  }

  private toScannedStudent(student: AttendanceStudentView): ScannedStudent {
    const name = `${student.firstName} ${student.lastName}`.trim();
    return {
      id: student.studentId,
      name,
      studentId: student.numApogee,
      initials: name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase(),
      scannedAt: student.markedAt
        ? new Date(student.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '--:--',
    };
  }
}
