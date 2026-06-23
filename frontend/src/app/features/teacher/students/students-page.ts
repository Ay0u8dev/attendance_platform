import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';

import { StudentUser } from '../../../core/users/models/student.model';
import { StudentUserService } from '../../../core/users/services/student-user.service';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

type StudentStatusVariant = 'success' | 'warning' | 'error';

type StudentRow = {
  readonly name: string;
  readonly email: string;
  readonly apogee: string;
  readonly lastSeen: string;
  readonly status: string;
  readonly variant: StudentStatusVariant;
};

@Component({
  selector: 'app-teacher-students-page',
  standalone: true,
  imports: [PageHeader, DataTable, DataTableCellDef, StatusBadge],
  templateUrl: './students-page.html',
  styleUrl: './students-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherStudentsPage implements OnInit {
  private readonly studentService = inject(StudentUserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly students = signal<StudentRow[]>([]);
  readonly selectedGroupName = signal<string | null>(null);

  readonly studentRowId = (student: StudentRow) => student.email;

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const groupId = Number(params.get('groupId'));
      this.selectedGroupName.set(params.get('groupName'));

      if (Number.isFinite(groupId) && groupId > 0) {
        this.loadStudentsByGroupe(groupId);
      } else {
        this.loadStudents();
      }
    });
  }

  loadStudents(): void {
    this.loading.set(true);
    this.error.set(null);

    this.studentService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (students) => this.students.set(students.map((student) => this.toRow(student))),
        error: () => this.error.set('Impossible de charger les étudiants.'),
      });
  }

  loadStudentsByGroupe(groupeId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.studentService
      .getByGroupeId(groupeId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (students) => this.students.set(students.map((student) => this.toRow(student))),
        error: () => this.error.set('Impossible de charger les etudiants de ce groupe.'),
      });
  }

  openHistory(): void {
    this.router.navigate(['/teacher/sessions']);
  }

  messageStudent(row: StudentRow): void {
    window.location.href = `mailto:${row.email}`;
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  private toRow(student: StudentUser): StudentRow {
    const lastSeen = student.updatedAt
      ? new Date(student.updatedAt).toLocaleDateString()
      : 'Jamais';
    const isActive = student.updatedAt
      ? Date.now() - new Date(student.updatedAt).getTime() < 1000 * 60 * 60 * 24 * 30
      : false;

    return {
      name: `${student.firstName} ${student.lastName}`.trim(),
      email: student.email,
      apogee: student.numApogee,
      lastSeen,
      status: student.enabled ? (isActive ? 'Actif' : 'Inactif') : 'Désactivé',
      variant: student.enabled ? (isActive ? 'success' : 'warning') : 'error',
    };
  }

  readonly columns: readonly DataTableColumn<StudentRow>[] = [
    {
      id: 'student',
      header: 'Étudiant',
      accessor: (student) => student.name,
      sortValue: (student) => student.name,
      filterValue: (student) => [student.name, student.email, student.apogee],
      width: '18rem',
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (student) => student.email,
      sortValue: (student) => student.email,
      width: '15rem',
    },
    {
      id: 'apogee',
      header: 'Numéro Apogée',
      accessor: (student) => student.apogee,
      width: '12rem',
    },
    {
      id: 'lastSeen',
      header: 'Dernière activité',
      accessor: (student) => student.lastSeen,
      width: '12rem',
    },
    {
      id: 'status',
      header: 'Statut',
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
