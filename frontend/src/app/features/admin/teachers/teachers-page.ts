import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { Button } from '../../../shared/components/button/button';
import { IconButton } from '../../../shared/components/button/icon-button';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { DeleteModal } from '../../../shared/components/delete-modal/delete-modal';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

type TeacherStatus = 'Active' | 'Pending review' | 'Suspended';
type TeacherStatusVariant = 'success' | 'warning' | 'error';
type TeacherPrivilege = 'Teacher' | 'Coordinator' | 'Admin';
type TeacherProfile = 'Permanent' | 'Vacataire' | 'Guest';

type Teacher = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly department: string;
  readonly modules: readonly string[];
  readonly privilege: TeacherPrivilege;
  readonly profile: TeacherProfile;
  readonly status: TeacherStatus;
  readonly variant: TeacherStatusVariant;
  readonly avatar: string;
};

@Component({
  selector: 'app-teachers-page',
  imports: [
    ReactiveFormsModule,
    Button,
    IconButton,
    DataTable,
    DataTableCellDef,
    DeleteModal,
    Modal,
    PageHeader,
    StatusBadge,
  ],
  template: `
    <section class="space-y-5">
      <app-page-header
        title="Teachers"
        description="Manage teaching staff, assigned modules, and attendance approval privileges."
        [meta]="teachers().length + ' teachers'"
      ></app-page-header>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-secondaryText">Showing {{ teachers().length }} teachers</p>

        <div class="flex flex-wrap items-center gap-2">
          <app-button
            label="Import Excel"
            icon="fa-regular fa-file-excel"
            variant="outline"
            [fullWidth]="false"
          ></app-button>
          <app-button
            label="Add Teacher"
            icon="fa-solid fa-plus"
            [fullWidth]="false"
            (clicked)="openAddTeacherModal()"
          ></app-button>
        </div>
      </div>

      <app-data-table
        title="Teaching roster"
        description="Search, filter, and manage teacher profiles before connecting backend CRUD."
        caption="Academic staff"
        searchPlaceholder="Search teachers by name, email, department or module..."
        emptyStateTitle="No teachers found"
        emptyStateDescription="Try adjusting the search text, department, privilege, profile, or status filters."
        [rows]="teachers()"
        [columns]="columns"
        [rowId]="rowId"
        [initialPageSize]="5"
      >
        <ng-template [appDataTableCell]="'teacher'" let-row="row">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {{ row.avatar }}
            </span>
            <div class="min-w-0">
              <p class="truncate font-medium text-principalText">{{ row.name }}</p>
              <p class="truncate text-xs text-secondaryText">{{ row.id }}</p>
            </div>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'modules'" let-row="row">
          <p class="max-w-64 truncate text-sm text-principalText">
            {{ row.modules.join(', ') }}
          </p>
        </ng-template>

        <ng-template [appDataTableCell]="'status'" let-row="row">
          <app-status-badge [label]="row.status" [variant]="row.variant"></app-status-badge>
        </ng-template>

        <ng-template [appDataTableCell]="'actions'" let-row="row">
          <div class="flex justify-end gap-1.5">
            <app-icon-button
              icon="fa-regular fa-eye"
              [label]="'View ' + row.name"
              tone="secondary"
              size="sm"
              (click)="openDetails(row)"
            ></app-icon-button>
            <app-icon-button
              icon="fa-regular fa-pen-to-square"
              [label]="'Edit ' + row.name"
              tone="primary"
              size="sm"
              (click)="openEditTeacherModal(row)"
            ></app-icon-button>
            <app-icon-button
              icon="fa-regular fa-trash-can"
              [label]="'Delete ' + row.name"
              tone="danger"
              size="sm"
              (click)="openDeleteTeacherModal(row)"
            ></app-icon-button>
          </div>
        </ng-template>
      </app-data-table>
    </section>

    <app-modal
      [open]="teacherFormOpen()"
      [title]="formTitle()"
      [description]="formDescription()"
      size="md"
      (closed)="closeTeacherFormModal()"
    >
      <div modal-body>
        <form [formGroup]="teacherForm" class="space-y-4">
          <div class="space-y-1">
            <label for="teacher-name" class="text-sm font-medium text-principalText">Name *</label>
            <input
              id="teacher-name"
              type="text"
              formControlName="name"
              placeholder="Enter teacher name"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="space-y-1">
            <label for="teacher-email" class="text-sm font-medium text-principalText">Email *</label>
            <input
              id="teacher-email"
              type="email"
              formControlName="email"
              placeholder="Enter teacher email"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <label for="teacher-department" class="text-sm font-medium text-principalText">
                Department *
              </label>
              <select
                id="teacher-department"
                formControlName="department"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select Department</option>
                @for (department of departments; track department) {
                  <option [value]="department">{{ department }}</option>
                }
              </select>
            </div>

            <div class="space-y-1">
              <label for="teacher-profile" class="text-sm font-medium text-principalText">
                Profile *
              </label>
              <select
                id="teacher-profile"
                formControlName="profile"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                @for (profile of profiles; track profile) {
                  <option [value]="profile">{{ profile }}</option>
                }
              </select>
            </div>
          </div>

          <div class="space-y-1">
            <label for="teacher-modules" class="text-sm font-medium text-principalText">
              Assigned modules *
            </label>
            <input
              id="teacher-modules"
              type="text"
              formControlName="modules"
              placeholder="Advanced Algorithms, Data Structures"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <label for="teacher-privilege" class="text-sm font-medium text-principalText">
                Privilege *
              </label>
              <select
                id="teacher-privilege"
                formControlName="privilege"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                @for (privilege of privileges; track privilege) {
                  <option [value]="privilege">{{ privilege }}</option>
                }
              </select>
            </div>

            <div class="space-y-1">
              <label for="teacher-status" class="text-sm font-medium text-principalText">
                Status *
              </label>
              <select
                id="teacher-status"
                formControlName="status"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                @for (status of statuses; track status) {
                  <option [value]="status">{{ status }}</option>
                }
              </select>
            </div>
          </div>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <app-button
          label="Cancel"
          variant="outline"
          [fullWidth]="true"
          (clicked)="closeTeacherFormModal()"
        ></app-button>
        <app-button
          [label]="formSubmitLabel()"
          [disabled]="!teacherForm.valid"
          [fullWidth]="true"
          (clicked)="submitTeacherForm()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="detailsOpen()"
      title="Teacher profile"
      description="Teacher information, privileges, and assigned modules."
      size="md"
      (closed)="closeDetails()"
    >
      @if (selectedTeacher(); as teacher) {
        <div modal-body class="space-y-4">
          <div class="flex items-start justify-between gap-3 rounded-xl border border-line p-4">
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
              >
                {{ teacher.avatar }}
              </span>
              <div class="min-w-0">
                <p class="truncate font-semibold text-principalText">{{ teacher.name }}</p>
                <p class="truncate text-sm text-secondaryText">{{ teacher.email }}</p>
              </div>
            </div>
            <app-status-badge [label]="teacher.status" [variant]="teacher.variant"></app-status-badge>
          </div>

          <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div class="rounded-xl border border-line p-3">
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Department</dt>
              <dd class="mt-1 text-principalText">{{ teacher.department }}</dd>
            </div>
            <div class="rounded-xl border border-line p-3">
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Profile</dt>
              <dd class="mt-1 text-principalText">{{ teacher.profile }}</dd>
            </div>
            <div class="rounded-xl border border-line p-3">
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Privilege</dt>
              <dd class="mt-1 text-principalText">{{ teacher.privilege }}</dd>
            </div>
            <div class="rounded-xl border border-line p-3">
              <dt class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Teacher ID</dt>
              <dd class="mt-1 text-principalText">{{ teacher.id }}</dd>
            </div>
          </dl>

          <div class="rounded-xl border border-line p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Assigned modules
            </p>
            <p class="mt-1 text-sm text-principalText">{{ teacher.modules.join(', ') }}</p>
          </div>
        </div>
      }

      <div modal-footer class="flex justify-end">
        <app-button
          label="Close"
          variant="outline"
          [fullWidth]="false"
          (clicked)="closeDetails()"
        ></app-button>
      </div>
    </app-modal>

    <app-delete-modal
      [open]="deleteOpen()"
      title="Delete this teacher?"
      [itemName]="selectedTeacher()?.name || ''"
      confirmMessage="You are about to delete:"
      warningMessage="This only removes the teacher from the current interface data until backend CRUD is connected."
      deleteButtonLabel="Delete teacher"
      (closeRequested)="closeDeleteTeacherModal()"
      (confirmDelete)="confirmDeleteTeacher()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachersPage {
  readonly rowId = (row: Teacher) => row.id;
  readonly teachers = signal<Teacher[]>(this.buildSampleTeachers());
  readonly teacherFormOpen = signal(false);
  readonly detailsOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly selectedTeacher = signal<Teacher | null>(null);
  readonly editingTeacherId = signal<string | null>(null);
  readonly teacherForm: FormGroup;

  readonly departments = ['Computer Science', 'Mathematics', 'Physics', 'Economics', 'Engineering'];
  readonly privileges: readonly TeacherPrivilege[] = ['Teacher', 'Coordinator', 'Admin'];
  readonly profiles: readonly TeacherProfile[] = ['Permanent', 'Vacataire', 'Guest'];
  readonly statuses: readonly TeacherStatus[] = ['Active', 'Pending review', 'Suspended'];

  readonly formTitle = computed(() =>
    this.editingTeacherId() ? 'Edit Teacher' : 'Add New Teacher',
  );
  readonly formDescription = computed(() =>
    this.editingTeacherId()
      ? 'Update teacher profile, modules, and privileges.'
      : 'Fill in the teacher information below.',
  );
  readonly formSubmitLabel = computed(() => (this.editingTeacherId() ? 'Save Changes' : 'Add Teacher'));

  readonly columns: readonly DataTableColumn<Teacher>[] = [
    {
      id: 'teacher',
      header: 'Name',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.email, row.id],
      width: '18rem',
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.email,
      cellClassName: 'whitespace-nowrap',
    },
    {
      id: 'department',
      header: 'Department',
      accessor: (row) => row.department,
      filter: {
        type: 'select',
        options: this.departments.map((department) => ({ label: department, value: department })),
      },
    },
    {
      id: 'modules',
      header: 'Modules',
      accessor: (row) => row.modules,
      filterValue: (row) => row.modules,
      sortable: false,
      width: '18rem',
    },
    {
      id: 'privilege',
      header: 'Privilege',
      accessor: (row) => row.privilege,
      filter: {
        type: 'select',
        options: this.privileges.map((privilege) => ({ label: privilege, value: privilege })),
      },
    },
    {
      id: 'profile',
      header: 'Profile',
      accessor: (row) => row.profile,
      filter: {
        type: 'select',
        options: this.profiles.map((profile) => ({ label: profile, value: profile })),
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.status,
      filter: {
        type: 'select',
        options: this.statuses.map((status) => ({ label: status, value: status })),
      },
      width: '11rem',
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: () => '',
      searchable: false,
      sortable: false,
      hideable: false,
      align: 'end',
      width: '9rem',
    },
  ];

  constructor(private readonly fb: FormBuilder) {
    this.teacherForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      department: ['', [Validators.required]],
      modules: ['', [Validators.required]],
      privilege: ['Teacher', [Validators.required]],
      profile: ['Permanent', [Validators.required]],
      status: ['Active', [Validators.required]],
    });
  }

  openAddTeacherModal(): void {
    this.editingTeacherId.set(null);
    this.teacherForm.reset({
      name: '',
      email: '',
      department: '',
      modules: '',
      privilege: 'Teacher',
      profile: 'Permanent',
      status: 'Active',
    });
    this.teacherFormOpen.set(true);
  }

  openEditTeacherModal(teacher: Teacher): void {
    this.editingTeacherId.set(teacher.id);
    this.teacherForm.reset({
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      modules: teacher.modules.join(', '),
      privilege: teacher.privilege,
      profile: teacher.profile,
      status: teacher.status,
    });
    this.teacherFormOpen.set(true);
  }

  closeTeacherFormModal(): void {
    this.teacherFormOpen.set(false);
    this.editingTeacherId.set(null);
    this.teacherForm.reset();
  }

  submitTeacherForm(): void {
    if (!this.teacherForm.valid) {
      return;
    }

    const value = this.teacherForm.value;
    const teacher: Teacher = {
      id: this.editingTeacherId() ?? `TCH-${1000 + this.teachers().length}`,
      name: value.name,
      email: value.email,
      department: value.department,
      modules: this.parseModules(value.modules),
      privilege: value.privilege as TeacherPrivilege,
      profile: value.profile as TeacherProfile,
      status: value.status as TeacherStatus,
      variant: this.getStatusVariant(value.status),
      avatar: this.initials(value.name),
    };

    if (this.editingTeacherId()) {
      this.teachers.update((teachers) =>
        teachers.map((current) => (current.id === teacher.id ? teacher : current)),
      );
    } else {
      this.teachers.update((teachers) => [...teachers, teacher]);
    }

    this.closeTeacherFormModal();
  }

  openDetails(teacher: Teacher): void {
    this.selectedTeacher.set(teacher);
    this.detailsOpen.set(true);
  }

  closeDetails(): void {
    this.detailsOpen.set(false);
  }

  openDeleteTeacherModal(teacher: Teacher): void {
    this.selectedTeacher.set(teacher);
    this.deleteOpen.set(true);
  }

  closeDeleteTeacherModal(): void {
    this.deleteOpen.set(false);
  }

  confirmDeleteTeacher(): void {
    const teacher = this.selectedTeacher();
    if (!teacher) {
      return;
    }

    this.teachers.update((teachers) => teachers.filter((current) => current.id !== teacher.id));
    this.deleteOpen.set(false);
    this.selectedTeacher.set(null);
  }

  private buildSampleTeachers(): Teacher[] {
    const seeds: Array<Omit<Teacher, 'avatar' | 'id' | 'variant'>> = [
      {
        name: 'Dr. Robert Chen',
        email: 'r.chen@university.edu',
        department: 'Computer Science',
        modules: ['Advanced Algorithms', 'Data Structures'],
        privilege: 'Coordinator',
        profile: 'Permanent',
        status: 'Active',
      },
      {
        name: 'Sarah Jenkins',
        email: 's.jenkins@university.edu',
        department: 'Economics',
        modules: ['Macro Analysis', 'Economic Policy'],
        privilege: 'Teacher',
        profile: 'Vacataire',
        status: 'Pending review',
      },
      {
        name: 'Prof. Marcus Thorne',
        email: 'm.thorne@university.edu',
        department: 'Physics',
        modules: ['Quantum Mechanics', 'Lab Supervision'],
        privilege: 'Teacher',
        profile: 'Permanent',
        status: 'Active',
      },
      {
        name: 'Dr. Nadia El Amrani',
        email: 'n.elamrani@university.edu',
        department: 'Mathematics',
        modules: ['Linear Algebra', 'Statistics'],
        privilege: 'Admin',
        profile: 'Permanent',
        status: 'Active',
      },
      {
        name: 'Youssef Belkadi',
        email: 'y.belkadi@university.edu',
        department: 'Engineering',
        modules: ['Embedded Systems'],
        privilege: 'Teacher',
        profile: 'Guest',
        status: 'Suspended',
      },
      {
        name: 'Dr. Lina Moreau',
        email: 'l.moreau@university.edu',
        department: 'Computer Science',
        modules: ['Web Architecture', 'Cloud Platforms'],
        privilege: 'Coordinator',
        profile: 'Permanent',
        status: 'Active',
      },
    ];

    return seeds.map((seed, index) => ({
      ...seed,
      id: `TCH-${1000 + index}`,
      variant: this.getStatusVariant(seed.status),
      avatar: this.initials(seed.name),
    }));
  }

  private getStatusVariant(status: string): TeacherStatusVariant {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending review':
        return 'warning';
      case 'Suspended':
        return 'error';
      default:
        return 'success';
    }
  }

  private parseModules(value: string): readonly string[] {
    return value
      .split(',')
      .map((module) => module.trim())
      .filter(Boolean);
  }

  private initials(name: string): string {
    return name
      .split(' ')
      .filter((part) => !['dr.', 'prof.'].includes(part.toLowerCase()))
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
