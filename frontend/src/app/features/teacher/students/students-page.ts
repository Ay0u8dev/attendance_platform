import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { StudentUser } from '../../../core/users/models/student.model';
import { StudentUserService } from '../../../core/users/services/student-user.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { Modal } from '../../../shared/components/modal/modal';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { StudentAttendanceSessionSummaryDto } from '../../../core/attendance/models/student-attendance.model';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';

type StudentStatusVariant = 'success' | 'warning' | 'error';

type StudentRow = {
  readonly name: string;
  readonly email: string;
  readonly apogee: string;
  readonly lastSeen: string;
  readonly status: string;
  readonly variant: StudentStatusVariant;
  readonly joinedDate: string;
  readonly raw: StudentUser;
  readonly formation?: string | null;
  readonly groupName?: string | null;
};

@Component({
  selector: 'app-teacher-students-page',
  standalone: true,
  imports: [PageHeader, StatusBadge, Modal, UserAvatar],
  templateUrl: './students-page.html',
  styleUrl: './students-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentsPage implements OnInit {
  private readonly studentService = inject(StudentUserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attendanceService = inject(AttendanceService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly students = signal<StudentRow[]>([]);
  readonly selectedGroupName = signal<string | null>(null);
  readonly searchQuery = signal('');
  readonly selectedStudent = signal<StudentRow | null>(null);

  readonly absentSessions = signal<StudentAttendanceSessionSummaryDto[]>([]);
  readonly selectedModuleFilter = signal<string>('');
  readonly loadingAbsences = signal<boolean>(false);

  readonly modulesWithAbsencesCount = computed(() => {
    const sessions = this.absentSessions();
    const counts: { [module: string]: number } = {};
    for (const session of sessions) {
      counts[session.courseLabel] = (counts[session.courseLabel] || 0) + 1;
    }
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  });

  readonly filteredAbsentSessions = computed(() => {
    const filter = this.selectedModuleFilter();
    const sessions = this.absentSessions();
    if (!filter) {
      return sessions;
    }
    return sessions.filter((session) => session.courseLabel === filter);
  });

  readonly filteredStudents = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.students();
    }

    return this.students().filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.apogee.toLowerCase().includes(query) ||
        student.groupName?.toLowerCase().includes(query) || false
    );
  });

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const groupId = Number(params.get('groupId'));
      this.selectedGroupName.set(params.get('groupName'));

      if (Number.isFinite(groupId) && groupId > 0) {
        this.loadStudentsByGroupe(groupId);
      } else {
        this.loadStudents();
      }
    });
  }

  loadStudents(): void {
    this.loading.set(true);
    this.error.set(null);

    this.studentService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (students) => this.students.set(students.map((student) => this.toRow(student))),
        error: () => this.error.set('Impossible de charger les étudiants.'),
      });
  }

  loadStudentsByGroupe(groupeId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.studentService
      .getByGroupeId(groupeId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (students) => this.students.set(students.map((student) => this.toRow(student))),
        error: () => this.error.set('Impossible de charger les etudiants de ce groupe.'),
      });
  }

  openHistory(): void {
    this.router.navigate(['/teacher/sessions']);
  }

  messageStudent(row: StudentRow): void {
    window.location.href = `mailto:${row.email}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  selectStudent(row: StudentRow): void {
    this.selectedStudent.set(row);
    this.selectedModuleFilter.set('');
    this.loadStudentAbsences(row.raw.id);
  }

  closeStudentDetails(): void {
    this.selectedStudent.set(null);
    this.absentSessions.set([]);
  }

  loadStudentAbsences(studentId: number): void {
    this.loadingAbsences.set(true);
    this.absentSessions.set([]);
    this.attendanceService.getStudentSessions(studentId, 'ABSENT')
      .pipe(finalize(() => this.loadingAbsences.set(false)))
      .subscribe({
        next: (response) => {
          this.absentSessions.set(response.items);
        },
        error: () => {
          // ignore or handle error
        }
      });
  }

  onModuleFilterChange(value: string): void {
    this.selectedModuleFilter.set(value);
  }

  private toRow(student: StudentUser): StudentRow {
    const lastSeen = student.updatedAt
      ? new Date(student.updatedAt).toLocaleDateString('fr-FR')
      : 'Jamais';
    const isActive = student.updatedAt
      ? Date.now() - new Date(student.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 30
      : false;
    const joinedDate = student.createdAt
      ? new Date(student.createdAt).toLocaleDateString('fr-FR')
      : 'Inconnu';

    return {
      name: `${student.firstName} ${student.lastName}`.trim(),
      email: student.email,
      apogee: student.numApogee,
      lastSeen,
      status: student.enabled ? (isActive ? 'Actif' : 'Inactif') : 'Désactivé',
      variant: student.enabled ? (isActive ? 'success' : 'warning') : 'error',
      joinedDate,
      raw: student,
      formation: student.filiere || null,
      groupName: student.groupeName || null
    };
  }

  private readonly dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  private readonly timeFormatter = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  formatDate(value: string): string {
    return this.dateFormatter.format(new Date(value));
  }

  formatTimeRange(startedAt: string, endedAt: string | null): string {
    const start = this.timeFormatter.format(new Date(startedAt));
    if (!endedAt) {
      return start;
    }
    return `${start} - ${this.timeFormatter.format(new Date(endedAt))}`;
  }
}
