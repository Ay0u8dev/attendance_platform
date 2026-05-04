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
  selector: 'app-teacher-students-page',
  standalone: true,
  imports: [PageHeader, DataTable, DataTableCellDef, StatusBadge],
  templateUrl: './students-page.html',
  styleUrl: './students-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentsPage {
  readonly studentRowId = (student: StudentRow) => student.email;

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  readonly students: readonly StudentRow[] = [
    {
      name: 'Sofiane Meziane',
      email: 'sofiane.meziane@ump.ac.ma',
      program: 'Software Engineering',
      group: 'Group 02',
      absences: 1,
      attendanceRate: 98,
      status: 'Regular',
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
      status: 'Warning',
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
      status: 'At Risk',
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
      status: 'Regular',
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
      status: 'Regular',
      variant: 'success',
      lastCheckIn: 'Today, 10:02',
    },
  ];

  readonly columns: readonly DataTableColumn<StudentRow>[] = [
    {
      id: 'student',
      header: 'Student',
      accessor: (student) => student.name,
      sortValue: (student) => student.name,
      filterValue: (student) => [student.name, student.email, student.group],
      width: '18rem',
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
      width: '10rem',
    },
    {
      id: 'attendanceRate',
      header: 'Attendance',
      accessor: (student) => student.attendanceRate,
      sortValue: (student) => student.attendanceRate,
      align: 'end',
      width: '10rem',
    },
    {
      id: 'absences',
      header: 'Absences',
      accessor: (student) => student.absences,
      sortValue: (student) => student.absences,
      align: 'end',
      width: '8rem',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (student) => student.status,
      align: 'end',
      width: '10rem',
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: () => '',
      sortable: false,
      searchable: false,
      hideable: false,
      align: 'end',
      width: '8rem',
    },
  ];
}
