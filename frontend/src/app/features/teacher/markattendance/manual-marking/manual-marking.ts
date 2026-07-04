import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import {
  AttendanceSessionResponse,
  AttendanceStudentStatus,
  AttendanceStudentView,
} from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import { UserAvatar } from '../../../../shared/components/user-avatar/user-avatar';

export type AttendanceStatus = 'present' | 'absent';

export interface Student {
  id: number;
  name: string;
  apogee: string;
  pfpUrl?: string | null;
  status: AttendanceStatus;
  hasNote: boolean;
}

@Component({
  selector: 'app-manual-marking',
  imports: [DatePipe, FormsModule, UserAvatar],
  templateUrl: './manual-marking.html',
  styleUrl: './manual-marking.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualMarking implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attendanceService = inject(AttendanceService);

  readonly session = signal<AttendanceSessionResponse | null>(null);
  readonly searchQuery = signal('');
  readonly allStudents = signal<Student[]>([]);
  readonly loading = signal(false);
  readonly savingStudentId = signal<number | null>(null);
  readonly ending = signal(false);
  readonly error = signal<string | null>(null);

  readonly sessionInfo = computed(() => {
    const session = this.session();
    return {
      module: session?.courseLabel ?? 'Session d appel',
      group: session?.groupIds?.length ? `Groupes ${session.groupIds.join(', ')}` : 'Groupes',
      time: session?.startedAt
        ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${
            session.endsAt
              ? new Date(session.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'en cours'
          }`
        : '',
      location: session?.roomLabel ?? 'Salle non renseignee',
      date: session?.startedAt ?? null,
    };
  });

  readonly filteredStudents = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.allStudents();
    return this.allStudents().filter(
      (s) => s.name.toLowerCase().includes(q) || s.apogee.toLowerCase().includes(q),
    );
  });

  readonly presentCount = computed(
    () => this.allStudents().filter((s) => s.status === 'present').length,
  );
  readonly absentCount = computed(
    () => this.allStudents().filter((s) => s.status === 'absent').length,
  );
  readonly unmarkedCount = computed(() => 0);

  readonly currentPage = signal(1);
  readonly pageSize = 10;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredStudents().length / this.pageSize)));
  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  readonly pagedStudents = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredStudents().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.queryParamMap.get('sessionId'));
    this.loadSession(Number.isFinite(sessionId) && sessionId > 0 ? sessionId : null);
  }

  loadSession(sessionId: number | null): void {
    this.loading.set(true);
    this.error.set(null);

    const request = sessionId
      ? this.attendanceService.getSession(sessionId)
      : this.attendanceService.getActiveSession();

    request.pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (session) => this.applySession(session),
      error: () => this.error.set('Impossible de charger la session active.'),
    });
  }

  markAll(): void {
    this.allStudents()
      .filter((student) => student.status !== 'present')
      .forEach((student) => this.setStatus(student.id, 'present'));
  }

  setStatus(studentId: number, status: AttendanceStatus): void {
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;

    const previous = this.allStudents();
    this.savingStudentId.set(studentId);
    this.allStudents.update((students) =>
      students.map((student) => (student.id === studentId ? { ...student, status } : student)),
    );

    this.attendanceService
      .updateAttendance(sessionId, { studentId, status: this.toApiStatus(status) })
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
                }
              : current,
          );
        },
        error: () => {
          this.allStudents.set(previous);
          this.error.set('Impossible de mettre a jour la presence de cet etudiant.');
        },
      });
  }

  endSession(): void {
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;

    this.ending.set(true);
    this.error.set(null);
    this.attendanceService
      .endSession(sessionId)
      .pipe(finalize(() => this.ending.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/teacher/sessions']),
        error: () => this.error.set('Impossible de terminer la session.'),
      });
  }

  private applySession(session: AttendanceSessionResponse): void {
    this.session.set(session);
    this.allStudents.set((session.students ?? []).map((student) => this.toStudent(student)));
  }

  private toStudent(student: AttendanceStudentView): Student {
    const name = `${student.firstName} ${student.lastName}`.trim();
    return {
      id: student.studentId,
      name,
      apogee: student.numApogee,
      pfpUrl: student.pfpUrl,
      status: this.fromApiStatus(student.status),
      hasNote: false,
    };
  }

  private fromApiStatus(status: AttendanceStudentStatus): AttendanceStatus {
    if (status === 'PRESENT') return 'present';
    return 'absent';
  }

  private toApiStatus(status: AttendanceStatus): 'PRESENT' | 'ABSENT' {
    return status === 'present' ? 'PRESENT' : 'ABSENT';
  }
}
