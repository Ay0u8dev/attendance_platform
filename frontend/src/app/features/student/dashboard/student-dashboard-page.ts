import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/services/auth.service';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { Modal } from '../../../shared/components/modal/modal';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StudentAlertBanner } from '../../../shared/components/student-alert-banner/student-alert-banner';
import { StudentModuleCard } from '../../../shared/components/student-module-card/student-module-card';
import { STUDENT_JUSTIFICATIONS, STUDENT_PROFILE, STUDENT_SESSIONS, StudentSessionRow } from '../student-demo.data';

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

@Component({
  selector: 'app-student-dashboard-page',
  imports: [
    StudentAlertBanner,
    StudentModuleCard,
    DataTable,
    DataTableCellDef,
    StatusBadge,
    Modal,
  ],
  templateUrl: './student-dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly profile = STUDENT_PROFILE;
  readonly selectedSession = signal<StudentSessionRow | null>(null);
  readonly activeSession = computed(() => this.selectedSession());
  readonly recentSessions = STUDENT_SESSIONS.slice(0, 4);
  readonly sessionRowId = (row: StudentSessionRow) => row.id;
  readonly currentUserName = computed(() => {
    const user = this.authService.currentUser;
    if (!user) {
      return 'Marie Dupont';
    }

    return `${user.prenom} ${user.nom}`.trim();
  });

  readonly quickCards = computed<readonly DashboardQuickCard[]>(() => {
    const totalSessions = STUDENT_SESSIONS.length;
    const totalAbsences = STUDENT_SESSIONS.filter((row) => row.attendanceStatus === 'Absent').length;
    const pendingJustifications = STUDENT_JUSTIFICATIONS.filter(
      (row) => row.status === 'En attente',
    ).length;

    return [
      {
        id: 'sessions',
        title: 'Nombre de séances',
        value: totalSessions,
        subtitle: 'séances suivies',
        ctaLabel: 'Voir les séances',
        icon: 'fa-regular fa-calendar',
        variant: 'default',
        route: '/student/sessions',
      },
      {
        id: 'absences',
        title: "Nombre d'absences",
        value: totalAbsences,
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

  readonly columns: readonly DataTableColumn<StudentSessionRow>[] = [
    {
      id: 'session',
      header: 'Séance',
      accessor: (row) => `${row.date} ${row.time}`,
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.module,
      width: '16rem',
    },
    {
      id: 'attendanceStatus',
      header: 'Présence',
      accessor: (row) => this.attendanceLabel(row),
      align: 'end',
      width: '9rem',
    },
    {
      id: 'justificationStatus',
      header: 'Justification',
      accessor: (row) => row.justificationStatus,
      align: 'end',
      width: '10rem',
    },
  ];

  attendanceLabel(row: StudentSessionRow): 'Présent' | 'Absent' {
    return row.attendanceStatus === 'Absent' ? 'Absent' : 'Présent';
  }

  attendanceVariant(row: StudentSessionRow): 'success' | 'error' {
    return row.attendanceStatus === 'Absent' ? 'error' : 'success';
  }

  goTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  openJustifications(): void {
    void this.router.navigateByUrl('/student/justifications');
  }

  openSessionDetails(session: StudentSessionRow): void {
    this.selectedSession.set(session);
  }

  closeSessionDetails(): void {
    this.selectedSession.set(null);
  }

  canOpenJustification(session: StudentSessionRow): boolean {
    return (
      session.attendanceStatus === 'Absent' &&
      session.justificationStatus !== 'Aucune' &&
      this.sessionToJustificationRoute(session.id) !== null
    );
  }

  openJustificationFromCard(session: StudentSessionRow): void {
    const route = this.sessionToJustificationRoute(session.id);
    if (!route || !this.canOpenJustification(session)) {
      return;
    }

    this.closeSessionDetails();
    void this.router.navigateByUrl(route);
  }

  private sessionToJustificationRoute(sessionId: string): string | null {
    const mapping: Record<string, string> = {
      'session-001': '/student/justifications/just-001',
      'session-004': '/student/justifications/just-002',
      'session-006': '/student/justifications/just-003',
    };

    return mapping[sessionId] ?? null;
  }
}
