import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AttendanceSessionResponse,
  AttendanceSessionSummary,
  AttendanceStudentStatus,
  AttendanceStudentView,
} from '../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-teacher-sessions-page',
  standalone: true,
  imports: [DatePipe, PageHeader, RouterLink, StatusBadge],
  templateUrl: './sessions-page.html',
  styleUrl: './sessions-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSessionsPage implements OnInit {
  private readonly attendanceService = inject(AttendanceService);

  readonly sessions = signal<AttendanceSessionSummary[]>([]);
  readonly loading = signal(false);
  readonly loadingDetails = signal(false);
  readonly updatingStudentId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly detailError = signal<string | null>(null);
  readonly totalElements = signal(0);
  readonly selectedSession = signal<AttendanceSessionResponse | null>(null);

  readonly finalizedCount = computed(
    () => this.sessions().filter((session) => session.status === 'FINALIZED').length,
  );

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.attendanceService
      .getTeacherSessions({ page: 0, size: 20, sort: 'startedAt,desc' })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => {
          this.sessions.set(page.items);
          this.totalElements.set(page.totalElements);
        },
        error: () => this.error.set('Impossible de charger l historique des sessions.'),
      });
  }

  attendanceRate(session: AttendanceSessionSummary): number {
    const total = session.presentCount + session.absentCount + session.unknownCount;
    return total ? Math.round((session.presentCount / total) * 100) : 0;
  }

  statusVariant(session: AttendanceSessionSummary): 'success' | 'warning' | 'info' {
    if (session.status === 'FINALIZED') return 'success';
    return 'warning';
  }

  resumeSessionRoute(session: AttendanceSessionResponse): string {
    switch (session.method) {
      case 'QR_CODE':
        return '/teacher/mark-attendance/start-session/qr-code-marking';
      case 'FACE_ID':
        return '/teacher/mark-attendance/start-session/facial-recognition';
      default:
        return '/teacher/mark-attendance/manual';
    }
  }

  openDetails(session: AttendanceSessionSummary): void {
    this.loadingDetails.set(true);
    this.detailError.set(null);
    this.attendanceService
      .getSession(session.sessionId)
      .pipe(finalize(() => this.loadingDetails.set(false)))
      .subscribe({
        next: (details) => this.selectedSession.set(details),
        error: () => this.detailError.set('Impossible de charger les details de la session.'),
      });
  }

  closeDetails(): void {
    this.selectedSession.set(null);
    this.detailError.set(null);
  }

  updateStudentStatus(student: AttendanceStudentView, status: 'PRESENT' | 'ABSENT'): void {
    const session = this.selectedSession();
    if (!session || student.status === status) {
      return;
    }

    this.updatingStudentId.set(student.studentId);
    this.detailError.set(null);
    this.attendanceService
      .updateAttendance(session.sessionId, { studentId: student.studentId, status })
      .pipe(finalize(() => this.updatingStudentId.set(null)))
      .subscribe({
        next: (response) => {
          const current = this.selectedSession();
          if (!current) {
            return;
          }

          const students = (current.students ?? []).map((entry) =>
            entry.studentId === response.studentId
              ? {
                  ...entry,
                  status: response.status,
                  markMethod: response.markMethod,
                  markedAt: response.markedAt,
                }
              : entry,
          );

          this.selectedSession.set({
            ...current,
            students,
            presentCount: response.presentCount,
            absentCount: response.absentCount,
            unknownCount: response.unknownCount,
          });

          this.sessions.update((sessions) =>
            sessions.map((entry) =>
              entry.sessionId === response.sessionId
                ? {
                    ...entry,
                    presentCount: response.presentCount,
                    absentCount: response.absentCount,
                    unknownCount: response.unknownCount,
                  }
                : entry,
            ),
          );
        },
        error: () => this.detailError.set('Impossible de modifier le statut de cet etudiant.'),
      });
  }

  studentStatusLabel(status: AttendanceStudentStatus): string {
    switch (status) {
      case 'PRESENT':
        return 'Present';
      case 'ABSENT':
        return 'Absent';
      case 'JUSTIFIED':
        return 'Justifie';
      default:
        return 'Inconnu';
    }
  }

  studentStatusVariant(status: AttendanceStudentStatus): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      case 'JUSTIFIED':
        return 'info';
      default:
        return 'neutral';
    }
  }
}
