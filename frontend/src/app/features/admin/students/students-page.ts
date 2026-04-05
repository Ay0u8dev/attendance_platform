import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

type StudentStatusVariant = 'success' | 'warning' | 'error';

type StudentRow = {
  readonly name: string;
  readonly email: string;
  readonly program: string;
  readonly group: string;
  readonly absences: number;
  readonly attendanceRate: number;
  readonly status: string;
  readonly variant: StudentStatusVariant;
  readonly lastCheckIn: string;
};

@Component({
  selector: 'app-students-page',
  imports: [PageHeader, DataTable, DataTableCellDef, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Students"
        description="Browse academic cohorts, track attendance risk, and review student-level operational data."
        meta="2,184 active students"
      ></app-page-header>

      <app-data-table
        title="Student directory"
        description="A shared, modular data table with search, column filters, sorting, selection, pagination, and column visibility controls."
        caption="Shadcn-style table behavior adapted to the project design language"
        [rows]="students"
        [columns]="columns"
        [rowId]="studentRowId"
        [pageSizeOptions]="[5, 10, 20]"
        [initialPageSize]="5"
        searchPlaceholder="Search by student, email, program, or group..."
        emptyStateTitle="No students match these filters"
        emptyStateDescription="Clear the current search or filters to bring records back into view."
        [enableRowSelection]="true"
      >
        <ng-template [appDataTableCell]="'student'" let-row="row">
          <div class="min-w-0">
            <p class="truncate font-medium text-principalText">{{ row.name }}</p>
            <p class="truncate text-xs text-secondaryText">{{ row.email }}</p>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'attendanceRate'" let-value="value">
          <div class="text-right">
            <p class="font-medium text-principalText">{{ value }}%</p>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'status'" let-row="row">
          <div class="flex justify-end">
            <app-status-badge [label]="row.status" [variant]="row.variant"></app-status-badge>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'actions'" let-row="row">
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
              [attr.aria-label]="'Open profile for ' + row.name"
            >
              Profile
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
              [attr.aria-label]="'Review attendance for ' + row.name"
            >
              Review
            </button>
          </div>
        </ng-template>
      </app-data-table>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage {
  readonly studentRowId = (student: StudentRow) => student.email;

  readonly students: readonly StudentRow[] = [
    {
      name: 'Sofiane Meziane',
      email: 'sofiane.meziane@ump.ac.ma',
      program: 'Software Engineering',
      group: 'Group 02',
      absences: 1,
      attendanceRate: 98,
      status: 'Good standing',
      variant: 'success',
      lastCheckIn: 'Today, 08:54',
    },
    {
      name: 'Leila Bensalem',
      email: 'leila.bensalem@ump.ac.ma',
      program: 'Data Science',
      group: 'Group 05',
      absences: 3,
      attendanceRate: 89,
      status: 'Needs review',
      variant: 'warning',
      lastCheckIn: 'Today, 09:12',
    },
    {
      name: 'Yassine El Idrissi',
      email: 'yassine.idrissi@ump.ac.ma',
      program: 'Networks & Security',
      group: 'Group 03',
      absences: 6,
      attendanceRate: 74,
      status: 'Absence alert',
      variant: 'error',
      lastCheckIn: 'Yesterday, 11:08',
    },
    {
      name: 'Meryem Toumi',
      email: 'meryem.toumi@ump.ac.ma',
      program: 'Software Engineering',
      group: 'Group 01',
      absences: 0,
      attendanceRate: 100,
      status: 'Good standing',
      variant: 'success',
      lastCheckIn: 'Today, 08:46',
    },
    {
      name: 'Bilal Aït Hamou',
      email: 'bilal.ait.hamou@ump.ac.ma',
      program: 'Data Science',
      group: 'Group 04',
      absences: 2,
      attendanceRate: 93,
      status: 'Good standing',
      variant: 'success',
      lastCheckIn: 'Today, 10:02',
    },
    {
      name: 'Imane Kabbaj',
      email: 'imane.kabbaj@ump.ac.ma',
      program: 'Networks & Security',
      group: 'Group 03',
      absences: 4,
      attendanceRate: 84,
      status: 'Needs review',
      variant: 'warning',
      lastCheckIn: 'Yesterday, 09:41',
    },
    {
      name: 'Nour Eddine Salmi',
      email: 'nour.salmi@ump.ac.ma',
      program: 'Software Engineering',
      group: 'Group 02',
      absences: 7,
      attendanceRate: 71,
      status: 'Absence alert',
      variant: 'error',
      lastCheckIn: '2 days ago, 08:58',
    },
  ];

  readonly columns: readonly DataTableColumn<StudentRow>[] = [
    {
      id: 'student',
      header: 'Student',
      accessor: (student) => student.name,
      sortValue: (student) => student.name,
      filterValue: (student) => [student.name, student.email, student.program, student.group],
      filter: {
        type: 'text',
        label: 'Student filter',
        placeholder: 'Filter by student or email',
      },
      width: '18rem',
    },
    {
      id: 'program',
      header: 'Program',
      accessor: (student) => student.program,
      filter: {
        type: 'select',
        options: [
          { label: 'Software Engineering', value: 'Software Engineering' },
          { label: 'Data Science', value: 'Data Science' },
          { label: 'Networks & Security', value: 'Networks & Security' },
        ],
      },
      width: '13rem',
    },
    {
      id: 'group',
      header: 'Group',
      accessor: (student) => student.group,
      filter: {
        type: 'select',
        options: [
          { label: 'Group 01', value: 'Group 01' },
          { label: 'Group 02', value: 'Group 02' },
          { label: 'Group 03', value: 'Group 03' },
          { label: 'Group 04', value: 'Group 04' },
          { label: 'Group 05', value: 'Group 05' },
        ],
      },
      initiallyHidden: true,
      width: '9rem',
    },
    {
      id: 'attendanceRate',
      header: 'Attendance',
      accessor: (student) => student.attendanceRate,
      sortValue: (student) => student.attendanceRate,
      align: 'end',
      width: '8rem',
    },
    {
      id: 'absences',
      header: 'Absences',
      accessor: (student) => student.absences,
      sortValue: (student) => student.absences,
      align: 'end',
      width: '7rem',
    },
    {
      id: 'lastCheckIn',
      header: 'Last check-in',
      accessor: (student) => student.lastCheckIn,
      initiallyHidden: true,
      width: '11rem',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (student) => student.status,
      filter: {
        type: 'select',
        options: [
          { label: 'Good standing', value: 'Good standing' },
          { label: 'Needs review', value: 'Needs review' },
          { label: 'Absence alert', value: 'Absence alert' },
        ],
      },
      align: 'end',
      width: '11rem',
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: () => '',
      sortable: false,
      searchable: false,
      hideable: false,
      align: 'end',
      width: '12rem',
      cellClassName: 'whitespace-nowrap',
    },
  ];
}
