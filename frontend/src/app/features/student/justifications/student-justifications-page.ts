import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
import {
  STUDENT_JUSTIFICATIONS,
  STUDENT_SESSIONS,
  StudentJustificationRow,
} from '../student-demo.data';

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

  readonly rows = STUDENT_JUSTIFICATIONS;
  readonly tabs: readonly StatusFilterTab[] = [
    { value: 'all', label: 'Toutes', count: STUDENT_JUSTIFICATIONS.length },
    { value: 'En attente', label: 'En attente', count: 1 },
    { value: 'Acceptée', label: 'Acceptées', count: 1 },
    { value: 'Refusée', label: 'Refusées', count: 1 },
  ];
  readonly selectedFilter = signal<JustificationFilter>('all');
  readonly searchQuery = signal('');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly filteredRows = computed(() => {
    const filter = this.selectedFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return this.rows.filter((row) => {
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
  readonly absentSessions = STUDENT_SESSIONS.filter((row) => row.attendanceStatus === 'Absent');
  readonly selectedSessionIds = signal<Set<string>>(new Set());
  readonly selectedSessionCount = computed(() => this.selectedSessionIds().size);
  readonly filteredAbsentSessions = computed(() => {
    const fromDate = this.dateFrom() ? new Date(`${this.dateFrom()}T00:00:00`) : null;
    const toDate = this.dateTo() ? new Date(`${this.dateTo()}T23:59:59`) : null;

    return [...this.absentSessions]
      .filter((row) => {
        const sessionDate = this.parseSessionDate(row.date);
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
      .sort((a, b) => this.getSessionTimestamp(b.date) - this.getSessionTimestamp(a.date));
  });
  readonly selectedFileName = signal('');
  readonly commentDraft = signal('');
  readonly canSubmit = computed(
    () =>
      this.selectedSessionIds().size > 0 &&
      this.selectedFileName().length > 0 &&
      this.commentDraft().trim().length > 0,
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

  openSubmissionModal(): void {
    this.isModalOpen.set(true);
  }

  closeSubmissionModal(): void {
    this.isModalOpen.set(false);
    this.selectedFileName.set('');
    this.commentDraft.set('');
    this.selectedSessionIds.set(new Set());
    this.dateFrom.set('');
    this.dateTo.set('');
  }

  handleFileSelection(file: File | null): void {
    this.selectedFileName.set(file?.name ?? '');
  }

  submitDraft(): void {
    this.closeSubmissionModal();
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

  private parseSessionDate(label: string): Date | null {
    const match = label.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})$/);
    if (!match) {
      return null;
    }

    const day = Number.parseInt(match[1], 10);
    const monthKey = match[2].toLowerCase().replace('.', '');
    const year = Number.parseInt(match[3], 10);
    const monthIndex = this.getMonthIndex(monthKey);

    if (Number.isNaN(day) || Number.isNaN(year) || monthIndex === null) {
      return null;
    }

    return new Date(year, monthIndex, day);
  }

  private getSessionTimestamp(label: string): number {
    return this.parseSessionDate(label)?.getTime() ?? 0;
  }

  private getMonthIndex(month: string): number | null {
    switch (month) {
      case 'janv':
      case 'jan':
        return 0;
      case 'fev':
      case 'fevr':
      case 'fevrier':
      case 'févr':
      case 'février':
        return 1;
      case 'mars':
        return 2;
      case 'avr':
      case 'avril':
        return 3;
      case 'mai':
        return 4;
      case 'juin':
        return 5;
      case 'juil':
      case 'juillet':
        return 6;
      case 'aout':
      case 'août':
        return 7;
      case 'sept':
      case 'sep':
      case 'septembre':
        return 8;
      case 'oct':
      case 'octobre':
        return 9;
      case 'nov':
      case 'novembre':
        return 10;
      case 'dec':
      case 'déc':
      case 'decembre':
      case 'décembre':
        return 11;
      default:
        return null;
    }
  }
}
