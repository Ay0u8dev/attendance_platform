import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { Modal } from '../../../shared/components/modal/modal';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import {
  AttendanceStudentStatus,
  StudentSessionDetailViewModel,
  StudentSessionListItem,
  StudentSessionsOverviewViewModel,
} from '../../../core/attendance/models/student-attendance.model';
import { StudentAttendanceService } from '../../../core/attendance/services/student-attendance.service';
import { JustificationService } from '../../../core/justifications/justification.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { JustificationDto } from '../../../core/justifications/justification.model';
import {
  canOpenJustification,
  enrichSessionDetail,
  enrichSessionListItem,
  shouldShowJustificationCard,
} from '../student-session-enrichment';

type SessionPreset = 'all' | 'present-only' | 'absent-only';

@Component({
  selector: 'app-student-sessions-page',
  imports: [PageHeader, DataTable, DataTableCellDef, StatusBadge, Modal],
  templateUrl: './student-sessions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSessionsPage {
  private readonly router = inject(Router);
  private readonly attendanceService = inject(StudentAttendanceService);
  private readonly profileService = inject(StudentProfileService);
  private readonly justificationService = inject(JustificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly backendPageSize = 20;

  readonly justifications = signal<readonly JustificationDto[]>([]);

  readonly selectedPreset = signal<SessionPreset>('all');
  readonly localSearchQuery = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly loadedSessions = signal<readonly StudentSessionListItem[]>([]);
  readonly loadedPages = signal<readonly number[]>([]);
  readonly totalElements = signal(0);
  readonly totalPages = signal(0);
  readonly overview = signal<StudentSessionsOverviewViewModel | null>(null);

  readonly isLoading = signal(false);
  readonly isLoadingMore = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly selectedSessionId = signal<number | null>(null);
  readonly activeSessionDetail = signal<StudentSessionDetailViewModel | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal<string | null>(null);
  readonly detailCache = signal<Record<number, StudentSessionDetailViewModel>>({});

  readonly visibleSessions = computed(() => {
    const query = this.normalizeText(this.localSearchQuery());
    if (!query) {
      return this.loadedSessions();
    }

    return this.loadedSessions().filter((row) =>
      this.normalizeText(
        [
          row.courseLabel,
          row.teacherFullName,
          row.roomLabel,
          row.groupSummary,
          row.dateLabel,
          row.timeLabel,
          row.markMethodLabel,
          row.attendanceLabel,
          row.justificationStatus ?? 'Aucune',
        ].join(' '),
      ).includes(query),
    );
  });

  readonly filterOptions = computed(() => {
    const overview = this.overview();
    return [
      { value: 'all', label: 'Toutes', count: overview?.totalSessions ?? 0 },
      { value: 'present-only', label: 'Présences', count: overview?.presentCount ?? 0 },
      { value: 'absent-only', label: 'Absences', count: overview?.absentCount ?? 0 },
    ] as const;
  });

  presetClasses(value: SessionPreset): string {
    const baseClasses =
      'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors duration-200';
    const isSelected = this.selectedPreset() === value;

    switch (value) {
      case 'present-only':
        return isSelected
          ? `${baseClasses} border-secondary-soft bg-secondary-soft text-secondary-strong`
          : `${baseClasses} border-secondary-soft bg-surface text-secondary-strong hover:bg-secondary-soft`;
      case 'absent-only':
        return isSelected
          ? `${baseClasses} border-danger/30 bg-danger-soft text-danger`
          : `${baseClasses} border-danger/20 bg-surface text-danger hover:bg-danger-soft`;
      default:
        return isSelected
          ? `${baseClasses} border-primary bg-primary-soft text-primary`
          : `${baseClasses} border-line bg-surface text-secondaryText hover:border-primary-soft hover:bg-primary-soft hover:text-primary`;
    }
  }

  readonly canLoadMore = computed(() => {
    if (this.isLoading() || this.isLoadingMore()) {
      return false;
    }

    const totalPages = this.totalPages();
    if (totalPages === 0) {
      return false;
    }

    return this.loadedPages().length < totalPages;
  });

  readonly sessionRowId = (row: StudentSessionListItem) => String(row.id);

  readonly columns: readonly DataTableColumn<StudentSessionListItem>[] = [
    {
      id: 'session',
      header: 'Date et horaire',
      accessor: (row) => `${row.dateLabel} ${row.timeLabel}`,
      sortValue: (row) => row.startedAt,
      width: '15rem',
    },
    {
      id: 'courseLabel',
      header: 'Module',
      accessor: (row) => row.courseLabel,
      sortValue: (row) => row.courseLabel,
      width: '16rem',
    },
    {
      id: 'roomLabel',
      header: 'Salle',
      accessor: (row) => row.roomLabel,
      sortValue: (row) => row.roomLabel,
      width: '11rem',
    },
    {
      id: 'attendanceStatus',
      header: 'Présence',
      accessor: (row) => row.attendanceLabel,
      sortValue: (row) => row.attendanceStatus,
      align: 'end',
      width: '9rem',
    },
    {
      id: 'justificationStatus',
      header: 'Justification',
      accessor: (row) => row.justificationStatus ?? 'Aucune',
      sortValue: (row) => row.justificationStatus ?? 'Aucune',
      align: 'end',
      width: '10rem',
    },
  ];

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.profileService.ensureLoaded();
    effect(() => {
      const profile = this.profileService.profile();
      if (profile) {
        this.loadJustifications(profile.id);
      }
    });

    this.loadOverview();
    this.reloadSessions();
  }

  private loadJustifications(studentId: number): void {
    this.justificationService
      .getJustifications(undefined, studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.justifications.set(list);
          this.loadedSessions.update((sessions) =>
            sessions.map((row) => enrichSessionListItem(row, list))
          );
        },
      });
  }

  selectPreset(value: string): void {
    this.selectedPreset.set(value as SessionPreset);
    this.reloadSessions();
  }

  updateSearchQuery(value: string): void {
    this.localSearchQuery.set(value);
  }

  updateDateFrom(value: string): void {
    this.dateFrom.set(value);
    this.reloadSessions();
  }

  updateDateTo(value: string): void {
    this.dateTo.set(value);
    this.reloadSessions();
  }

  resetBackendFilters(): void {
    this.selectedPreset.set('all');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.localSearchQuery.set('');
    this.reloadSessions();
  }

  loadMoreSessions(): void {
    if (!this.canLoadMore()) {
      return;
    }

    const nextPage = this.loadedPages().length;
    this.fetchSessionsPage(nextPage, false);
  }

  openSessionDetails(row: StudentSessionListItem): void {
    this.selectedSessionId.set(row.id);
    this.detailError.set(null);

    const cachedDetail = this.detailCache()[row.id];
    if (cachedDetail) {
      this.activeSessionDetail.set(cachedDetail);
      return;
    }

    this.activeSessionDetail.set(null);
    this.detailLoading.set(true);
    this.attendanceService
      .getStudentSession(row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.detailLoading.set(false)),
      )
      .subscribe({
        next: (detailDto) => {
          const detail = enrichSessionDetail(
            this.attendanceService.toSessionDetailViewModel(detailDto),
            this.justifications(),
          );
          this.detailCache.update((current) => ({ ...current, [detail.sessionId]: detail }));
          this.activeSessionDetail.set(detail);
        },
        error: (error) => {
          this.detailError.set(this.resolveErrorMessage(error, 'Impossible de charger la séance.'));
        },
      });
  }

  closeSessionDetails(): void {
    this.selectedSessionId.set(null);
    this.activeSessionDetail.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
  }

  openJustificationFromCard(session: StudentSessionDetailViewModel): void {
    if (!session.justificationRoute || !this.canOpenJustification(session)) {
      return;
    }

    this.closeSessionDetails();
    void this.router.navigateByUrl(session.justificationRoute);
  }

  shouldShowJustificationCard(session: StudentSessionDetailViewModel): boolean {
    return shouldShowJustificationCard(session);
  }

  canOpenJustification(session: StudentSessionDetailViewModel): boolean {
    return canOpenJustification(session);
  }

  private loadOverview(): void {
    this.attendanceService
      .getStudentOverview()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (overviewDto) => {
          this.overview.set(this.attendanceService.toOverviewViewModel(overviewDto));
        },
      });
  }

  private reloadSessions(): void {
    this.loadedSessions.set([]);
    this.loadedPages.set([]);
    this.totalElements.set(0);
    this.totalPages.set(0);
    this.errorMessage.set(null);
    this.fetchSessionsPage(0, true);
  }

  private fetchSessionsPage(page: number, resetLoadingState: boolean): void {
    if (resetLoadingState) {
      this.isLoading.set(true);
    } else {
      this.isLoadingMore.set(true);
    }

    this.attendanceService
      .getStudentSessions({
        status: this.backendStatusFilter(),
        dateFrom: this.dateFrom() || undefined,
        dateTo: this.dateTo() || undefined,
        page,
        size: this.backendPageSize,
        sort: 'startedAt,desc',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const mappedItems = response.items
            .map((item) => this.attendanceService.toSessionListItem(item))
            .map((row) => enrichSessionListItem(row, this.justifications()));

          this.loadedSessions.update((current) =>
            page === 0 ? mappedItems : this.mergeSessions(current, mappedItems),
          );
          this.loadedPages.update((current) =>
            current.includes(page) ? current : [...current, page],
          );
          this.totalElements.set(response.totalElements);
          this.totalPages.set(response.totalPages);
          this.errorMessage.set(null);
        },
        error: (error) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error, "Impossible de charger l'historique des séances."),
          );
        },
      });
  }

  private mergeSessions(
    current: readonly StudentSessionListItem[],
    incoming: readonly StudentSessionListItem[],
  ): readonly StudentSessionListItem[] {
    const byId = new Map(current.map((row) => [row.id, row]));
    for (const row of incoming) {
      byId.set(row.id, row);
    }

    return [...byId.values()];
  }

  private backendStatusFilter(): AttendanceStudentStatus | undefined {
    switch (this.selectedPreset()) {
      case 'present-only':
        return 'PRESENT';
      case 'absent-only':
        return 'ABSENT';
      default:
        return undefined;
    }
  }

  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  private resolveErrorMessage(error: { status?: number }, fallback: string): string {
    if (error.status === 403) {
      return "Accès refusé à l'historique étudiant.";
    }

    if (error.status === 404) {
      return 'Aucune séance trouvée pour cette demande.';
    }

    return fallback;
  }
}
