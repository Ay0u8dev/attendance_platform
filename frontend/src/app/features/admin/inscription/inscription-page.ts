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
        description="Affectez les étudiants et les enseignants à la structure académique active utilisée pour les présences."
        [meta]="inscriptionMeta()"
      ></app-page-header>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          class="inline-flex rounded-2xl border border-line bg-surface p-1 shadow-card"
          aria-label="Section d’inscription"
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
            Étudiants
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
            Enseignants
          </button>
        </div>

        <app-button
          [label]="activeSection() === 'students' ? 'Affecter un étudiant' : 'Affecter un enseignant'"
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
          title="Inscriptions des étudiants"
          description="Lignes d’inscription des étudiants chargées depuis le service utilisateur."
          caption="Affectations des étudiants"
          searchPlaceholder="Rechercher par étudiant, formation, groupe ou année universitaire..."
          emptyStateTitle="Aucune inscription étudiant trouvée"
          emptyStateDescription="Créez des inscriptions après l’ajout des étudiants et de la structure."
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
                <p class="mt-0.5 truncate text-[0.8rem] text-secondaryText">Étudiant #{{ row.studentId }}</p>
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
                [label]="'Modifier l’inscription de ' + studentName(row)"
                tone="primary"
                size="sm"
                (click)="openEditStudentAssignmentModal(row)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                [label]="'Supprimer l’inscription de ' + studentName(row)"
                tone="danger"
                size="sm"
                (click)="openDeleteStudentAssignmentModal(row)"
              ></app-icon-button>
            </div>
          </ng-template>
        </app-data-table>
      } @else {
        <app-data-table
          title="Affectations des enseignants"
          description="Affectations des enseignants aux modules et groupes chargées depuis le service utilisateur."
          caption="Affectations des enseignants"
          searchPlaceholder="Rechercher par enseignant, module, formation, groupe ou année..."
          emptyStateTitle="Aucune affectation enseignant trouvée"
          emptyStateDescription="Créez des affectations après l’ajout des enseignants et de la structure."
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
                [label]="'Modifier l’affectation de ' + teacherName(row)"
                tone="primary"
                size="sm"
                (click)="openEditTeacherAssignmentModal(row)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                [label]="'Supprimer l’affectation de ' + teacherName(row)"
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
      description="Affectez un étudiant existant à une année universitaire, une formation et un groupe."
      size="md"
      (closed)="closeStudentAssignmentModal()"
    >
      <div modal-body>
        <form [formGroup]="studentAssignmentForm" class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <app-dropdown-filter
              label="Étudiant *"
              identifier="student-inscription-student"
              allLabel="Sélectionner un étudiant"
              [options]="studentOptions()"
              [value]="studentAssignmentValue('studentId')"
              iconClass="fa-solid fa-user-graduate"
              iconBackgroundClass="bg-primary-soft"
              (filterChange)="setStudentAssignmentValue('studentId', $event)"
            ></app-dropdown-filter>
          </div>

          <app-dropdown-filter
            label="Année universitaire *"
            identifier="student-inscription-year"
            allLabel="Sélectionner une année universitaire"
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
              [allLabel]="studentAssignmentValue('academicYearId') ? 'Sélectionner une formation' : 'Sélectionnez d’abord une année universitaire'"
              [options]="studentFormationOptions()"
              [value]="studentAssignmentValue('formationId')"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-secondary-soft"
              [disabled]="!studentAssignmentValue('academicYearId')"
            iconColor="secondary"
            (filterChange)="setStudentAssignmentValue('formationId', $event)"
          ></app-dropdown-filter>
            @if (studentAssignmentValue('academicYearId') && studentFormationOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">Aucune formation disponible pour cette année universitaire.</p>
            }
          </div>

          <div class="sm:col-span-2">
            <app-dropdown-filter
              label="Groupe *"
              identifier="student-inscription-group"
              [allLabel]="studentAssignmentValue('formationId') ? 'Sélectionner un groupe' : 'Sélectionnez d’abord une formation'"
              [options]="studentGroupOptions()"
              [value]="studentAssignmentValue('groupeId')"
              iconClass="fa-solid fa-users"
              iconBackgroundClass="bg-primary-soft"
              [disabled]="!studentAssignmentValue('formationId')"
              (filterChange)="setStudentAssignmentValue('groupeId', $event)"
            ></app-dropdown-filter>
            @if (studentAssignmentValue('formationId') && studentGroupOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">Aucun groupe disponible pour cette formation.</p>
            }
          </div>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <app-button
          label="Annuler"
          variant="outline"
          [fullWidth]="true"
          (clicked)="closeStudentAssignmentModal()"
        ></app-button>
        <app-button
          label="Enregistrer l’inscription"
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
      description="Affectez un enseignant existant à une année universitaire, une formation, un groupe et un module."
      size="md"
      (closed)="closeTeacherAssignmentModal()"
    >
      <div modal-body>
        <form [formGroup]="teacherAssignmentForm" class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <app-dropdown-filter
              label="Enseignant *"
              identifier="teacher-assignment-teacher"
              allLabel="Sélectionner un enseignant"
              [options]="teacherOptions()"
              [value]="teacherAssignmentValue('teacherId')"
              iconClass="fa-solid fa-chalkboard-user"
              iconBackgroundClass="bg-primary-soft"
              (filterChange)="setTeacherAssignmentValue('teacherId', $event)"
            ></app-dropdown-filter>
          </div>

          <app-dropdown-filter
            label="Année universitaire *"
            identifier="teacher-assignment-year"
            allLabel="Sélectionner une année universitaire"
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
              [allLabel]="teacherAssignmentValue('academicYearId') ? 'Sélectionner une formation' : 'Sélectionnez d’abord une année universitaire'"
              [options]="teacherFormationOptions()"
              [value]="teacherAssignmentValue('formationId')"
              iconClass="fa-solid fa-layer-group"
              iconBackgroundClass="bg-secondary-soft"
              [disabled]="!teacherAssignmentValue('academicYearId')"
            iconColor="secondary"
            (filterChange)="setTeacherAssignmentValue('formationId', $event)"
          ></app-dropdown-filter>
            @if (teacherAssignmentValue('academicYearId') && teacherFormationOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">Aucune formation disponible pour cette année universitaire.</p>
            }
          </div>

          <div>
            <app-dropdown-filter
              label="Groupe *"
              identifier="teacher-assignment-group"
              [allLabel]="teacherAssignmentValue('formationId') ? 'Sélectionner un groupe' : 'Sélectionnez d’abord une formation'"
              [options]="teacherGroupOptions()"
              [value]="teacherAssignmentValue('groupeId')"
              iconClass="fa-solid fa-users"
              iconBackgroundClass="bg-primary-soft"
              [disabled]="!teacherAssignmentValue('formationId')"
              (filterChange)="setTeacherAssignmentValue('groupeId', $event)"
            ></app-dropdown-filter>
            @if (teacherAssignmentValue('formationId') && teacherGroupOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">Aucun groupe disponible pour cette formation.</p>
            }
          </div>

          <div>
            <app-dropdown-filter
              label="Module *"
              identifier="teacher-assignment-module"
              [allLabel]="teacherAssignmentValue('formationId') ? 'Sélectionner un module' : 'Sélectionnez d’abord une formation'"
              [options]="teacherModuleOptions()"
              [value]="teacherAssignmentValue('moduleId')"
              iconClass="fa-solid fa-book"
              iconBackgroundClass="bg-secondary-soft"
              iconColor="secondary"
              [disabled]="!teacherAssignmentValue('formationId')"
              (filterChange)="setTeacherAssignmentValue('moduleId', $event)"
            ></app-dropdown-filter>
            @if (teacherAssignmentValue('formationId') && teacherModuleOptions().length === 0) {
              <p class="mt-2 text-xs font-medium text-secondaryText">Aucun module disponible pour cette formation.</p>
            }
          </div>
        </form>
      </div>

      <div modal-footer class="flex gap-2">
        <app-button
          label="Annuler"
          variant="outline"
          [fullWidth]="true"
          (clicked)="closeTeacherAssignmentModal()"
        ></app-button>
        <app-button
          label="Enregistrer l’affectation"
          [disabled]="teacherAssignmentForm.invalid || saving()"
          [loading]="saving()"
          [fullWidth]="true"
          (clicked)="submitTeacherAssignment()"
        ></app-button>
      </div>
    </app-modal>

    <app-delete-modal
      [open]="deleteStudentOpen()"
      title="Supprimer cette inscription ?"
      [itemName]="selectedStudentInscription() ? studentName(selectedStudentInscription()!) : ''"
      confirmMessage="You are about to delete inscription for:"
      warningMessage="Le compte étudiant reste dans la base. Seule cette ligne d’inscription est supprimée."
      deleteButtonLabel="Supprimer l’inscription"
      (closeRequested)="closeDeleteStudentAssignmentModal()"
      (confirmDelete)="confirmDeleteStudentAssignment()"
    ></app-delete-modal>

    <app-delete-modal
      [open]="deleteTeacherOpen()"
      title="Supprimer cette affectation d’enseignant ?"
      [itemName]="selectedTeacherAssignment() ? teacherName(selectedTeacherAssignment()!) : ''"
      confirmMessage="You are about to delete assignment for:"
      warningMessage="Le compte enseignant reste dans la base. Seule cette ligne d’affectation est supprimée."
      deleteButtonLabel="Supprimer l’affectation"
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
    () => `${this.studentInscriptions().length} inscription(s) étudiant - ${this.teacherAssignments().length} affectation(s) enseignant`,
  );
  readonly studentAssignmentTitle = computed(() =>
    this.editingStudentInscriptionId() ? 'Modifier l’inscription étudiant' : 'Affecter un étudiant',
  );
  readonly teacherAssignmentTitle = computed(() =>
    this.editingTeacherAssignmentId() ? 'Modifier l’affectation enseignant' : 'Affecter un enseignant',
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
      header: 'Étudiant',
      accessor: (row) => this.studentName(row),
      filterValue: (row) => [this.studentName(row), row.formationName, row.groupeName, row.academicYearName],
      sortable: false,
      width: '20rem',
    },
    {
      id: 'academicYear',
      header: 'Année universitaire',
      accessor: (row) => row.academicYearName,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Année universitaire',
        placeholder: 'Filtrer l’année',
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
        placeholder: 'Filtrer la formation',
      },
    },
    {
      id: 'groupe',
      header: 'Groupe',
      accessor: (row) => row.groupeName,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Groupe',
        placeholder: 'Filtrer le groupe',
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
      header: 'Enseignant',
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
        placeholder: 'Filtrer la formation',
      },
    },
    {
      id: 'scope',
      header: 'Périmètre',
      accessor: (row) => `${row.academicYearName} ${row.groupeName}`,
      sortable: false,
      filter: {
        type: 'text',
        label: 'Périmètre',
        placeholder: 'Année ou groupe',
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
        error: () => this.errorMessage.set('Impossible de charger les données d’inscription depuis les services backend.'),
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
      this.toast.error('Structure académique invalide', 'Sélectionnez une formation et un groupe appartenant à l’année universitaire sélectionnée.');
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
          this.toast.success(editingId ? 'Inscription mise à jour' : 'Inscription créée');
          this.closeStudentAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Échec de l’enregistrement', 'Vérifiez les relations académiques sélectionnées.'),
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
          this.toast.success('Inscription supprimée');
          this.closeDeleteStudentAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Échec de suppression'),
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
      this.toast.error('Structure académique invalide', 'Sélectionnez un groupe et un module appartenant à la formation sélectionnée.');
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
          this.toast.success(editingId ? 'Affectation mise à jour' : 'Affectation créée');
          this.closeTeacherAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Échec de l’enregistrement', 'Vérifiez les relations académiques sélectionnées.'),
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
          this.toast.success('Affectation supprimée');
          this.closeDeleteTeacherAssignmentModal();
          this.loadData();
        },
        error: () => this.toast.error('Échec de suppression'),
      });
  }

  studentName(row: AdminStudentInscriptionDto): string {
    return fullName(row.studentFirstName, row.studentLastName) || `Étudiant #${row.studentId}`;
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
