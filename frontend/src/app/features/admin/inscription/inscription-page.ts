import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, forkJoin } from 'rxjs';

import {
  AdminStudentInscriptionDto,
  AdminTeacherAssignmentDto,
} from '../../../core/admin/models/admin-inscription.model';
import { AdminStudentDto, AdminTeacherDto, fullName } from '../../../core/admin/models/admin-user.model';
import { AdminInscriptionService } from '../../../core/admin/services/admin-inscription.service';
import { AdminStudentService } from '../../../core/admin/services/admin-student.service';
import { AdminTeacherService } from '../../../core/admin/services/admin-teacher.service';
import { AnneeUniversitaire } from '../../../core/structure/models/annee-universitaire.model';
import { Formation } from '../../../core/structure/models/formation.model';
import { Groupe } from '../../../core/structure/models/groupe.model';
import { Module } from '../../../core/structure/models/module.model';
import { AnneeUniversitaireService } from '../../../core/structure/services/annee-universitaire.service';
import { FormationService } from '../../../core/structure/services/formation.service';
import { GroupeService } from '../../../core/structure/services/groupe.service';
import { ModuleService } from '../../../core/structure/services/module.service';
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
import { ToastService } from '../../../shared/components/toast/toast.service';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';

type InscriptionSection = 'students' | 'teachers';
type Option = { readonly label: string; readonly value: string };

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
    StatusBadge,
    UserAvatar,
  ],
  template: `
    <section class="space-y-5">
      <app-page-header
        title="Inscription"
        description="Assign students and teachers to the active academic structure used by attendance."
        [meta]="inscriptionMeta()"
      ></app-page-header>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          class="inline-flex rounded-2xl border border-line bg-surface p-1 shadow-card"
          aria-label="Inscription section"
        >
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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
            class="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors"
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

      @if (errorMessage()) {
        <div class="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {{ errorMessage() }}
        </div>
      }

      @if (activeSection() === 'students') {
        <app-data-table
          title="Student inscriptions"
          description="Student enrollment rows loaded from user-service."
          caption="Student assignments"
          searchPlaceholder="Search by student, formation, group, or academic year..."
          emptyStateTitle="No student inscriptions found"
          emptyStateDescription="Create student inscriptions after students and structure data exist."
          [rows]="studentInscriptions()"
          [columns]="studentColumns"
          [rowId]="studentRowId"
          [initialPageSize]="10"
          [showColumnFilters]="false"
          [showColumnVisibility]="false"
        >
          <ng-template [appDataTableCell]="'student'" let-row="row">
            <div class="flex min-w-0 items-center gap-4">
              <app-user-avatar
                [name]="studentName(row)"
                [imageUrl]="studentPfpUrl(row)"
                size="lg"
                shape="rounded"
              ></app-user-avatar>
              <div class="min-w-0">
                <p class="truncate text-[0.95rem] font-semibold text-principalText">{{ studentName(row) }}</p>
                <p class="mt-0.5 truncate text-[0.8rem] text-secondaryText">Student #{{ row.studentId }}</p>
              </div>
            </div>
          </ng-template>

          <ng-template [appDataTableCell]="'academicYear'" let-row="row">
            <app-status-badge [label]="row.academicYearName" variant="info"></app-status-badge>
          </ng-template>

          <ng-template [appDataTableCell]="'formation'" let-row="row">
            <span class="font-medium text-principalText">{{ row.formationName }}</span>
          </ng-template>

          <ng-template [appDataTableCell]="'groupe'" let-row="row">
            <span class="inline-flex rounded-xl border border-secondary-soft bg-secondary-soft px-3 py-1.5 text-sm font-semibold text-secondary-strong shadow-sm">
              {{ row.groupeName }}
            </span>
          </ng-template>

          <ng-template [appDataTableCell]="'studentActions'" let-row="row">
            <div class="flex justify-end gap-2">
              <app-icon-button
                icon="fa-regular fa-pen-to-square"
                [label]="'Edit inscription for ' + studentName(row)"
                tone="primary"
                size="sm"
                (click)="openEditStudentAssignmentModal(row)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                [label]="'Delete inscription for ' + studentName(row)"
                tone="danger"
                size="sm"
                (click)="openDeleteStudentAssignmentModal(row)"
              ></app-icon-button>
            </div>
          </ng-template>
        </app-data-table>
      } @else {
        <app-data-table
          title="Teacher assignments"
          description="Teacher module and group assignments loaded from user-service."
          caption="Teacher assignments"
          searchPlaceholder="Search by teacher, module, formation, group, or year..."
          emptyStateTitle="No teacher assignments found"
          emptyStateDescription="Create teacher assignments after teachers and structure data exist."
          [rows]="teacherAssignments()"
          [columns]="teacherColumns"
          [rowId]="teacherRowId"
          [initialPageSize]="10"
          [showColumnFilters]="false"
          [showColumnVisibility]="false"
        >
          <ng-template [appDataTableCell]="'teacher'" let-row="row">
            <div class="flex min-w-0 items-center gap-4">
              <app-user-avatar
                [name]="teacherName(row)"
                [imageUrl]="teacherPfpUrl(row)"
                size="lg"
                shape="rounded"
              ></app-user-avatar>
              <div class="min-w-0">
                <p class="truncate text-[0.95rem] font-semibold text-principalText">{{ teacherName(row) }}</p>
                <p class="mt-0.5 truncate text-[0.8rem] text-secondaryText">{{ row.teacherEmail }}</p>
              </div>
            </div>
          </ng-template>

          <ng-template [appDataTableCell]="'module'" let-row="row">
            <div>
              <p class="font-medium text-principalText">{{ row.moduleName }}</p>
              <p class="text-xs text-secondaryText">{{ row.moduleCode }}</p>
            </div>
          </ng-template>

          <ng-template [appDataTableCell]="'scope'" let-row="row">
            <div class="flex flex-wrap gap-2">
              <app-status-badge [label]="row.academicYearName" variant="info"></app-status-badge>
              <span class="inline-flex rounded-xl border border-secondary-soft bg-secondary-soft px-3 py-1.5 text-xs font-semibold text-secondary-strong shadow-sm">
                {{ row.groupeName }}
              </span>
            </div>
          </ng-template>

          <ng-template [appDataTableCell]="'teacherActions'" let-row="row">
            <div class="flex justify-end gap-2">
              <app-icon-button
                icon="fa-regular fa-pen-to-square"
                [label]="'Edit assignment for ' + teacherName(row)"
                tone="primary"
                size="sm"
                (click)="openEditTeacherAssignmentModal(row)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                [label]="'Delete assignment for ' + teacherName(row)"
                tone="danger"
                size="sm"
                (click)="openDeleteTeacherAssignmentModal(row)"
              ></app-icon-button>
            </div>
          </ng-template>
        </app-data-table>
      }
    </section>

    <app-modal
      [open]="studentAssignmentOpen()"
      [title]="studentAssignmentTitle()"
      description="Assign an existing student to an academic year, formation, and group."
      size="md"
      (closed)="closeStudentAssignmentModal()"
    >
      <div modal-body>
        <form [formGroup]="studentAssignmentForm" class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <app-dropdown-filter
              label="Student *"
              identifier="student-inscription-student"
              allLabel="Select student"
              [options]="studentOptions()"
              [value]="studentAssignmentValue('studentId')"
              iconClass="fa-solid fa-user-graduate"
              iconBackgroundClass="bg-primary-soft"
              (filterChange)="setStudentAssignmentValue('studentId', $event)"
            ></app-dropdown-filter>
          </div>

          <app-dropdown-filter
            label="Academic year *"
            identifier="student-inscription-year"
            allLabel="Select academic year"
            [options]="academicYearOptions()"
            [value]="studentAssignmentValue('academicYearId')"
            iconClass="fa-regular fa-calendar"
            iconBackgroundClass="bg-warning-soft"
            iconColor="warning"
            (filterChange)="setStudentAssignmentValue('academicYearId', $event)"
          ></app-dropdown-filter>

          <div>
            <app-dropdown-filter
              label="Formation *"
              identifier="student-inscription-formation"
              [allLabel]="studentAssignmentValue('academicYearId') ? 'Select formation' : 'Select an academic year first'"
              [options]="studentFormationOptions()"
              [value]="studentAssignmentValue('formationId')"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-secondary-soft"
              [disabled]="!studentAssignmentValue('academicYearId')"
            iconColor="secondary"
            (filterChange)="setStudentAssignmentValue('formationId', $event)"
          ></app-dropdown-filter>
            @if (studentAssignmentValue('academicYearId') && studentFormationOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">No formations available for this academic year.</p>
            }
          </div>

          <div class="sm:col-span-2">
            <app-dropdown-filter
              label="Group *"
              identifier="student-inscription-group"
              [allLabel]="studentAssignmentValue('formationId') ? 'Select group' : 'Select a formation first'"
              [options]="studentGroupOptions()"
              [value]="studentAssignmentValue('groupeId')"
              iconClass="fa-solid fa-users"
              iconBackgroundClass="bg-primary-soft"
              [disabled]="!studentAssignmentValue('formationId')"
              (filterChange)="setStudentAssignmentValue('groupeId', $event)"
            ></app-dropdown-filter>
            @if (studentAssignmentValue('formationId') && studentGroupOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">No groups available for this formation.</p>
            }
          </div>
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
          label="Save inscription"
          [disabled]="studentAssignmentForm.invalid || saving()"
          [loading]="saving()"
          [fullWidth]="true"
          (clicked)="submitStudentAssignment()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="teacherAssignmentOpen()"
      [title]="teacherAssignmentTitle()"
      description="Assign an existing teacher to an academic year, formation, group, and module."
      size="md"
      (closed)="closeTeacherAssignmentModal()"
    >
      <div modal-body>
        <form [formGroup]="teacherAssignmentForm" class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <app-dropdown-filter
              label="Teacher *"
              identifier="teacher-assignment-teacher"
              allLabel="Select teacher"
              [options]="teacherOptions()"
              [value]="teacherAssignmentValue('teacherId')"
              iconClass="fa-solid fa-chalkboard-user"
              iconBackgroundClass="bg-primary-soft"
              (filterChange)="setTeacherAssignmentValue('teacherId', $event)"
            ></app-dropdown-filter>
          </div>

          <app-dropdown-filter
            label="Academic year *"
            identifier="teacher-assignment-year"
            allLabel="Select academic year"
            [options]="academicYearOptions()"
            [value]="teacherAssignmentValue('academicYearId')"
            iconClass="fa-regular fa-calendar"
            iconBackgroundClass="bg-warning-soft"
            iconColor="warning"
            (filterChange)="setTeacherAssignmentValue('academicYearId', $event)"
          ></app-dropdown-filter>

          <div>
            <app-dropdown-filter
              label="Formation *"
              identifier="teacher-assignment-formation"
              [allLabel]="teacherAssignmentValue('academicYearId') ? 'Select formation' : 'Select an academic year first'"
              [options]="teacherFormationOptions()"
              [value]="teacherAssignmentValue('formationId')"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-secondary-soft"
              [disabled]="!teacherAssignmentValue('academicYearId')"
            iconColor="secondary"
            (filterChange)="setTeacherAssignmentValue('formationId', $event)"
          ></app-dropdown-filter>
            @if (teacherAssignmentValue('academicYearId') && teacherFormationOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">No formations available for this academic year.</p>
            }
          </div>

          <div>
            <app-dropdown-filter
              label="Group *"
              identifier="teacher-assignment-group"
              [allLabel]="teacherAssignmentValue('formationId') ? 'Select group' : 'Select a formation first'"
              [options]="teacherGroupOptions()"
              [value]="teacherAssignmentValue('groupeId')"
              iconClass="fa-solid fa-users"
              iconBackgroundClass="bg-primary-soft"
              [disabled]="!teacherAssignmentValue('formationId')"
              (filterChange)="setTeacherAssignmentValue('groupeId', $event)"
            ></app-dropdown-filter>
            @if (teacherAssignmentValue('formationId') && teacherGroupOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">No groups available for this formation.</p>
            }
          </div>

          <div>
            <app-dropdown-filter
              label="Module *"
              identifier="teacher-assignment-module"
              [allLabel]="teacherAssignmentValue('formationId') ? 'Select module' : 'Select a formation first'"
              [options]="teacherModuleOptions()"
              [value]="teacherAssignmentValue('moduleId')"
              iconClass="fa-solid fa-book"
              iconBackgroundClass="bg-secondary-soft"
              iconColor="secondary"
              [disabled]="!teacherAssignmentValue('formationId')"
              (filterChange)="setTeacherAssignmentValue('moduleId', $event)"
            ></app-dropdown-filter>
            @if (teacherAssignmentValue('formationId') && teacherModuleOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">No modules available for this formation.</p>
            }
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
          label="Save assignment"
          [disabled]="teacherAssignmentForm.invalid || saving()"
          [loading]="saving()"
          [fullWidth]="true"
          (clicked)="submitTeacherAssignment()"
        ></app-button>
      </div>
    </app-modal>

    <app-delete-modal
      [open]="deleteStudentOpen()"
      title="Delete this inscription?"
      [itemName]="selectedStudentInscription() ? studentName(selectedStudentInscription()!) : ''"
      confirmMessage="You are about to delete inscription for:"
      warningMessage="The student account stays in the database. Only this inscription row is removed."
      deleteButtonLabel="Delete inscription"
      (closeRequested)="closeDeleteStudentAssignmentModal()"
      (confirmDelete)="confirmDeleteStudentAssignment()"
    ></app-delete-modal>

    <app-delete-modal
      [open]="deleteTeacherOpen()"
      title="Delete this teacher assignment?"
      [itemName]="selectedTeacherAssignment() ? teacherName(selectedTeacherAssignment()!) : ''"
      confirmMessage="You are about to delete assignment for:"
      warningMessage="The teacher account stays in the database. Only this assignment row is removed."
      deleteButtonLabel="Delete assignment"
      (closeRequested)="closeDeleteTeacherAssignmentModal()"
      (confirmDelete)="confirmDeleteTeacherAssignment()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InscriptionPage {
  private readonly fb = inject(FormBuilder);
  private readonly inscriptionService = inject(AdminInscriptionService);
  private readonly studentService = inject(AdminStudentService);
  private readonly teacherService = inject(AdminTeacherService);
  private readonly yearService = inject(AnneeUniversitaireService);
  private readonly formationService = inject(FormationService);
  private readonly groupService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly activeSection = signal<InscriptionSection>('students');
  readonly studentInscriptions = signal<readonly AdminStudentInscriptionDto[]>([]);
  readonly teacherAssignments = signal<readonly AdminTeacherAssignmentDto[]>([]);
  readonly students = signal<readonly AdminStudentDto[]>([]);
  readonly teachers = signal<readonly AdminTeacherDto[]>([]);
  readonly academicYears = signal<readonly AnneeUniversitaire[]>([]);
  readonly formations = signal<readonly Formation[]>([]);
  readonly groups = signal<readonly Groupe[]>([]);
  readonly modules = signal<readonly Module[]>([]);
  readonly errorMessage = signal<string | null>(null);
  readonly saving = signal(false);

  readonly studentAssignmentOpen = signal(false);
  readonly teacherAssignmentOpen = signal(false);
  readonly deleteStudentOpen = signal(false);
  readonly deleteTeacherOpen = signal(false);
  readonly editingStudentInscriptionId = signal<number | null>(null);
  readonly editingTeacherAssignmentId = signal<number | null>(null);
  readonly selectedStudentInscription = signal<AdminStudentInscriptionDto | null>(null);
  readonly selectedTeacherAssignment = signal<AdminTeacherAssignmentDto | null>(null);
  readonly studentAcademicYearSelection = signal('');
  readonly studentFormationSelection = signal('');
  readonly teacherAcademicYearSelection = signal('');
  readonly teacherFormationSelection = signal('');

  readonly studentRowId = (row: AdminStudentInscriptionDto) => String(row.id);
  readonly teacherRowId = (row: AdminTeacherAssignmentDto) => String(row.id);

  readonly studentAssignmentForm = this.fb.nonNullable.group({
    studentId: ['', [Validators.required]],
    academicYearId: ['', [Validators.required]],
    formationId: ['', [Validators.required]],
    groupeId: ['', [Validators.required]],
  });

  readonly teacherAssignmentForm = this.fb.nonNullable.group({
    teacherId: ['', [Validators.required]],
    academicYearId: ['', [Validators.required]],
    formationId: ['', [Validators.required]],
    groupeId: ['', [Validators.required]],
    moduleId: ['', [Validators.required]],
  });

  readonly inscriptionMeta = computed(
    () => `${this.studentInscriptions().length} student inscriptions - ${this.teacherAssignments().length} teacher assignments`,
  );
  readonly studentAssignmentTitle = computed(() =>
    this.editingStudentInscriptionId() ? 'Edit student inscription' : 'Assign student',
  );
  readonly teacherAssignmentTitle = computed(() =>
    this.editingTeacherAssignmentId() ? 'Edit teacher assignment' : 'Assign teacher',
  );

  readonly studentOptions = computed<Option[]>(() => {
    const editingId = this.editingStudentInscriptionId();
    const assignedStudentIds = new Set(
      this.studentInscriptions()
        .filter((inscription) => inscription.id !== editingId)
        .map((inscription) => inscription.studentId),
    );

    return this.students()
      .filter((student) => !assignedStudentIds.has(student.id))
      .map((student) => ({
        label: fullName(student.firstName, student.lastName) || student.email,
        value: String(student.id),
      }));
  });
  readonly teacherOptions = computed<Option[]>(() =>
    this.teachers().map((teacher) => ({
      label: fullName(teacher.firstName, teacher.lastName) || teacher.email,
      value: String(teacher.id),
    })),
  );
  readonly academicYearOptions = computed<Option[]>(() =>
    this.academicYears().map((year) => ({
      label: year.active ? `${year.name} (active)` : year.name,
      value: String(year.id),
    })),
  );
  readonly studentFormationOptions = computed<Option[]>(() =>
    this.filteredFormations(this.studentAcademicYearSelection()),
  );
  readonly teacherFormationOptions = computed<Option[]>(() =>
    this.filteredFormations(this.teacherAcademicYearSelection()),
  );
  readonly studentGroupOptions = computed<Option[]>(() =>
    this.filteredGroups(this.studentAcademicYearSelection(), this.studentFormationSelection()),
  );
  readonly teacherGroupOptions = computed<Option[]>(() =>
    this.filteredGroups(this.teacherAcademicYearSelection(), this.teacherFormationSelection()),
  );
  readonly teacherModuleOptions = computed<Option[]>(() =>
    this.filteredModules(this.teacherAcademicYearSelection(), this.teacherFormationSelection()),
  );

  readonly studentColumns: readonly DataTableColumn<AdminStudentInscriptionDto>[] = [
    {
      id: 'student',
      header: 'Student',
      accessor: (row) => this.studentName(row),
      filterValue: (row) => [this.studentName(row), row.formationName, row.groupeName, row.academicYearName],
      sortable: false,
      width: '20rem',
    },
    {
      id: 'academicYear',
      header: 'Academic year',
      accessor: (row) => row.academicYearName,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Academic year',
        placeholder: 'Filter year',
      },
      width: '12rem',
    },
    {
      id: 'formation',
      header: 'Formation',
      accessor: (row) => row.formationName,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Formation',
        placeholder: 'Filter formation',
      },
    },
    {
      id: 'groupe',
      header: 'Group',
      accessor: (row) => row.groupeName,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Group',
        placeholder: 'Filter group',
      },
      width: '10rem',
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

  readonly teacherColumns: readonly DataTableColumn<AdminTeacherAssignmentDto>[] = [
    {
      id: 'teacher',
      header: 'Teacher',
      accessor: (row) => this.teacherName(row),
      filterValue: (row) => [this.teacherName(row), row.teacherEmail, row.moduleName, row.groupeName, row.academicYearName],
      sortable: false,
      width: '20rem',
    },
    {
      id: 'module',
      header: 'Module',
      accessor: (row) => row.moduleName,
      sortable: false,
      width: '18rem',
    },
    {
      id: 'formation',
      header: 'Formation',
      accessor: (row) => row.formationName,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Formation',
        placeholder: 'Filter formation',
      },
    },
    {
      id: 'scope',
      header: 'Scope',
      accessor: (row) => `${row.academicYearName} ${row.groupeName}`,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Scope',
        placeholder: 'Year or group',
      },
      width: '16rem',
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
    this.loadData();
  }

  loadData(): void {
    this.errorMessage.set(null);
    forkJoin({
      studentInscriptions: this.inscriptionService.getStudentInscriptions(),
      teacherAssignments: this.inscriptionService.getTeacherAssignments(),
      students: this.studentService.getAll(),
      teachers: this.teacherService.getAll(),
      academicYears: this.yearService.getAll(),
      formations: this.formationService.getAll(),
      groups: this.groupService.getAll(),
      modules: this.moduleService.getAll(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.studentInscriptions.set(data.studentInscriptions);
          this.teacherAssignments.set(data.teacherAssignments);
          this.students.set(data.students);
          this.teachers.set(data.teachers);
          this.academicYears.set(data.academicYears);
          this.formations.set(data.formations);
          this.groups.set(data.groups);
          this.modules.set(data.modules);
        },
        error: () => this.errorMessage.set('Unable to load inscription data from backend services.'),
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
    this.editingStudentInscriptionId.set(null);
    const academicYearId = this.defaultAcademicYearId();
    this.studentAssignmentForm.reset({
      studentId: '',
      academicYearId,
      formationId: '',
      groupeId: '',
    });
    this.studentAcademicYearSelection.set(academicYearId);
    this.studentFormationSelection.set('');
    this.studentAssignmentOpen.set(true);
  }

  openEditStudentAssignmentModal(row: AdminStudentInscriptionDto): void {
    this.editingStudentInscriptionId.set(row.id);
    const academicYearId = String(row.academicYearId);
    const formationId = String(row.formationId);
    this.studentAssignmentForm.reset({
      studentId: String(row.studentId),
      academicYearId,
      formationId,
      groupeId: String(row.groupeId),
    });
    this.studentAcademicYearSelection.set(academicYearId);
    this.studentFormationSelection.set(formationId);
    this.studentAssignmentOpen.set(true);
  }

  closeStudentAssignmentModal(): void {
    this.studentAssignmentOpen.set(false);
    this.editingStudentInscriptionId.set(null);
    this.studentAcademicYearSelection.set('');
    this.studentFormationSelection.set('');
    this.studentAssignmentForm.reset();
  }

  submitStudentAssignment(): void {
    if (this.studentAssignmentForm.invalid) {
      this.studentAssignmentForm.markAllAsTouched();
      return;
    }

    const value = this.studentAssignmentForm.getRawValue();
    const payload = {
      studentId: Number(value.studentId),
      academicYearId: Number(value.academicYearId),
      formationId: Number(value.formationId),
      groupeId: Number(value.groupeId),
    };
    if (!this.studentAssignmentRelationshipsValid(payload.academicYearId, payload.formationId, payload.groupeId)) {
      this.toast.error('Invalid academic structure', 'Select a formation and group that belong to the selected academic year.');
      return;
    }
    const editingId = this.editingStudentInscriptionId();
    const request = editingId
      ? this.inscriptionService.updateStudentInscription(editingId, payload)
      : this.inscriptionService.createStudentInscription(payload);

    this.saving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(editingId ? 'Inscription updated' : 'Inscription created');
          this.closeStudentAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Save failed', 'Check selected academic relationships.'),
      });
  }

  openDeleteStudentAssignmentModal(row: AdminStudentInscriptionDto): void {
    this.selectedStudentInscription.set(row);
    this.deleteStudentOpen.set(true);
  }

  closeDeleteStudentAssignmentModal(): void {
    this.deleteStudentOpen.set(false);
    this.selectedStudentInscription.set(null);
  }

  confirmDeleteStudentAssignment(): void {
    const row = this.selectedStudentInscription();
    if (!row) {
      return;
    }

    this.inscriptionService
      .deleteStudentInscription(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Inscription deleted');
          this.closeDeleteStudentAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Delete failed'),
      });
  }

  openCreateTeacherAssignmentModal(): void {
    this.editingTeacherAssignmentId.set(null);
    const academicYearId = this.defaultAcademicYearId();
    this.teacherAssignmentForm.reset({
      teacherId: '',
      academicYearId,
      formationId: '',
      groupeId: '',
      moduleId: '',
    });
    this.teacherAcademicYearSelection.set(academicYearId);
    this.teacherFormationSelection.set('');
    this.teacherAssignmentOpen.set(true);
  }

  openEditTeacherAssignmentModal(row: AdminTeacherAssignmentDto): void {
    this.editingTeacherAssignmentId.set(row.id);
    const academicYearId = String(row.academicYearId);
    const formationId = String(row.formationId);
    this.teacherAssignmentForm.reset({
      teacherId: String(row.teacherId),
      academicYearId,
      formationId,
      groupeId: String(row.groupeId),
      moduleId: String(row.moduleId),
    });
    this.teacherAcademicYearSelection.set(academicYearId);
    this.teacherFormationSelection.set(formationId);
    this.teacherAssignmentOpen.set(true);
  }

  closeTeacherAssignmentModal(): void {
    this.teacherAssignmentOpen.set(false);
    this.editingTeacherAssignmentId.set(null);
    this.teacherAcademicYearSelection.set('');
    this.teacherFormationSelection.set('');
    this.teacherAssignmentForm.reset();
  }

  submitTeacherAssignment(): void {
    if (this.teacherAssignmentForm.invalid) {
      this.teacherAssignmentForm.markAllAsTouched();
      return;
    }

    const value = this.teacherAssignmentForm.getRawValue();
    const payload = {
      teacherId: Number(value.teacherId),
      academicYearId: Number(value.academicYearId),
      formationId: Number(value.formationId),
      groupeId: Number(value.groupeId),
      moduleId: Number(value.moduleId),
    };
    if (
      !this.teacherAssignmentRelationshipsValid(
        payload.academicYearId,
        payload.formationId,
        payload.groupeId,
        payload.moduleId,
      )
    ) {
      this.toast.error('Invalid academic structure', 'Select group and module values that belong to the selected formation.');
      return;
    }
    const editingId = this.editingTeacherAssignmentId();
    const request = editingId
      ? this.inscriptionService.updateTeacherAssignment(editingId, payload)
      : this.inscriptionService.createTeacherAssignment(payload);

    this.saving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(editingId ? 'Assignment updated' : 'Assignment created');
          this.closeTeacherAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Save failed', 'Check selected academic relationships.'),
      });
  }

  openDeleteTeacherAssignmentModal(row: AdminTeacherAssignmentDto): void {
    this.selectedTeacherAssignment.set(row);
    this.deleteTeacherOpen.set(true);
  }

  closeDeleteTeacherAssignmentModal(): void {
    this.deleteTeacherOpen.set(false);
    this.selectedTeacherAssignment.set(null);
  }

  confirmDeleteTeacherAssignment(): void {
    const row = this.selectedTeacherAssignment();
    if (!row) {
      return;
    }

    this.inscriptionService
      .deleteTeacherAssignment(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Assignment deleted');
          this.closeDeleteTeacherAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Delete failed'),
      });
  }

  studentName(row: AdminStudentInscriptionDto): string {
    return fullName(row.studentFirstName, row.studentLastName) || `Student #${row.studentId}`;
  }

  teacherName(row: AdminTeacherAssignmentDto): string {
    return fullName(row.teacherFirstName, row.teacherLastName) || row.teacherEmail;
  }

  studentPfpUrl(row: AdminStudentInscriptionDto): string | null {
    return this.students().find((student) => student.id === row.studentId)?.pfpUrl?.trim() || null;
  }

  teacherPfpUrl(row: AdminTeacherAssignmentDto): string | null {
    return this.teachers().find((teacher) => teacher.id === row.teacherId)?.pfpUrl?.trim() || null;
  }

  studentAssignmentValue(controlName: 'studentId' | 'academicYearId' | 'formationId' | 'groupeId'): string {
    return String(this.studentAssignmentForm.get(controlName)?.value ?? '');
  }

  setStudentAssignmentValue(
    controlName: 'studentId' | 'academicYearId' | 'formationId' | 'groupeId',
    value: string | null,
  ): void {
    const nextValue = value ?? '';
    this.studentAssignmentForm.patchValue({ [controlName]: nextValue });
    if (controlName === 'academicYearId') {
      this.studentAssignmentForm.patchValue({ formationId: '', groupeId: '' });
      this.studentAcademicYearSelection.set(nextValue);
      this.studentFormationSelection.set('');
    }
    if (controlName === 'formationId') {
      this.studentAssignmentForm.patchValue({ groupeId: '' });
      this.studentFormationSelection.set(nextValue);
    }
    this.studentAssignmentForm.get(controlName)?.markAsTouched();
  }

  teacherAssignmentValue(
    controlName: 'teacherId' | 'academicYearId' | 'formationId' | 'groupeId' | 'moduleId',
  ): string {
    return String(this.teacherAssignmentForm.get(controlName)?.value ?? '');
  }

  setTeacherAssignmentValue(
    controlName: 'teacherId' | 'academicYearId' | 'formationId' | 'groupeId' | 'moduleId',
    value: string | null,
  ): void {
    const nextValue = value ?? '';
    this.teacherAssignmentForm.patchValue({ [controlName]: nextValue });
    if (controlName === 'academicYearId') {
      this.teacherAssignmentForm.patchValue({ formationId: '', groupeId: '', moduleId: '' });
      this.teacherAcademicYearSelection.set(nextValue);
      this.teacherFormationSelection.set('');
    }
    if (controlName === 'formationId') {
      this.teacherAssignmentForm.patchValue({ groupeId: '', moduleId: '' });
      this.teacherFormationSelection.set(nextValue);
    }
    this.teacherAssignmentForm.get(controlName)?.markAsTouched();
  }

  private filteredFormations(academicYearIdValue: string): Option[] {
    const academicYearId = Number(academicYearIdValue);
    if (!academicYearId) {
      return [];
    }
    return this.formations()
      .filter((formation) => formation.anneeUniversitaireId === academicYearId)
      .map((formation) => ({ label: formation.name, value: String(formation.id) }));
  }

  private filteredGroups(academicYearIdValue: string, formationIdValue: string): Option[] {
    const academicYearId = Number(academicYearIdValue);
    const formationId = Number(formationIdValue);
    if (!academicYearId || !formationId || !this.formationBelongsToYear(formationId, academicYearId)) {
      return [];
    }
    return this.groups()
      .filter((group) => group.formationId === formationId)
      .map((group) => ({ label: group.name, value: String(group.id) }));
  }

  private filteredModules(academicYearIdValue: string, formationIdValue: string): Option[] {
    const academicYearId = Number(academicYearIdValue);
    const formationId = Number(formationIdValue);
    if (!academicYearId || !formationId || !this.formationBelongsToYear(formationId, academicYearId)) {
      return [];
    }
    return this.modules()
      .filter((module) => module.formationId === formationId)
      .map((module) => ({ label: `${module.code} - ${module.name}`, value: String(module.id) }));
  }

  private formationBelongsToYear(formationId: number, academicYearId: number): boolean {
    return this.formations().some(
      (formation) => formation.id === formationId && formation.anneeUniversitaireId === academicYearId,
    );
  }

  private studentAssignmentRelationshipsValid(academicYearId: number, formationId: number, groupId: number): boolean {
    return (
      this.formationBelongsToYear(formationId, academicYearId) &&
      this.groups().some((group) => group.id === groupId && group.formationId === formationId)
    );
  }

  private teacherAssignmentRelationshipsValid(
    academicYearId: number,
    formationId: number,
    groupId: number,
    moduleId: number,
  ): boolean {
    return (
      this.studentAssignmentRelationshipsValid(academicYearId, formationId, groupId) &&
      this.modules().some((module) => module.id === moduleId && module.formationId === formationId)
    );
  }

  private defaultAcademicYearId(): string {
    const activeYear = this.academicYears().find((year) => year.active) ?? this.academicYears()[0];
    return activeYear ? String(activeYear.id) : '';
  }
}
