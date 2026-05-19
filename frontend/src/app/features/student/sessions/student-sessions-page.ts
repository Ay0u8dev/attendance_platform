import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { SessionFilterBar } from '../../../shared/components/session-filter-bar/session-filter-bar';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { STUDENT_SESSIONS, StudentSessionRow } from '../student-demo.data';

type SessionPreset = 'all' | 'absent-only' | 'needs-justification';

@Component({
  selector: 'app-student-sessions-page',
  imports: [PageHeader, SessionFilterBar, DataTable, DataTableCellDef, StatusBadge],
  templateUrl: './student-sessions-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSessionsPage {
  private readonly router = inject(Router);

  readonly selectedPreset = signal<SessionPreset>('all');
  readonly sessions = STUDENT_SESSIONS;
  readonly sessionRowId = (row: StudentSessionRow) => row.id;
  readonly filteredSessions = computed(() => {
    switch (this.selectedPreset()) {
      case 'absent-only':
        return this.sessions.filter((row) => row.attendanceStatus === 'Absent');
      case 'needs-justification':
        return this.sessions.filter(
          (row) => row.attendanceStatus === 'Absent' && row.justificationStatus !== 'Acceptée',
        );
      default:
        return this.sessions;
    }
  });
  readonly filterOptions = computed(() => [
    { value: 'all', label: 'Toutes', count: this.sessions.length },
    {
      value: 'absent-only',
      label: 'Absences',
      count: this.sessions.filter((row) => row.attendanceStatus === 'Absent').length,
    },
    {
      value: 'needs-justification',
      label: 'À justifier',
      count: this.sessions.filter(
        (row) => row.attendanceStatus === 'Absent' && row.justificationStatus !== 'Acceptée',
      ).length,
    },
  ]);
  readonly summaryLabel = computed(() => {
    switch (this.selectedPreset()) {
      case 'absent-only':
        return 'Vue ciblée sur vos absences';
      case 'needs-justification':
        return 'Séances qui demandent encore une action';
      default:
        return 'Toutes les séances enregistrées';
    }
  });

  readonly columns: readonly DataTableColumn<StudentSessionRow>[] = [
    {
      id: 'session',
      header: 'Date et horaire',
      accessor: (row) => `${row.date} ${row.time}`,
      filterValue: (row) => [row.date, row.time],
      width: '13rem',
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.module,
      filterValue: (row) => [row.module, row.teacher, row.campus],
      filter: {
        type: 'text',
        label: 'Module',
        placeholder: 'Filtrer par module',
      },
      width: '15rem',
    },
    {
      id: 'teacher',
      header: 'Enseignant',
      accessor: (row) => row.teacher,
      initiallyHidden: true,
      width: '11rem',
    },
    {
      id: 'attendanceStatus',
      header: 'Présence',
      accessor: (row) => row.attendanceStatus,
      filter: {
        type: 'select',
        options: [
          { label: 'Présent', value: 'Présent' },
          { label: 'Absent', value: 'Absent' },
          { label: 'Retard', value: 'Retard' },
        ],
      },
      align: 'end',
      width: '8rem',
    },
    {
      id: 'justificationStatus',
      header: 'Justification',
      accessor: (row) => row.justificationStatus,
      filter: {
        type: 'select',
        options: [
          { label: 'Aucune', value: 'Aucune' },
          { label: 'En attente', value: 'En attente' },
          { label: 'Acceptée', value: 'Acceptée' },
          { label: 'Refusée', value: 'Refusée' },
        ],
      },
      align: 'end',
      width: '9rem',
    },
    {
      id: 'campus',
      header: 'Lieu',
      accessor: (row) => row.campus,
      initiallyHidden: true,
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
      width: '12rem',
      cellClassName: 'whitespace-nowrap',
    },
  ];

  openJustifications(): void {
    void this.router.navigateByUrl('/student/justifications');
  }

  selectPreset(value: string): void {
    this.selectedPreset.set(value as SessionPreset);
  }

  openJustificationDetail(row: StudentSessionRow): void {
    const mappedId =
      row.justificationStatus === 'En attente'
        ? 'just-001'
        : row.justificationStatus === 'Acceptée'
          ? 'just-002'
          : 'just-003';
    void this.router.navigate(['/student/justifications', mappedId]);
  }
}
