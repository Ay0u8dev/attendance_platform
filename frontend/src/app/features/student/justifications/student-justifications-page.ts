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
  StudentSessionRow,
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
  readonly filteredRows = computed(() =>
    this.selectedFilter() === 'all'
      ? this.rows
      : this.rows.filter((row) => row.status === this.selectedFilter()),
  );
  readonly justificationRowId = (row: StudentJustificationRow) => row.id;
  readonly isModalOpen = signal(false);
  readonly absentSessions = STUDENT_SESSIONS.filter((row) => row.attendanceStatus === 'Absent');
  readonly selectedSessionId = signal<string | null>(this.absentSessions[0]?.id ?? null);
  readonly selectedFileName = signal('');
  readonly commentDraft = signal('');
  readonly canSubmit = computed(
    () =>
      !!this.selectedSessionId() &&
      this.selectedFileName().length > 0 &&
      this.commentDraft().trim().length > 0,
  );

  readonly columns: readonly DataTableColumn<StudentJustificationRow>[] = [
    {
      id: 'submittedAt',
      header: 'Soumise le',
      accessor: (row) => row.submittedAt,
      filterValue: (row) => [row.submittedAt, row.sessionSlot],
      width: '15rem',
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.module,
      filterValue: (row) => [row.module, row.attachmentName, row.reason],
      filter: {
        type: 'text',
        label: 'Module',
        placeholder: 'Filtrer par module',
      },
      width: '15rem',
    },
    {
      id: 'status',
      header: 'Statut',
      accessor: (row) => row.status,
      filter: {
        type: 'select',
        options: [
          { label: 'En attente', value: 'En attente' },
          { label: 'Acceptée', value: 'Acceptée' },
          { label: 'Refusée', value: 'Refusée' },
        ],
      },
      align: 'end',
      width: '10rem',
    },
    {
      id: 'actions',
      header: 'Action',
      accessor: () => '',
      sortable: false,
      searchable: false,
      hideable: false,
      align: 'end',
      width: '8rem',
    },
  ];

  openSubmissionModal(): void {
    this.isModalOpen.set(true);
  }

  closeSubmissionModal(): void {
    this.isModalOpen.set(false);
    this.selectedFileName.set('');
    this.commentDraft.set('');
  }

  handleFileSelection(file: File | null): void {
    this.selectedFileName.set(file?.name ?? '');
  }

  submitDraft(): void {
    this.closeSubmissionModal();
  }

  selectFilter(value: string): void {
    this.selectedFilter.set(value as JustificationFilter);
  }

  openDetail(id: string): void {
    void this.router.navigate(['/student/justifications', id]);
  }
}
