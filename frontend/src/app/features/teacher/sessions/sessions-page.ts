import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceSessionSummary } from '../../../core/attendance/models/attendance.model';
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
  readonly error = signal<string | null>(null);
  readonly totalElements = signal(0);

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
}
