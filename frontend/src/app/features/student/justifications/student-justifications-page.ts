import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';

import { JustificationService } from '../../../core/justifications/justification.service';
import { StudentProfileService } from '../../../core/student/services/student-profile.service';
import { StudentAttendanceService } from '../../../core/attendance/services/student-attendance.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { JustificationDto } from '../../../core/justifications/justification.model';
import { Button } from '../../../shared/components/button/button';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { FileUploadDropzone } from '../../../shared/components/file-upload-dropzone/file-upload-dropzone';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import {
  StatusFilterTab,
  StatusFilterTabs,
} from '../../../shared/components/status-filter-tabs/status-filter-tabs';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { StudentJustificationRow } from '../student-demo.data';

type JustificationFilter = 'all' | 'En attente' | 'Acceptée' | 'Refusée';

@Component({
  selector: 'app-student-justifications-page',
  imports: [
    FormsModule,
    PageHeader,
    StatusFilterTabs,
    DataTable,
    DataTableCellDef,
    StatusBadge,
    Modal,
    Button,
    FileUploadDropzone,
  ],
  templateUrl: './student-justifications-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentJustificationsPage {
  private readonly router = inject(Router);
  private readonly profileService = inject(StudentProfileService);
  private readonly justificationService = inject(JustificationService);
  private readonly attendanceService = inject(StudentAttendanceService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly justifications = signal<readonly JustificationDto[]>([]);
  readonly absentSessions = signal<
    readonly {
      id: string;
      module: string;
      date: string;
      time: string;
      teacherFullName: string;
      startedAt: string;
    }[]
  >([]);

  readonly rows = computed(() => this.justifications().map((dto) => this.mapJustificationDto(dto)));

  readonly tabs = computed<readonly StatusFilterTab[]>(() => {
    const list = this.rows();
    return [
      { value: 'all', label: 'Toutes', count: list.length },
      {
        value: 'En attente',
        label: 'En attente',
        count: list.filter((r) => r.status === 'En attente').length,
      },
      {
        value: 'Acceptée',
        label: 'Acceptées',
        count: list.filter((r) => r.status === 'Acceptée').length,
      },
      {
        value: 'Refusée',
        label: 'Refusées',
        count: list.filter((r) => r.status === 'Refusée').length,
      },
    ];
  });

  readonly selectedFilter = signal<JustificationFilter>('all');
  readonly searchQuery = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly filteredRows = computed(() => {
    const filter = this.selectedFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return this.rows().filter((row) => {
      if (filter !== 'all' && row.status !== filter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        row.submittedAt,
        row.sessionSlot,
        row.module,
        row.attachmentName,
        row.reason,
        row.status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  });

  readonly justificationRowId = (row: StudentJustificationRow) => row.id;
  readonly isModalOpen = signal(false);
  readonly selectedSessionIds = signal<Set<string>>(new Set());
  readonly selectedSessionCount = computed(() => this.selectedSessionIds().size);

  readonly filteredAbsentSessions = computed(() => {
    const fromDate = this.dateFrom() ? new Date(`${this.dateFrom()}T00:00:00`) : null;
    const toDate = this.dateTo() ? new Date(`${this.dateTo()}T23:59:59`) : null;

    return [...this.absentSessions()]
      .filter((row) => {
        const sessionDate = row.startedAt ? new Date(row.startedAt) : null;
        if (!sessionDate) {
          return true;
        }

        if (fromDate && sessionDate < fromDate) {
          return false;
        }

        if (toDate && sessionDate > toDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  });

  readonly selectedFile = signal<File | null>(null);
  readonly selectedFileName = signal('');
  readonly commentDraft = signal('');
  readonly isSubmitting = signal(false);

  readonly canSubmit = computed(
    () =>
      this.selectedSessionIds().size > 0 &&
      this.selectedFileName().length > 0 &&
      this.commentDraft().trim().length > 0 &&
      !this.isSubmitting(),
  );

  readonly columns: readonly DataTableColumn<StudentJustificationRow>[] = [
    {
      id: 'submittedAt',
      header: 'Soumise le',
      accessor: (row) => row.submittedAt,
      width: '15rem',
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.module,
      width: '15rem',
    },
    {
      id: 'reason',
      header: 'Motif',
      accessor: (row) => row.reason,
      width: '18rem',
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      align: 'end',
      width: '10rem',
    },
  ];

  constructor() {
    this.profileService.ensureLoaded();

    effect(() => {
      const profile = this.profileService.profile();
      if (profile) {
        this.loadData(profile.id);
      }
    });
  }

  private loadData(studentId: number): void {
    this.justificationService
      .getJustifications(undefined, studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.justifications.set(list);
        },
      });

    this.attendanceService
      .getStudentSessions({
        status: 'ABSENT',
        page: 0,
        size: 100,
        sort: 'startedAt,desc',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const items = response.items.map((item) => {
            const listItem = this.attendanceService.toSessionListItem(item);
            return {
              id: listItem.id.toString(),
              module: listItem.courseLabel,
              date: listItem.dateLabel,
              time: listItem.timeLabel,
              teacherFullName: listItem.teacherFullName,
              startedAt: listItem.startedAt,
            };
          });
          this.absentSessions.set(items);
        },
      });
  }

  openSubmissionModal(): void {
    this.isModalOpen.set(true);
  }

  closeSubmissionModal(): void {
    this.isModalOpen.set(false);
    this.selectedFile.set(null);
    this.selectedFileName.set('');
    this.commentDraft.set('');
    this.selectedSessionIds.set(new Set());
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  handleFileSelection(file: File | null): void {
    this.selectedFile.set(file);
    this.selectedFileName.set(file?.name ?? '');
  }

  submitDraft(): void {
    const file = this.selectedFile();
    const comment = this.commentDraft().trim();
    const selectedIds = Array.from(this.selectedSessionIds());
    const profile = this.profileService.profile();

    if (!file || !comment || selectedIds.length === 0 || !profile) {
      return;
    }

    this.isSubmitting.set(true);

    const firstSessionId = selectedIds[0];
    const firstSession = this.absentSessions().find((s) => s.id === firstSessionId.toString());
    const moduleParam = firstSession?.module || 'Module';
    const studentParam = `${profile.lastName || ''}${profile.firstName || ''}`.trim() || 'Etudiant';

    this.justificationService.uploadDocument(file, studentParam, moduleParam).subscribe({
      next: (documentUrl) => {
        const dbStudentName =
          `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Étudiant';
        const studentCode = profile.numApogee || '';

        const submissions = selectedIds.map((sessionIdStr) => {
          const sessionId = parseInt(sessionIdStr, 10);
          const session = this.absentSessions().find((s) => s.id === sessionIdStr);
          const payload = {
            sessionId,
            studentId: profile.id,
            studentName: dbStudentName,
            studentCode,
            module: session?.module || 'N/A',
            sessionDate: session?.startedAt || new Date().toISOString(),
            reason: comment,
            documentUrl,
          };

          return this.justificationService.submitJustification(payload);
        });

        forkJoin(submissions).subscribe({
          next: () => {
            this.toastService.success('Succès', 'Justificatif soumis avec succès.');
            this.loadData(profile.id);
            this.closeSubmissionModal();
            this.isSubmitting.set(false);
          },
          error: (err) => {
            console.error('Failed to submit justification details', err);
            this.toastService.error('Erreur', 'Impossible de valider la demande de justification.');
            this.isSubmitting.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Failed to upload justification document', err);
        this.toastService.error('Erreur', 'Impossible de téléverser la pièce jointe.');
        this.isSubmitting.set(false);
      },
    });
  }

  toggleSession(sessionId: string): void {
    this.selectedSessionIds.update((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  selectAllFilteredSessions(): void {
    const ids = this.filteredAbsentSessions().map((row) => row.id);
    this.selectedSessionIds.update((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }

  clearSelectedSessions(): void {
    this.selectedSessionIds.set(new Set());
  }

  isSessionSelected(sessionId: string): boolean {
    return this.selectedSessionIds().has(sessionId);
  }

  updateDateFrom(value: string): void {
    this.dateFrom.set(value);
  }

  updateDateTo(value: string): void {
    this.dateTo.set(value);
  }

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  selectFilter(value: string): void {
    this.selectedFilter.set(value as JustificationFilter);
  }

  openDetail(id: string): void {
    void this.router.navigate(['/student/justifications', id]);
  }

  private readonly dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  private formatDateString(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return this.dateFormatter.format(date);
    } catch {
      return dateStr;
    }
  }

  private mapJustificationDto(dto: JustificationDto): StudentJustificationRow {
    const statusMap: Record<string, 'En attente' | 'Acceptée' | 'Refusée'> = {
      PENDING: 'En attente',
      APPROVED: 'Acceptée',
      REJECTED: 'Refusée',
    };
    const variantMap: Record<string, 'warning' | 'success' | 'error'> = {
      PENDING: 'warning',
      APPROVED: 'success',
      REJECTED: 'error',
    };

    let attachmentName = 'document';
    if (dto.documentUrl) {
      try {
        const parts = dto.documentUrl.split('/');
        attachmentName = parts[parts.length - 1];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i;
        attachmentName = attachmentName.replace(uuidRegex, '');
      } catch {
        attachmentName = 'document';
      }
    }

    return {
      id: dto.id.toString(),
      sessionId: dto.sessionId ?? undefined,
      submittedAt: this.formatDateString(dto.submittedAt),
      module: dto.module,
      sessionSlot: this.formatDateString(dto.sessionDate),
      status: statusMap[dto.status] ?? 'En attente',
      statusVariant: variantMap[dto.status] ?? 'warning',
      attachmentName,
      reason: dto.reason || 'Aucun motif renseigné',
    };
  }
}
