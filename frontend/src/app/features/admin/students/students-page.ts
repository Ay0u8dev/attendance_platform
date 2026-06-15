import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  AdminDirectoryStore,
  DirectoryStatus,
  StudentRecord,
} from '../admin-directory.store';
import { Button } from '../../../shared/components/button/button';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { DeleteModal } from '../../../shared/components/delete-modal/delete-modal';
import { DropdownFilter } from '../../../shared/components/dropdown-filter/dropdown-filter';
import { IconButton } from '../../../shared/components/button/icon-button';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-students-page',
  imports: [
    ReactiveFormsModule,
    Button,
    DataTable,
    DataTableCellDef,
    DeleteModal,
    DropdownFilter,
    IconButton,
    Modal,
    PageHeader,
    StatusBadge,
  ],
  template: `
    <section class="space-y-5">
      <app-page-header
        title="Students"
        description="Manage the core student identity used by the attendance platform."
        [meta]="students().length + ' students'"
      ></app-page-header>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-secondaryText">Showing {{ students().length }} students</p>

        <div class="flex flex-wrap items-center gap-2">
          <app-button
            label="Import Excel"
            icon="fa-regular fa-file-excel"
            variant="outline"
            [fullWidth]="false"
          ></app-button>
          <app-button
            label="Add Student"
            icon="fa-solid fa-plus"
            [fullWidth]="false"
            (clicked)="openAddStudentModal()"
          ></app-button>
        </div>
      </div>

      <app-data-table
        title="Student list"
        description="Name, email, Code Apogee, and account status."
        caption="Students"
        searchPlaceholder="Search students by name, email or Code Apogee..."
        emptyStateTitle="No students found"
        emptyStateDescription="Try adjusting the search text or status filter."
        [rows]="students()"
        [columns]="columns"
        [rowId]="rowId"
        [initialPageSize]="5"
      >
        <ng-template [appDataTableCell]="'student'" let-row="row">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary"
              aria-hidden="true"
            >
              {{ initials(row.name) }}
            </span>
            <p class="truncate font-medium text-principalText">{{ row.name }}</p>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'status'" let-row="row">
          <app-status-badge
            [label]="row.status"
            [variant]="statusVariant(row.status)"
          ></app-status-badge>
        </ng-template>

        <ng-template [appDataTableCell]="'actions'" let-row="row">
          <div class="flex justify-end gap-1.5">
            <app-icon-button
              icon="fa-regular fa-pen-to-square"
              [label]="'Edit ' + row.name"
              tone="primary"
              size="sm"
              (click)="openEditStudentModal(row)"
            ></app-icon-button>
            <app-icon-button
              icon="fa-regular fa-trash-can"
              [label]="'Delete ' + row.name"
              tone="danger"
              size="sm"
              (click)="openDeleteStudentModal(row)"
            ></app-icon-button>
          </div>
        </ng-template>
      </app-data-table>
    </section>

    <app-modal
      [open]="studentFormOpen()"
      [title]="formTitle()"
      [description]="formDescription()"
      size="md"
      (closed)="closeStudentFormModal()"
    >
      <div modal-body>
        <form [formGroup]="studentForm" class="space-y-4">
          <div class="space-y-1">
            <label for="student-name" class="text-sm font-medium text-principalText">Name *</label>
            <input
              id="student-name"
              type="text"
              formControlName="name"
              placeholder="Enter student name"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="space-y-1">
            <label for="student-email" class="text-sm font-medium text-principalText">Email *</label>
            <input
              id="student-email"
              type="email"
              formControlName="email"
              placeholder="Enter student email"
              class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1">
              <label for="student-code-apogee" class="text-sm font-medium text-principalText">
                Code Apogee *
              </label>
              <input
                id="student-code-apogee"
                type="text"
                formControlName="codeApogee"
                placeholder="A10001"
                class="w-full rounded-lg border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div class="space-y-1">
              <app-dropdown-filter
                label="Status *"
                identifier="student-status"
                allLabel="Select status"
                [options]="statusOptions()"
                [value]="studentFormValue('status')"
                iconClass="fa-solid fa-circle-check"
                iconBackgroundClass="bg-warning-soft"
                iconColor="warning"
                (filterChange)="setStudentFormValue('status', $event)"
              ></app-dropdown-filter>
            </div>
          </div>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <app-button
          label="Cancel"
          variant="outline"
          [fullWidth]="true"
          (clicked)="closeStudentFormModal()"
        ></app-button>
        <app-button
          [label]="formSubmitLabel()"
          [disabled]="!studentForm.valid"
          [fullWidth]="true"
          (clicked)="submitStudentForm()"
        ></app-button>
      </div>
    </app-modal>

    <app-delete-modal
      [open]="deleteOpen()"
      title="Delete this student?"
      [itemName]="selectedStudent()?.name || ''"
      confirmMessage="You are about to delete:"
      warningMessage="This removes the student identity and its current inscription assignment from this interface data."
      deleteButtonLabel="Delete student"
      (closeRequested)="closeDeleteStudentModal()"
      (confirmDelete)="confirmDeleteStudent()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage {
  private readonly fb = inject(FormBuilder);
  private readonly directory = inject(AdminDirectoryStore);

  readonly students = this.directory.students;
  readonly statuses = this.directory.statuses;
  readonly rowId = (row: StudentRecord) => row.id;

  readonly studentFormOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly selectedStudent = signal<StudentRecord | null>(null);
  readonly editingStudentId = signal<string | null>(null);
  readonly studentForm: FormGroup;

  readonly formTitle = computed(() =>
    this.editingStudentId() ? 'Edit Student' : 'Add New Student',
  );
  readonly formDescription = computed(() =>
    this.editingStudentId()
      ? 'Update name, email, Code Apogee, and status.'
      : 'Fill in the core student information below.',
  );
  readonly formSubmitLabel = computed(() =>
    this.editingStudentId() ? 'Save Changes' : 'Add Student',
  );
  readonly statusOptions = computed(() =>
    this.statuses.map((status) => ({ label: status, value: status })),
  );

  readonly columns: readonly DataTableColumn<StudentRecord>[] = [
    {
      id: 'student',
      header: 'Name',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.email, row.codeApogee],
      width: '18rem',
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.email,
      cellClassName: 'whitespace-nowrap',
    },
    {
      id: 'codeApogee',
      header: 'Code Apogee',
      accessor: (row) => row.codeApogee,
      cellClassName: 'whitespace-nowrap',
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
      width: '7rem',
    },
  ];

  constructor() {
    this.studentForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      codeApogee: ['', [Validators.required]],
      status: ['Active', [Validators.required]],
    });
  }

  openAddStudentModal(): void {
    this.editingStudentId.set(null);
    this.studentForm.reset({
      name: '',
      email: '',
      codeApogee: '',
      status: 'Active',
    });
    this.studentFormOpen.set(true);
  }

  openEditStudentModal(student: StudentRecord): void {
    this.editingStudentId.set(student.id);
    this.studentForm.reset({
      name: student.name,
      email: student.email,
      codeApogee: student.codeApogee,
      status: student.status,
    });
    this.studentFormOpen.set(true);
  }

  closeStudentFormModal(): void {
    this.studentFormOpen.set(false);
    this.editingStudentId.set(null);
    this.studentForm.reset();
  }

  submitStudentForm(): void {
    if (!this.studentForm.valid) {
      return;
    }

    const value = this.studentForm.value;
    const payload = {
      name: value.name,
      email: value.email,
      codeApogee: value.codeApogee,
      status: value.status as DirectoryStatus,
    };

    const editingId = this.editingStudentId();
    if (editingId) {
      this.directory.updateStudent(editingId, payload);
    } else {
      this.directory.addStudent(payload);
    }

    this.closeStudentFormModal();
  }

  openDeleteStudentModal(student: StudentRecord): void {
    this.selectedStudent.set(student);
    this.deleteOpen.set(true);
  }

  closeDeleteStudentModal(): void {
    this.deleteOpen.set(false);
  }

  confirmDeleteStudent(): void {
    const student = this.selectedStudent();
    if (!student) {
      return;
    }

    this.directory.deleteStudent(student.id);
    this.deleteOpen.set(false);
    this.selectedStudent.set(null);
  }

  studentFormValue(controlName: 'status'): string {
    return String(this.studentForm.get(controlName)?.value ?? '');
  }

  setStudentFormValue(controlName: 'status', value: string | null): void {
    this.studentForm.patchValue({ [controlName]: value ?? '' });
    this.studentForm.get(controlName)?.markAsTouched();
  }

  statusVariant(status: DirectoryStatus): 'success' | 'warning' | 'error' {
    return this.directory.statusVariant(status);
  }

  initials(name: string): string {
    return this.directory.initials(name);
  }
}
