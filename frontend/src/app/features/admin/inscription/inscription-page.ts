import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import {
  AdminDirectoryStore,
  StudentRecord,
  TeacherAssignmentPayload,
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

type InscriptionSection = 'students' | 'teachers';

@Component({
  selector: 'app-inscription-page',
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
  ],
  template: `
    <section class="space-y-5">
      <app-page-header
        title="Inscription"
        description="Assign students to cycles, years, and groups, and assign teachers to modules and groups."
        [meta]="inscriptionMeta()"
      ></app-page-header>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          class="inline-flex rounded-xl border border-line bg-surface p-1 shadow-card"
          aria-label="Inscription section"
        >
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            [class.bg-primary]="activeSection() === 'students'"
            [class.text-white]="activeSection() === 'students'"
            [class.text-secondaryText]="activeSection() !== 'students'"
            [class.hover:bg-surface-subtle]="activeSection() !== 'students'"
            (click)="setSection('students')"
          >
            <i class="fa-solid fa-user-graduate" aria-hidden="true"></i>
            Students
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            [class.bg-primary]="activeSection() === 'teachers'"
            [class.text-white]="activeSection() === 'teachers'"
            [class.text-secondaryText]="activeSection() !== 'teachers'"
            [class.hover:bg-surface-subtle]="activeSection() !== 'teachers'"
            (click)="setSection('teachers')"
          >
            <i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i>
            Teachers
          </button>
        </div>

        <app-button
          [label]="activeSection() === 'students' ? 'Assign Student' : 'Assign Teacher'"
          icon="fa-solid fa-plus"
          [fullWidth]="false"
          (clicked)="openCreateAssignmentModal()"
        ></app-button>
      </div>

      @if (activeSection() === 'students') {
        <app-data-table
          title="Student inscriptions"
          description="Student name with school inscription information."
          caption="Student assignments"
          searchPlaceholder="Search students by name, group, cycle, or year..."
          emptyStateTitle="No students available"
          emptyStateDescription="Create students first, then assign their inscription details here."
          [rows]="students()"
          [columns]="studentColumns"
          [rowId]="studentRowId"
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

          <ng-template [appDataTableCell]="'cycle'" let-row="row">
            <span class="text-sm text-principalText">{{ row.cycle || 'Not assigned' }}</span>
          </ng-template>

          <ng-template [appDataTableCell]="'year'" let-row="row">
            <span class="text-sm text-principalText">{{ row.year || 'Not assigned' }}</span>
          </ng-template>

          <ng-template [appDataTableCell]="'group'" let-row="row">
            <span class="text-sm text-principalText">{{ row.group || 'Not assigned' }}</span>
          </ng-template>

          <ng-template [appDataTableCell]="'studentActions'" let-row="row">
            <div class="flex justify-end gap-1.5">
              <app-icon-button
                icon="fa-regular fa-pen-to-square"
                [label]="'Edit inscription for ' + row.name"
                tone="primary"
                size="sm"
                (click)="openEditStudentAssignmentModal(row)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                [label]="'Clear inscription for ' + row.name"
                tone="danger"
                size="sm"
                [disabled]="!hasStudentInscription(row)"
                (click)="openClearStudentAssignmentModal(row)"
              ></app-icon-button>
            </div>
          </ng-template>
        </app-data-table>
      } @else {
        <app-data-table
          title="Teacher assignments"
          description="Teacher name with assigned modules and groups."
          caption="Teacher assignments"
          searchPlaceholder="Search teachers by name, module, or group..."
          emptyStateTitle="No teachers available"
          emptyStateDescription="Create teachers first, then assign their teaching information here."
          [rows]="teachers()"
          [columns]="teacherColumns"
          [rowId]="teacherRowId"
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

          <ng-template [appDataTableCell]="'teacherModules'" let-row="row">
            <p class="max-w-72 truncate text-sm text-principalText">
              {{ formatModules(row.modules) }}
            </p>
          </ng-template>

          <ng-template [appDataTableCell]="'teacherGroups'" let-row="row">
            <p class="max-w-56 truncate text-sm text-principalText">
              {{ formatGroups(row.groups) }}
            </p>
          </ng-template>

          <ng-template [appDataTableCell]="'teacherActions'" let-row="row">
            <div class="flex justify-end gap-1.5">
              <app-icon-button
                icon="fa-regular fa-pen-to-square"
                [label]="'Edit assignment for ' + row.name"
                tone="primary"
                size="sm"
                (click)="openEditTeacherAssignmentModal(row)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                [label]="'Clear assignment for ' + row.name"
                tone="danger"
                size="sm"
                [disabled]="!hasTeacherAssignment(row)"
                (click)="openClearTeacherAssignmentModal(row)"
              ></app-icon-button>
            </div>
          </ng-template>
        </app-data-table>
      }
    </section>

    <app-modal
      [open]="studentAssignmentOpen()"
      [title]="studentAssignmentTitle()"
      description="Assign an existing student to a cycle, academic year, and group."
      size="md"
      (closed)="closeStudentAssignmentModal()"
    >
      <div modal-body>
        <form [formGroup]="studentAssignmentForm" class="space-y-6">
          <app-dropdown-filter
            label="Student *"
            identifier="assignment-student"
            allLabel="Select student"
            [options]="studentOptions()"
            [value]="studentAssignmentValue('studentId')"
            iconClass="fa-solid fa-user-graduate"
            iconBackgroundClass="bg-primary-soft"
            (filterChange)="setStudentAssignmentValue('studentId', $event)"
          ></app-dropdown-filter>

          <div class="grid gap-x-5 gap-y-6 pt-2 sm:grid-cols-2">
            <app-dropdown-filter
              label="Cycle *"
              identifier="assignment-cycle"
              allLabel="Select cycle"
              [options]="cycleDropdownOptions()"
              [value]="studentAssignmentValue('cycle')"
              iconClass="fa-solid fa-graduation-cap"
              iconBackgroundClass="bg-secondary-soft"
              iconColor="secondary"
              (filterChange)="setStudentAssignmentValue('cycle', $event)"
            ></app-dropdown-filter>

            <app-dropdown-filter
              label="Year *"
              identifier="assignment-year"
              allLabel="Select year"
              [options]="yearDropdownOptions()"
              [value]="studentAssignmentValue('year')"
              iconClass="fa-regular fa-calendar"
              iconBackgroundClass="bg-warning-soft"
              iconColor="warning"
              (filterChange)="setStudentAssignmentValue('year', $event)"
            ></app-dropdown-filter>
          </div>

          <app-dropdown-filter
            label="Group *"
            identifier="assignment-group"
            allLabel="Select group"
            [options]="groupDropdownOptions()"
            [value]="studentAssignmentValue('group')"
            iconClass="fa-solid fa-users"
            iconBackgroundClass="bg-primary-soft"
            (filterChange)="setStudentAssignmentValue('group', $event)"
          ></app-dropdown-filter>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <app-button
          label="Cancel"
          variant="outline"
          [fullWidth]="true"
          (clicked)="closeStudentAssignmentModal()"
        ></app-button>
        <app-button
          label="Save Assignment"
          [disabled]="!studentAssignmentForm.valid"
          [fullWidth]="true"
          (clicked)="submitStudentAssignment()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="teacherAssignmentOpen()"
      [title]="teacherAssignmentTitle()"
      description="Assign an existing teacher to a module and a group."
      size="md"
      (closed)="closeTeacherAssignmentModal()"
    >
      <div modal-body>
        <form [formGroup]="teacherAssignmentForm" class="space-y-8">
          <app-dropdown-filter
            label="Select Teacher *"
            identifier="assignment-teacher"
            allLabel="Select teacher"
            [options]="teacherOptions()"
            [value]="teacherAssignmentValue('teacherId')"
            iconClass="fa-solid fa-chalkboard-user"
            iconBackgroundClass="bg-primary-soft"
            (filterChange)="setTeacherAssignmentValue('teacherId', $event)"
          ></app-dropdown-filter>

          <div class="grid gap-x-5 gap-y-7 border-t border-line/70 pt-7 sm:grid-cols-2">
            <app-dropdown-filter
              label="Module *"
              identifier="assignment-module"
              allLabel="Select module"
              [options]="moduleDropdownOptions()"
              [value]="teacherAssignmentValue('module')"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-secondary-soft"
              iconColor="secondary"
              (filterChange)="setTeacherAssignmentValue('module', $event)"
            ></app-dropdown-filter>

            <app-dropdown-filter
              label="Group *"
              identifier="assignment-teacher-group"
              allLabel="Select group"
              [options]="groupDropdownOptions()"
              [value]="teacherAssignmentValue('group')"
              iconClass="fa-solid fa-users"
              iconBackgroundClass="bg-warning-soft"
              iconColor="warning"
              (filterChange)="setTeacherAssignmentValue('group', $event)"
            ></app-dropdown-filter>
          </div>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <app-button
          label="Cancel"
          variant="outline"
          [fullWidth]="true"
          (clicked)="closeTeacherAssignmentModal()"
        ></app-button>
        <app-button
          label="Save Assignment"
          [disabled]="!teacherAssignmentForm.valid"
          [fullWidth]="true"
          (clicked)="submitTeacherAssignment()"
        ></app-button>
      </div>
    </app-modal>

    <app-delete-modal
      [open]="clearStudentOpen()"
      title="Clear this inscription?"
      [itemName]="selectedStudent()?.name || ''"
      confirmMessage="You are about to clear inscription for:"
      warningMessage="The student will remain in the Students page. Only cycle, year, and group are removed."
      deleteButtonLabel="Clear inscription"
      (closeRequested)="closeClearStudentAssignmentModal()"
      (confirmDelete)="confirmClearStudentAssignment()"
    ></app-delete-modal>

    <app-delete-modal
      [open]="clearTeacherOpen()"
      title="Clear this teacher assignment?"
      [itemName]="selectedTeacher()?.name || ''"
      confirmMessage="You are about to clear assignment for:"
      warningMessage="The teacher will remain in the Teachers page. Only modules and groups are reset."
      deleteButtonLabel="Clear assignment"
      (closeRequested)="closeClearTeacherAssignmentModal()"
      (confirmDelete)="confirmClearTeacherAssignment()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InscriptionPage {
  private readonly fb = inject(FormBuilder);
  private readonly directory = inject(AdminDirectoryStore);

  readonly students = this.directory.students;
  readonly teachers = this.directory.teachers;
  readonly cycles = this.directory.cycles;
  readonly years = this.directory.years;
  readonly groups = this.directory.groups;
  readonly moduleOptions = this.directory.moduleOptions;

  readonly activeSection = signal<InscriptionSection>('students');
  readonly studentAssignmentOpen = signal(false);
  readonly teacherAssignmentOpen = signal(false);
  readonly clearStudentOpen = signal(false);
  readonly clearTeacherOpen = signal(false);
  readonly editingStudentAssignmentId = signal<string | null>(null);
  readonly editingTeacherAssignmentId = signal<string | null>(null);
  readonly selectedStudent = signal<StudentRecord | null>(null);
  readonly selectedTeacher = signal<TeacherRecord | null>(null);

  readonly studentAssignmentForm: FormGroup;
  readonly teacherAssignmentForm: FormGroup;
  readonly studentRowId = (row: StudentRecord) => row.id;
  readonly teacherRowId = (row: TeacherRecord) => row.id;

  readonly inscriptionMeta = computed(() => {
    const assignedStudents = this.students().filter((student) =>
      this.hasStudentInscription(student),
    ).length;
    const assignedTeachers = this.teachers().filter((teacher) =>
      this.hasTeacherAssignment(teacher),
    ).length;
    return `${assignedStudents} student inscriptions - ${assignedTeachers} teacher assignments`;
  });

  readonly studentAssignmentTitle = computed(() =>
    this.editingStudentAssignmentId() ? 'Edit Student Inscription' : 'Assign Student',
  );
  readonly teacherAssignmentTitle = computed(() =>
    this.editingTeacherAssignmentId() ? 'Edit Teacher Assignment' : 'Assign Teacher',
  );
  readonly studentOptions = computed(() =>
    this.students().map((student) => ({ label: student.name, value: student.id })),
  );
  readonly cycleDropdownOptions = computed(() =>
    this.cycles.map((cycle) => ({ label: cycle, value: cycle })),
  );
  readonly yearDropdownOptions = computed(() =>
    this.years.map((year) => ({ label: year, value: year })),
  );
  readonly teacherOptions = computed(() =>
    this.teachers().map((teacher) => ({ label: teacher.name, value: teacher.id })),
  );
  readonly moduleDropdownOptions = computed(() =>
    this.moduleOptions.map((module) => ({ label: module, value: module })),
  );
  readonly groupDropdownOptions = computed(() =>
    this.groups.map((group) => ({ label: group, value: group })),
  );

  readonly studentColumns: readonly DataTableColumn<StudentRecord>[] = [
    {
      id: 'student',
      header: 'Name',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.cycle, row.year, row.group],
      width: '18rem',
    },
    {
      id: 'cycle',
      header: 'Cycle',
      accessor: (row) => row.cycle,
      filter: {
        type: 'select',
        options: this.cycles.map((cycle) => ({ label: cycle, value: cycle })),
      },
    },
    {
      id: 'year',
      header: 'Year',
      accessor: (row) => row.year,
      filter: {
        type: 'select',
        options: this.years.map((year) => ({ label: year, value: year })),
      },
    },
    {
      id: 'group',
      header: 'Group',
      accessor: (row) => row.group,
      filter: {
        type: 'select',
        options: this.groups.map((group) => ({ label: group, value: group })),
      },
    },
    {
      id: 'studentActions',
      header: 'Actions',
      accessor: () => '',
      searchable: false,
      sortable: false,
      hideable: false,
      align: 'end',
      width: '7rem',
    },
  ];

  readonly teacherColumns: readonly DataTableColumn<TeacherRecord>[] = [
    {
      id: 'teacher',
      header: 'Name',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.modules.join(' '), row.groups.join(' ')],
      width: '18rem',
    },
    {
      id: 'teacherModules',
      header: 'Modules',
      accessor: (row) => row.modules,
      sortable: false,
      width: '20rem',
    },
    {
      id: 'teacherGroups',
      header: 'Groups',
      accessor: (row) => row.groups,
      sortable: false,
      filter: {
        type: 'select',
        options: this.groups.map((group) => ({ label: group, value: group })),
      },
    },
    {
      id: 'teacherActions',
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
    this.studentAssignmentForm = this.fb.group({
      studentId: ['', [Validators.required]],
      cycle: ['', [Validators.required]],
      year: ['', [Validators.required]],
      group: ['', [Validators.required]],
    });

    this.teacherAssignmentForm = this.fb.group({
      teacherId: ['', [Validators.required]],
      module: ['', [Validators.required]],
      group: ['', [Validators.required]],
    });
  }

  setSection(section: InscriptionSection): void {
    this.activeSection.set(section);
  }

  openCreateAssignmentModal(): void {
    if (this.activeSection() === 'students') {
      this.openCreateStudentAssignmentModal();
      return;
    }

    this.openCreateTeacherAssignmentModal();
  }

  openCreateStudentAssignmentModal(): void {
    this.editingStudentAssignmentId.set(null);
    this.studentAssignmentForm.reset({
      studentId: '',
      cycle: '',
      year: '',
      group: '',
    });
    this.studentAssignmentOpen.set(true);
  }

  openEditStudentAssignmentModal(student: StudentRecord): void {
    this.editingStudentAssignmentId.set(student.id);
    this.studentAssignmentForm.reset({
      studentId: student.id,
      cycle: student.cycle,
      year: student.year,
      group: student.group,
    });
    this.studentAssignmentOpen.set(true);
  }

  closeStudentAssignmentModal(): void {
    this.studentAssignmentOpen.set(false);
    this.editingStudentAssignmentId.set(null);
    this.studentAssignmentForm.reset();
  }

  submitStudentAssignment(): void {
    if (!this.studentAssignmentForm.valid) {
      return;
    }

    const value = this.studentAssignmentForm.value;
    this.directory.updateStudentInscription(value.studentId, {
      cycle: value.cycle,
      year: value.year,
      group: value.group,
    });
    this.closeStudentAssignmentModal();
  }

  openClearStudentAssignmentModal(student: StudentRecord): void {
    this.selectedStudent.set(student);
    this.clearStudentOpen.set(true);
  }

  closeClearStudentAssignmentModal(): void {
    this.clearStudentOpen.set(false);
  }

  confirmClearStudentAssignment(): void {
    const student = this.selectedStudent();
    if (!student) {
      return;
    }

    this.directory.clearStudentInscription(student.id);
    this.clearStudentOpen.set(false);
    this.selectedStudent.set(null);
  }

  openCreateTeacherAssignmentModal(): void {
    this.editingTeacherAssignmentId.set(null);
    this.teacherAssignmentForm.reset({
      teacherId: '',
      module: '',
      group: '',
    });
    this.teacherAssignmentOpen.set(true);
  }

  openEditTeacherAssignmentModal(teacher: TeacherRecord): void {
    this.editingTeacherAssignmentId.set(teacher.id);
    this.teacherAssignmentForm.reset({
      teacherId: teacher.id,
      module: teacher.modules[0] ?? '',
      group: teacher.groups[0] ?? '',
    });
    this.teacherAssignmentOpen.set(true);
  }

  closeTeacherAssignmentModal(): void {
    this.teacherAssignmentOpen.set(false);
    this.editingTeacherAssignmentId.set(null);
    this.teacherAssignmentForm.reset();
  }

  submitTeacherAssignment(): void {
    if (!this.teacherAssignmentForm.valid) {
      return;
    }

    const value = this.teacherAssignmentForm.value;
    const payload: TeacherAssignmentPayload = {
      modules: [value.module],
      groups: [value.group],
    };

    this.directory.updateTeacherAssignment(value.teacherId, payload);
    this.closeTeacherAssignmentModal();
  }

  openClearTeacherAssignmentModal(teacher: TeacherRecord): void {
    this.selectedTeacher.set(teacher);
    this.clearTeacherOpen.set(true);
  }

  closeClearTeacherAssignmentModal(): void {
    this.clearTeacherOpen.set(false);
  }

  confirmClearTeacherAssignment(): void {
    const teacher = this.selectedTeacher();
    if (!teacher) {
      return;
    }

    this.directory.clearTeacherAssignment(teacher.id);
    this.clearTeacherOpen.set(false);
    this.selectedTeacher.set(null);
  }

  hasStudentInscription(student: StudentRecord): boolean {
    return Boolean(student.cycle && student.year && student.group);
  }

  hasTeacherAssignment(teacher: TeacherRecord): boolean {
    return teacher.modules.length > 0 && teacher.groups.length > 0;
  }

  formatModules(modules: readonly string[]): string {
    return modules.length > 0 ? modules.join(', ') : 'Not assigned';
  }

  formatGroups(groups: readonly string[]): string {
    return groups.length > 0 ? groups.join(', ') : 'Not assigned';
  }

  studentAssignmentValue(controlName: 'studentId' | 'cycle' | 'year' | 'group'): string {
    return String(this.studentAssignmentForm.get(controlName)?.value ?? '');
  }

  setStudentAssignmentValue(
    controlName: 'studentId' | 'cycle' | 'year' | 'group',
    value: string | null,
  ): void {
    this.studentAssignmentForm.patchValue({ [controlName]: value ?? '' });
    this.studentAssignmentForm.get(controlName)?.markAsTouched();
  }

  teacherAssignmentValue(controlName: 'teacherId' | 'module' | 'group'): string {
    return String(this.teacherAssignmentForm.get(controlName)?.value ?? '');
  }

  setTeacherAssignmentValue(
    controlName: 'teacherId' | 'module' | 'group',
    value: string | null,
  ): void {
    this.teacherAssignmentForm.patchValue({ [controlName]: value ?? '' });
    this.teacherAssignmentForm.get(controlName)?.markAsTouched();
  }

  initials(name: string): string {
    return this.directory.initials(name);
  }
}
