import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

import {
  StudentSessionDetailViewModel,
  StudentSessionListItem,
  StudentSessionsOverviewViewModel,
} from '../../../core/attendance/models/student-attendance.model';
import { StudentAttendanceService } from '../../../core/attendance/services/student-attendance.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { Modal } from '../../../shared/components/modal/modal';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StudentAlertBanner } from '../../../shared/components/student-alert-banner/student-alert-banner';
import { StudentModuleCard } from '../../../shared/components/student-module-card/student-module-card';
import { STUDENT_JUSTIFICATIONS } from '../student-demo.data';
import {
  canOpenJustification,
  enrichSessionDetail,
  enrichSessionListItem,
  shouldShowJustificationCard,
} from '../student-session-enrichment';

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
  imports: [StudentAlertBanner, StudentModuleCard, DataTable, DataTableCellDef, StatusBadge, Modal],
  templateUrl: './student-dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentDashboardPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly studentProfileService = inject(StudentProfileService);
  private readonly attendanceService = inject(StudentAttendanceService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly overview = signal<StudentSessionsOverviewViewModel | null>(null);
  readonly recentSessions = signal<readonly StudentSessionListItem[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly isLoading = signal(false);
  readonly selectedSessionId = signal<number | null>(null);
  readonly activeSessionDetail = signal<StudentSessionDetailViewModel | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly detailCache = signal<Record<number, StudentSessionDetailViewModel>>({});
  readonly sessionRowId = (row: StudentSessionListItem) => String(row.id);

  readonly currentUserName = computed(() => {
    const user = this.authService.currentUser;
    if (!user) {
      return 'Marie Dupont';
    }

    const nameParts = [user.prenom, user.nom]
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    if (nameParts.length > 0) {
      return nameParts.join(' ');
    }

    if (typeof user.email === 'string' && user.email.trim().length > 0) {
      return user.email.trim();
    }

    return 'Étudiant';
  });

  readonly studentMetaLine = computed(() => {
    const profile = this.studentProfileService.profile();
    const program = this.normalizeLabel(profile?.filiere);
    const group = this.normalizeLabel(profile?.groupe);

    if (program && group) {
      return `Filière: ${program} | Groupe: ${group}`;
    }

    if (program) {
      return `Filière: ${program}`;
    }

    if (group) {
      return `Groupe: ${group}`;
    }

    return null;
  });

  readonly quickCards = computed<readonly DashboardQuickCard[]>(() => {
    const overview = this.overview();
    const pendingJustifications = STUDENT_JUSTIFICATIONS.filter(
      (row) => row.status === 'En attente',
    ).length;

    return [
      {
        id: 'sessions',
        title: 'Nombre de séances',
        value: overview?.totalSessions ?? 0,
        subtitle: 'séances suivies',
        ctaLabel: 'Voir les séances',
        icon: 'fa-regular fa-calendar',
        variant: 'default',
        route: '/student/sessions',
      },
      {
        id: 'absences',
        title: "Nombre d'absences",
        value: overview?.absentCount ?? 0,
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

  readonly columns: readonly DataTableColumn<StudentSessionListItem>[] = [
    {
      id: 'session',
      header: 'Séance',
      accessor: (row) => `${row.dateLabel} ${row.timeLabel}`,
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.courseLabel,
      width: '16rem',
    },
    {
      id: 'roomLabel',
      header: 'Salle',
      accessor: (row) => row.roomLabel,
      width: '11rem',
    },
    {
      id: 'attendanceStatus',
      header: 'Présence',
      accessor: (row) => row.attendanceLabel,
      align: 'end',
      width: '9rem',
    },
    {
      id: 'justificationStatus',
      header: 'Justification',
      accessor: (row) => row.justificationStatus ?? 'Aucune',
      align: 'end',
      width: '10rem',
    },
  ];

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.loadDashboardData();
  }

  goTo(route: string): void {
    void this.router.navigateByUrl(route);
  }

  openJustifications(): void {
    void this.router.navigateByUrl('/student/justifications');
  }

  openSessionDetails(session: StudentSessionListItem): void {
    this.selectedSessionId.set(session.id);
    this.detailError.set(null);

    const cachedDetail = this.detailCache()[session.id];
    if (cachedDetail) {
      this.activeSessionDetail.set(cachedDetail);
      return;
    }

    this.activeSessionDetail.set(null);
    this.detailLoading.set(true);
    this.attendanceService
      .getStudentSession(session.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.detailLoading.set(false)),
      )
      .subscribe({
        next: (detailDto) => {
          const detail = enrichSessionDetail(
            this.attendanceService.toSessionDetailViewModel(detailDto),
          );
          this.detailCache.update((current) => ({ ...current, [detail.sessionId]: detail }));
          this.activeSessionDetail.set(detail);
        },
        error: () => {
          this.detailError.set('Impossible de charger la séance.');
        },
      });
  }

  private normalizeLabel(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  closeSessionDetails(): void {
    this.selectedSessionId.set(null);
    this.activeSessionDetail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  shouldShowJustificationCard(session: StudentSessionDetailViewModel): boolean {
    return shouldShowJustificationCard(session);
  }

  canOpenJustification(session: StudentSessionDetailViewModel): boolean {
    return canOpenJustification(session);
  }

  openJustificationFromCard(session: StudentSessionDetailViewModel): void {
    if (!session.justificationRoute || !this.canOpenJustification(session)) {
      return;
    }

    this.closeSessionDetails();
    void this.router.navigateByUrl(session.justificationRoute);
  }

  private loadDashboardData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.attendanceService
      .getStudentOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overviewDto) => {
          this.overview.set(this.attendanceService.toOverviewViewModel(overviewDto));
        },
      });

    this.attendanceService
      .getStudentSessions({ page: 0, size: 4, sort: 'startedAt,desc' })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.recentSessions.set(
            response.items
              .map((item) => this.attendanceService.toSessionListItem(item))
              .map((row) => enrichSessionListItem(row)),
          );
        },
        error: () => {
          this.errorMessage.set('Impossible de charger les dernières séances.');
        },
      });
  }
}
