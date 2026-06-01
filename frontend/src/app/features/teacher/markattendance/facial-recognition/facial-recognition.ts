import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  AttendanceSessionResponse,
  AttendanceStudentView,
} from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';

export type AttendanceStatus = 'present' | 'absent' | null;

export interface RecognizedStudent {
  id: number;
  name: string;
  apogee: string;
  avatarInitials: string;
  avatarBg: string;
  avatarColor: string;
  status: AttendanceStatus;
}

export interface DetectionBox {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  confirmed: boolean;
}

@Component({
  selector: 'app-facial-recognition',
  imports: [FormsModule],
  templateUrl: './facial-recognition.html',
  styleUrl: './facial-recognition.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacialRecognition implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly attendanceService = inject(AttendanceService);

  readonly session = signal<AttendanceSessionResponse | null>(null);
  readonly allStudents = signal<RecognizedStudent[]>([]);
  readonly loading = signal(false);
  readonly ending = signal(false);
  readonly error = signal<string | null>(null);

  readonly sessionInfo = computed(() => {
    const session = this.session();
    return {
      module: session?.courseLabel ?? 'Session reconnaissance faciale',
      group: session?.groupIds?.length ? `Groupes ${session.groupIds.join(', ')}` : 'Groupes',
      time: session?.startedAt
        ? `${new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${
            session.endsAt
              ? new Date(session.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'en cours'
          }`
        : '',
      location: session?.roomLabel ?? 'Salle non renseignee',
      date: session?.startedAt ? new Date(session.startedAt).toLocaleDateString() : '',
    };
  });

  readonly confidenceThreshold = 85;
  readonly uptime = 'live';
  readonly totalStudents = computed(() => this.allStudents().length);

  readonly activeDetections = signal<DetectionBox[]>([]);
  readonly autoIdentified = computed(() =>
    this.allStudents().filter((student) => student.status === 'present'),
  );
  readonly autoIdentifiedCount = computed(() => this.autoIdentified().length);

  manualSearchQuery = '';

  readonly manualSearchResults = computed(() => {
    const q = this.manualSearchQuery.toLowerCase().trim();
    if (!q) return [];
    return this.allStudents().filter(
      (student) =>
        student.name.toLowerCase().includes(q) || student.apogee.toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    const sessionId = Number(this.route.snapshot.queryParamMap.get('sessionId'));
    this.loadSession(Number.isFinite(sessionId) && sessionId > 0 ? sessionId : null);
  }

  markPresent(studentId: number): void {
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;

    this.attendanceService.updateAttendance(sessionId, { studentId, status: 'PRESENT' }).subscribe({
      next: () => {
        this.allStudents.update((students) =>
          students.map((student) =>
            student.id === studentId ? { ...student, status: 'present' } : student,
          ),
        );
      },
      error: () => this.error.set('Impossible de marquer cet etudiant present.'),
    });
  }

  markSelectedPresent(): void {
    this.manualSearchResults().forEach((student) => this.markPresent(student.id));
  }

  seeAllStudents(): void {
    this.manualSearchQuery = '';
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
    this.loading.set(true);
    const request = sessionId
      ? this.attendanceService.getSession(sessionId)
      : this.attendanceService.getActiveSession();

    request.subscribe({
      next: (session) => {
        this.loading.set(false);
        this.applySession(session);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Impossible de charger la session faciale.');
      },
    });
  }

  private applySession(session: AttendanceSessionResponse): void {
    this.session.set(session);
    const students = (session.students ?? []).map((student) => this.toRecognizedStudent(student));
    this.allStudents.set(students);
    const lastPresent = students.find((student) => student.status === 'present');
    this.activeDetections.set(
      lastPresent
        ? [
            {
              id: String(lastPresent.id),
              name: `IDENTITE: ${lastPresent.name}`,
              x: 35,
              y: 18,
              w: 26,
              h: 46,
              confirmed: true,
            },
          ]
        : [],
    );
  }

  private toRecognizedStudent(student: AttendanceStudentView): RecognizedStudent {
    const name = `${student.firstName} ${student.lastName}`.trim();
    return {
      id: student.studentId,
      name,
      apogee: student.numApogee,
      avatarInitials: this.initials(name),
      avatarBg: '#dbeafe',
      avatarColor: '#2563eb',
      status:
        student.status === 'PRESENT' ? 'present' : student.status === 'ABSENT' ? 'absent' : null,
    };
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
