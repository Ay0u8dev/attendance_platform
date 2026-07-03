import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AttendanceSessionSummary } from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import { JustificationService } from '../../../../core/justifications/justification.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { QuickActionTile } from '../../../../shared/components/quick-action-tile/quick-action-tile';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import { Modal } from '../../../../shared/components/modal/modal';

type DashboardSessionRow = {
  readonly id: number;
  readonly date: string;
  readonly time: string;
  readonly classroom: string;
  readonly module: string;
  readonly attendanceRate: number;
  readonly method: string;
  readonly variant: 'success' | 'warning';
};

type TeacherAlert = {
  readonly label: string;
  readonly description: string;
  readonly value: string;
  readonly variant: 'success' | 'warning' | 'error' | 'info';
};

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, QuickActionTile, RouterLink, StatCard, StatusBadge, Modal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDashboard implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly justificationService = inject(JustificationService);
  private readonly router = inject(Router);

  readonly recentSessions = signal<AttendanceSessionSummary[]>([]);
  readonly pendingJustifications = signal(0);
  readonly showResumeModal = signal(false);

  readonly activeSession = computed(() => {
    return this.recentSessions().find((session) => session.status === 'ACTIVE');
  });

  readonly stats = computed(() => {
    const sessions = this.recentSessions();
    const absentStudents = sessions.reduce((sum, session) => sum + session.absentCount, 0);
    const totalStudents = sessions.reduce(
      (sum, session) => sum + session.presentCount + session.absentCount + session.unknownCount,
      0,
    );
    const attendanceRate = totalStudents
      ? Math.round(
          (sessions.reduce((sum, session) => sum + session.presentCount, 0) / totalStudents) * 100,
        )
      : 0;
    const activeSessions = sessions.filter((session) => session.status === 'ACTIVE').length;

    return [
      {
        label: 'Sessions chargees',
        value: String(sessions.length),
        icon: 'fa-regular fa-calendar-days',
        badge: `${activeSessions} active(s)`,
        variant: 'info' as const,
      },
      {
        label: 'Taux de presence',
        value: `${attendanceRate}%`,
        icon: 'fa-solid fa-user-check',
        badge: `${absentStudents} absents`,
        variant: attendanceRate >= 80 ? ('success' as const) : ('warning' as const),
      },
      {
        label: 'Justifications en attente',
        value: String(this.pendingJustifications()),
        icon: 'fa-regular fa-clipboard',
        badge: this.pendingJustifications() > 0 ? 'A traiter' : 'A jour',
        variant: this.pendingJustifications() > 0 ? ('warning' as const) : ('success' as const),
      },
      {
        label: 'Sessions a risque',
        value: String(sessions.filter((session) => this.attendanceRate(session) < 75).length),
        icon: 'fa-solid fa-circle-exclamation',
        badge: '< 75%',
        variant: 'error' as const,
      },
    ];
  });

  readonly sessions = computed<DashboardSessionRow[]>(() =>
    this.recentSessions().slice(0, 5).map((session) => {
      const startedAt = new Date(session.startedAt);
      return {
        id: session.sessionId,
        date: startedAt.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        time: startedAt.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        classroom: session.roomLabel ?? 'Salle non renseignee',
        module: session.courseLabel,
        attendanceRate: this.attendanceRate(session),
        method: this.methodLabel(session.method),
        variant: session.status === 'FINALIZED' ? 'success' : 'warning',
      };
    }),
  );

  readonly alerts = computed<TeacherAlert[]>(() => {
    const sessions = this.recentSessions();
    const pending = this.pendingJustifications();
    const activeSession = sessions.find((session) => session.status === 'ACTIVE');
    const lowAttendanceSessions = sessions.filter((session) => this.attendanceRate(session) < 75);

    const items: TeacherAlert[] = [];

    if (pending > 0) {
      items.push({
        label: 'Justifications a examiner',
        description: 'Des demandes d absence attendent votre decision.',
        value: String(pending),
        variant: 'warning',
      });
    }

    if (activeSession) {
      items.push({
        label: 'Session en cours',
        description: `${activeSession.courseLabel} · ${activeSession.roomLabel ?? 'Salle non renseignee'}`,
        value: 'Active',
        variant: 'info',
      });
    }

    if (lowAttendanceSessions.length > 0) {
      items.push({
        label: 'Seances a faible presence',
        description: 'Certaines sessions sont en dessous de 75% de presence.',
        value: String(lowAttendanceSessions.length),
        variant: 'error',
      });
    }

    if (items.length === 0) {
      items.push({
        label: 'Rien d urgent',
        description: 'Vos sessions et justifications sont a jour pour le moment.',
        value: 'OK',
        variant: 'success',
      });
    }

    return items;
  });

  readonly trendChart = computed(() => {
    const sessions = [...this.recentSessions()].slice(0, 8).reverse();
    if (sessions.length === 0) {
      return { points: '', labels: [] as string[] };
    }

    const rates = sessions.map((session) => this.attendanceRate(session));
    const points = rates
      .map((rate, index) => {
        const x = sessions.length === 1 ? 360 : (index / (sessions.length - 1)) * 712;
        const y = 200 - (rate / 100) * 160;
        return `${x},${y}`;
      })
      .join(' ');

    const labels = sessions.map((session) =>
      new Date(session.startedAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      }),
    );

    return { points, labels };
  });

  readonly quickActions = [
    {
      label: 'Demarrer une session',
      description: 'Lancer un nouvel appel pour vos groupes.',
      icon: 'fa-regular fa-calendar-plus',
      route: '/teacher/mark-attendance/start-session',
      tone: 'primary' as const,
    },
    {
      label: 'Traiter les justifications',
      description: 'Examiner les absences justifiees par vos etudiants.',
      icon: 'fa-regular fa-file-lines',
      route: '/teacher/justifications',
      tone: 'warning' as const,
    },
    {
      label: 'Voir mes etudiants',
      description: 'Consulter la liste et contacter vos etudiants.',
      icon: 'fa-solid fa-user-group',
      route: '/teacher/students',
      tone: 'secondary' as const,
    },
    {
      label: 'Historique des sessions',
      description: 'Retrouver toutes vos seances et leur assiduite.',
      icon: 'fa-solid fa-clock-rotate-left',
      route: '/teacher/sessions',
      tone: 'neutral' as const,
    },
  ];

  ngOnInit(): void {
    this.attendanceService.getTeacherSessions({ page: 0, size: 10, sort: 'startedAt,desc' }).subscribe({
      next: (page) => this.recentSessions.set(page.items),
      error: () => this.recentSessions.set([]),
    });

    this.justificationService.getJustifications('PENDING').subscribe({
      next: (justifications) => this.pendingJustifications.set(justifications.length),
      error: () => this.pendingJustifications.set(0),
    });
  }

  private attendanceRate(session: AttendanceSessionSummary): number {
    const total = session.presentCount + session.absentCount + session.unknownCount;
    return total ? Math.round((session.presentCount / total) * 100) : 0;
  }

  private methodLabel(method: AttendanceSessionSummary['method']): string {
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

  openResumeModal(): void {
    this.showResumeModal.set(true);
  }

  closeResumeModal(): void {
    this.showResumeModal.set(false);
  }

  resumeActiveSession(session: AttendanceSessionSummary): void {
    this.closeResumeModal();
    this.router.navigate(['/teacher/mark-attendance/start-session/qr-code-marking'], {
      queryParams: { sessionId: session.sessionId }
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatGroupIds(groupIds: readonly number[]): string {
    return groupIds.join(', ');
  }
}
