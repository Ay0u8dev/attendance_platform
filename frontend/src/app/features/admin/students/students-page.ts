import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import {
  AdminDirectoryStatus,
  AdminImportResult,
  AdminStudentDto,
  accountStatus,
  accountState,
  fullName,
  initials,
  statusVariant,
} from '../../../core/admin/models/admin-user.model';
import { AdminStudentService } from '../../../core/admin/services/admin-student.service';
import { Button } from '../../../shared/components/button/button';
import { DataTable } from '../../../shared/components/data-table/data-table';
import { DataTableCellDef } from '../../../shared/components/data-table/data-table-cell-def';
import { DataTableColumn } from '../../../shared/components/data-table/data-table.types';
import { DeleteModal } from '../../../shared/components/delete-modal/delete-modal';
import { IconButton } from '../../../shared/components/button/icon-button';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';

interface StudentRow {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly pfpUrl: string | null;
  readonly numApogee: string;
  readonly status: AdminDirectoryStatus;
  readonly enabled: boolean;
  readonly firstLogin: boolean;
  readonly createdAt: string | null;
}

@Component({
  selector: 'app-students-page',
  imports: [
    ReactiveFormsModule,
    Button,
    DataTable,
    DataTableCellDef,
    DeleteModal,
    IconButton,
    Modal,
    PageHeader,
    StatusBadge,
  ],
  template: `
    <section class="space-y-5">
      <app-page-header
        title="Students"
        description="Manage student identities used by authentication, inscriptions, and attendance rosters."
        [meta]="students().length + ' students'"
      ></app-page-header>

      <div class="grid gap-3 md:grid-cols-3">
        @for (metric of metrics(); track metric.label) {
          <article class="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {{ metric.label }}
            </p>
            <p class="mt-2 text-2xl font-semibold text-principalText">{{ metric.value }}</p>
            <p class="mt-1 text-sm text-secondaryText">{{ metric.caption }}</p>
          </article>
        }
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-sm text-secondaryText">
          Showing {{ students().length }} student(s) from the user database.
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <input
            #studentImportInput
            type="file"
            accept=".xlsx"
            class="hidden"
            (change)="handleImportFile($event)"
          />
          <app-button
            label="Import Excel"
            icon="fa-regular fa-file-excel"
            variant="outline"
            [fullWidth]="false"
            [loading]="importing()"
            (clicked)="openImportPicker()"
          ></app-button>
          <app-button
            label="Add Student"
            icon="fa-solid fa-plus"
            [fullWidth]="false"
            (clicked)="openAddStudentModal()"
          ></app-button>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {{ errorMessage() }}
        </div>
      }

      <app-data-table
        title="Student list"
        description="Database-backed student accounts. Search by name, email, or Apogee number."
        caption="Students"
        searchPlaceholder="Search students by name, email or Apogee..."
        emptyStateTitle="No students found"
        emptyStateDescription="Create students or import an Excel file to populate the directory."
        [rows]="students()"
        [columns]="columns"
        [rowId]="rowId"
        [initialPageSize]="10"
        [showColumnFilters]="false"
        [showColumnVisibility]="false"
      >
        <ng-template [appDataTableCell]="'student'" let-row="row">
          <div class="flex min-w-0 items-center gap-4">
            <span
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-soft bg-gradient-to-br from-primary-soft to-surface text-sm font-semibold text-primary shadow-sm"
              aria-hidden="true"
            >
              {{ initials(row.name) }}
            </span>
            <div class="min-w-0">
              <p class="truncate text-[0.95rem] font-semibold text-principalText">{{ row.name }}</p>
              <p class="mt-0.5 truncate text-[0.8rem] text-secondaryText">{{ row.email }}</p>
            </div>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'apogee'" let-row="row">
          <span class="inline-flex rounded-xl border border-line bg-surface-subtle px-3 py-1.5 text-sm font-semibold text-principalText shadow-sm">
            {{ row.numApogee }}
          </span>
        </ng-template>

        <ng-template [appDataTableCell]="'status'" let-row="row">
          <app-status-badge
            [label]="row.status"
            [variant]="statusVariant(row.status)"
          ></app-status-badge>
        </ng-template>

        <ng-template [appDataTableCell]="'createdAt'" let-row="row">
          <span class="text-sm text-secondaryText">{{ formatDate(row.createdAt) }}</span>
        </ng-template>

        <ng-template [appDataTableCell]="'actions'" let-row="row">
          <div class="flex justify-end gap-2">
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
        <form [formGroup]="studentForm" class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">First name *</span>
            <input
              type="text"
              formControlName="firstName"
              class="w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Last name *</span>
            <input
              type="text"
              formControlName="lastName"
              class="w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
          </label>

          <label class="space-y-1 sm:col-span-2">
            <span class="text-sm font-medium text-principalText">Email *</span>
            <input
              type="email"
              formControlName="email"
              class="w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
            <span class="text-xs text-secondaryText">Use the school domain: @ump.ac.ma</span>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Apogee number *</span>
            <input
              type="text"
              formControlName="numApogee"
              class="w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Profile image URL</span>
            <input
              type="url"
              formControlName="pfpUrl"
              class="w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            />
          </label>

          <label class="space-y-1 sm:col-span-2">
            <span class="text-sm font-medium text-principalText">Account status *</span>
            <select
              formControlName="status"
              class="w-full rounded-xl border border-line bg-surface-subtle px-4 py-2.5 text-sm text-principalText outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-soft"
            >
              <option value="Pending">Pending - enabled, first login required</option>
              <option value="Active">Active - enabled account</option>
              <option value="Suspended">Suspended - disabled account</option>
            </select>
          </label>
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
          [disabled]="studentForm.invalid || saving()"
          [loading]="saving()"
          [fullWidth]="true"
          (clicked)="submitStudentForm()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="importResult() !== null"
      title="Student import summary"
      [description]="importStatusMessage(importResult())"
      size="lg"
      [showFooter]="false"
      (closed)="closeImportResult()"
    >
      <div modal-body>
        @if (importResult(); as result) {
          <div class="space-y-5">
            <div class="grid gap-3 sm:grid-cols-3">
              @for (metric of importMetrics(result); track metric.label) {
                <div class="rounded-2xl border border-line bg-surface-subtle px-4 py-3">
                  <p class="text-2xl font-semibold text-principalText">{{ metric.value }}</p>
                  <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{{ metric.label }}</p>
                </div>
              }
            </div>

            @if ((result.errors?.length ?? 0) > 0) {
              <section class="rounded-2xl border border-danger/20 bg-danger-soft p-4">
                <h3 class="font-semibold text-danger">Rows with errors</h3>
                <div class="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  @for (error of result.errors; track error.rowNumber + '-' + error.field + '-' + error.message) {
                    <p class="rounded-xl bg-surface px-3 py-2 text-sm text-principalText">
                      Row {{ error.rowNumber ?? '-' }}: {{ error.field ?? 'row' }} - {{ error.message ?? 'Import error' }}
                    </p>
                  }
                </div>
              </section>
            }

            @if ((result.warnings?.length ?? 0) > 0) {
              <section class="rounded-2xl border border-warning-soft bg-warning-soft p-4">
                <h3 class="font-semibold text-warning-strong">Warnings</h3>
                <div class="mt-3 max-h-48 space-y-2 overflow-y-auto">
                  @for (warning of result.warnings; track warning) {
                    <p class="rounded-xl bg-surface px-3 py-2 text-sm text-principalText">{{ warning }}</p>
                  }
                </div>
              </section>
            }
          </div>
        }
      </div>
    </app-modal>

    <app-delete-modal
      [open]="deleteOpen()"
      title="Delete this student?"
      [itemName]="selectedStudent()?.name || ''"
      confirmMessage="You are about to delete:"
      warningMessage="This calls the backend delete endpoint. Database relationships may block deletion if the student is referenced by inscriptions or attendance records."
      deleteButtonLabel="Delete student"
      (closeRequested)="closeDeleteStudentModal()"
      (confirmDelete)="confirmDeleteStudent()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage {
  private readonly fb = inject(FormBuilder);
  private readonly studentService = inject(AdminStudentService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('studentImportInput');

  readonly students = signal<readonly StudentRow[]>([]);
  readonly isLoading = signal(false);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly studentFormOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly selectedStudent = signal<StudentRow | null>(null);
  readonly editingStudentId = signal<number | null>(null);
  readonly importResult = signal<AdminImportResult | null>(null);
  readonly rowId = (row: StudentRow) => String(row.id);

  readonly studentForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: [
      '',
      [
        Validators.required,
        Validators.email,
        Validators.maxLength(254),
        Validators.pattern(/^[^\s@]+@ump\.ac\.ma$/i),
      ],
    ],
    numApogee: ['', [Validators.required, Validators.maxLength(30)]],
    pfpUrl: [''],
    status: ['Pending' as AdminDirectoryStatus, [Validators.required]],
  });

  readonly formTitle = computed(() => (this.editingStudentId() ? 'Edit student' : 'Add student'));
  readonly formDescription = computed(() =>
    this.editingStudentId()
      ? 'Update the database-backed student identity.'
      : 'Create a new student account in user-service.',
  );
  readonly formSubmitLabel = computed(() => (this.editingStudentId() ? 'Save changes' : 'Add student'));

  readonly metrics = computed(() => [
    {
      label: 'Active',
      value: this.students().filter((student) => student.status === 'Active').length,
      caption: 'enabled accounts',
    },
    {
      label: 'Pending',
      value: this.students().filter((student) => student.status === 'Pending').length,
      caption: 'first login pending',
    },
    {
      label: 'Suspended',
      value: this.students().filter((student) => student.status === 'Suspended').length,
      caption: 'disabled accounts',
    },
  ]);

  readonly columns: readonly DataTableColumn<StudentRow>[] = [
    {
      id: 'student',
      header: 'Student',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.email, row.numApogee, row.status],
      sortable: false,
      width: '22rem',
    },
    {
      id: 'apogee',
      header: 'Code Apogee',
      accessor: (row) => row.numApogee,
      sortable: false,
      width: '12rem',
    },
    {
      id: 'status',
      header: 'Account status',
      accessor: (row) => row.status,
      sortable: false,
      filter: {
        type: 'select',
        label: 'Status',
        placeholder: 'All statuses',
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Pending', value: 'Pending' },
          { label: 'Suspended', value: 'Suspended' },
        ],
      },
      width: '12rem',
    },
    {
      id: 'createdAt',
      header: 'Created',
      accessor: (row) => row.createdAt,
      sortable: false,
      width: '12rem',
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
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.studentService
      .getAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (students) => this.students.set(students.map((student) => this.toRow(student))),
        error: () => this.errorMessage.set('Unable to load students from user-service.'),
      });
  }

  openImportPicker(): void {
    this.importInput()?.nativeElement.click();
  }

  handleImportFile(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
      return;
    }

    const file = input.files[0];
    input.value = '';
    this.importing.set(true);
    this.studentService
      .importExcel(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importing.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.importResult.set(result);
          this.showImportToast('Student', result);
          this.loadStudents();
        },
        error: () => this.toast.error('Student import failed', 'Check the Excel format and backend logs.'),
      });
  }

  closeImportResult(): void {
    this.importResult.set(null);
  }

  importStatusMessage(result: AdminImportResult | null): string {
    if (!result) {
      return '';
    }
    if ((result.failedRows ?? 0) > 0 || (result.errors?.length ?? 0) > 0) {
      return 'Import completed with errors. Review the rows below before re-importing.';
    }
    if ((result.warnings?.length ?? 0) > 0) {
      return 'Import completed with warnings.';
    }
    return 'Import completed successfully.';
  }

  importMetrics(result: AdminImportResult): ReadonlyArray<{ readonly label: string; readonly value: number }> {
    return [
      { label: 'Total rows', value: result.totalRows ?? 0 },
      { label: 'Students created', value: result.createdStudents ?? result.studentsCreated ?? 0 },
      { label: 'Students updated', value: result.updatedStudents ?? result.studentsUpdated ?? 0 },
      { label: 'Inscriptions', value: result.createdInscriptions ?? result.inscriptionsCreated ?? 0 },
      { label: 'Duplicates', value: result.duplicateInscriptions ?? result.duplicatesSkipped ?? 0 },
      { label: 'Rejected', value: result.failedRows ?? result.rowsRejected ?? 0 },
      { label: 'Warnings', value: result.warningsCount ?? result.warnings?.length ?? 0 },
      { label: 'Errors', value: result.errorsCount ?? result.errors?.length ?? 0 },
    ];
  }

  private showImportToast(entity: string, result: AdminImportResult): void {
    const processed = result.successfulRows ?? 0;
    if ((result.failedRows ?? 0) > 0 || (result.errors?.length ?? 0) > 0) {
      this.toast.error(`${entity} import completed with errors`, `${processed} row(s) processed.`);
      return;
    }
    if ((result.warnings?.length ?? 0) > 0) {
      this.toast.warning(`${entity} import completed with warnings`, `${processed} row(s) processed.`);
      return;
    }
    this.toast.success(`${entity} import completed successfully`, `${processed} row(s) processed.`);
  }

  openAddStudentModal(): void {
    this.editingStudentId.set(null);
    this.studentForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      numApogee: '',
      pfpUrl: '',
      status: 'Pending',
    });
    this.studentFormOpen.set(true);
  }

  openEditStudentModal(student: StudentRow): void {
    this.editingStudentId.set(student.id);
    this.studentForm.reset({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      numApogee: student.numApogee,
      pfpUrl: student.pfpUrl ?? '',
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
    if (this.studentForm.invalid) {
      this.studentForm.markAllAsTouched();
      return;
    }

    const value = this.studentForm.getRawValue();
    const state = accountState(value.status);
    const payload = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      numApogee: value.numApogee.trim(),
      pfpUrl: value.pfpUrl.trim() || null,
      enabled: state.enabled,
      firstLogin: state.firstLogin,
    };

    const editingId = this.editingStudentId();
    const request = editingId
      ? this.studentService.update(editingId, payload)
      : this.studentService.create(payload);

    this.saving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(editingId ? 'Student updated' : 'Student created');
          this.closeStudentFormModal();
          this.loadStudents();
        },
        error: () => this.toast.error('Student save failed', 'Check validation and duplicate fields.'),
      });
  }

  openDeleteStudentModal(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.deleteOpen.set(true);
  }

  closeDeleteStudentModal(): void {
    this.deleteOpen.set(false);
    this.selectedStudent.set(null);
  }

  confirmDeleteStudent(): void {
    const student = this.selectedStudent();
    if (!student) {
      return;
    }

    this.studentService
      .delete(student.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Student deleted');
          this.closeDeleteStudentModal();
          this.loadStudents();
        },
        error: () =>
          this.toast.error('Delete failed', 'The student may be referenced by inscriptions or records.'),
      });
  }

  statusVariant(status: AdminDirectoryStatus): 'success' | 'warning' | 'error' | 'neutral' {
    return statusVariant(status);
  }

  initials(name: string): string {
    return initials(name);
  }

  formatDate(value: string | null): string {
    if (!value) {
      return 'Not available';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  private toRow(student: AdminStudentDto): StudentRow {
    const name = fullName(student.firstName, student.lastName) || student.email;
    return {
      id: student.id,
      name,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      pfpUrl: student.pfpUrl,
      numApogee: student.numApogee,
      enabled: student.enabled,
      firstLogin: student.firstLogin,
      status: accountStatus(student.enabled, student.firstLogin),
      createdAt: student.createdAt,
    };
  }
}
