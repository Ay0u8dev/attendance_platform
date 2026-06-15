import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  AdminDirectoryStore,
  DirectoryStatus,
  TeacherRecord,
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
  selector: 'app-teachers-page',
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
        title="Teachers"
        description="Manage the core teacher identity used by the attendance platform."
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
        title="Teacher list"
        description="Name, email, and account status."
        caption="Teachers"
        searchPlaceholder="Search teachers by name or email..."
        emptyStateTitle="No teachers found"
        emptyStateDescription="Try adjusting the search text or status filter."
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

          <div class="space-y-1">
            <app-dropdown-filter
              label="Status *"
              identifier="teacher-status"
              allLabel="Select status"
              [options]="statusOptions()"
              [value]="teacherFormValue('status')"
              iconClass="fa-solid fa-circle-check"
              iconBackgroundClass="bg-warning-soft"
              iconColor="warning"
              (filterChange)="setTeacherFormValue('status', $event)"
            ></app-dropdown-filter>
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

    <app-delete-modal
      [open]="deleteOpen()"
      title="Delete this teacher?"
      [itemName]="selectedTeacher()?.name || ''"
      confirmMessage="You are about to delete:"
      warningMessage="This removes the teacher identity and its current assignment from this interface data."
      deleteButtonLabel="Delete teacher"
      (closeRequested)="closeDeleteTeacherModal()"
      (confirmDelete)="confirmDeleteTeacher()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachersPage {
  private readonly fb = inject(FormBuilder);
  private readonly directory = inject(AdminDirectoryStore);

  readonly teachers = this.directory.teachers;
  readonly statuses = this.directory.statuses;
  readonly rowId = (row: TeacherRecord) => row.id;

  readonly teacherFormOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly selectedTeacher = signal<TeacherRecord | null>(null);
  readonly editingTeacherId = signal<string | null>(null);
  readonly teacherForm: FormGroup;

  readonly formTitle = computed(() =>
    this.editingTeacherId() ? 'Edit Teacher' : 'Add New Teacher',
  );
  readonly formDescription = computed(() =>
    this.editingTeacherId()
      ? 'Update name, email, and status.'
      : 'Fill in the core teacher information below.',
  );
  readonly formSubmitLabel = computed(() =>
    this.editingTeacherId() ? 'Save Changes' : 'Add Teacher',
  );
  readonly statusOptions = computed(() =>
    this.statuses.map((status) => ({ label: status, value: status })),
  );

  readonly columns: readonly DataTableColumn<TeacherRecord>[] = [
    {
      id: 'teacher',
      header: 'Name',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.email],
      width: '18rem',
    },
    {
      id: 'email',
      header: 'Email',
      accessor: (row) => row.email,
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
    this.teacherForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      status: ['Active', [Validators.required]],
    });
  }

  openAddTeacherModal(): void {
    this.editingTeacherId.set(null);
    this.teacherForm.reset({
      name: '',
      email: '',
      status: 'Active',
    });
    this.teacherFormOpen.set(true);
  }

  openEditTeacherModal(teacher: TeacherRecord): void {
    this.editingTeacherId.set(teacher.id);
    this.teacherForm.reset({
      name: teacher.name,
      email: teacher.email,
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
    const payload = {
      name: value.name,
      email: value.email,
      status: value.status as DirectoryStatus,
    };

    const editingId = this.editingTeacherId();
    if (editingId) {
      this.directory.updateTeacher(editingId, payload);
    } else {
      this.directory.addTeacher(payload);
    }

    this.closeTeacherFormModal();
  }

  openDeleteTeacherModal(teacher: TeacherRecord): void {
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

    this.directory.deleteTeacher(teacher.id);
    this.deleteOpen.set(false);
    this.selectedTeacher.set(null);
  }

  teacherFormValue(controlName: 'status'): string {
    return String(this.teacherForm.get(controlName)?.value ?? '');
  }

  setTeacherFormValue(controlName: 'status', value: string | null): void {
    this.teacherForm.patchValue({ [controlName]: value ?? '' });
    this.teacherForm.get(controlName)?.markAsTouched();
  }

  statusVariant(status: DirectoryStatus): 'success' | 'warning' | 'error' {
    return this.directory.statusVariant(status);
  }

  initials(name: string): string {
    return this.directory.initials(name);
  }
}
