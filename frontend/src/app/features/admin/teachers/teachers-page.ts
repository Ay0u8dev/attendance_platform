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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, map, of, switchMap, throwError } from 'rxjs';

import {
  AdminDirectoryStatus,
  AdminImportResult,
  AdminTeacherDto,
  accountState,
  accountStatus,
  fullName,
  statusVariant,
} from '../../../core/admin/models/admin-user.model';
import {
  AdminTeacherAssignmentDto,
  AdminTeacherAssignmentRequest,
} from '../../../core/admin/models/admin-inscription.model';
import { AdminInscriptionService } from '../../../core/admin/services/admin-inscription.service';
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
import { Modal } from '../../../shared/components/modal/modal';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';

type Option = { readonly value: string; readonly label: string };

interface TeacherRow {
  readonly id: number;
  readonly name: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly pfpUrl: string | null;
  readonly status: AdminDirectoryStatus;
  readonly enabled: boolean;
  readonly firstLogin: boolean;
  readonly assignmentId: number | null;
  readonly assignmentCount: number;
  readonly academicYearId: number | null;
  readonly academicYearName: string;
  readonly formationId: number | null;
  readonly formationName: string;
  readonly groupeId: number | null;
  readonly groupeName: string;
  readonly moduleId: number | null;
  readonly moduleName: string;
}

@Component({
  selector: 'app-teachers-page',
  imports: [
    ReactiveFormsModule,
    Button,
    DataTable,
    DataTableCellDef,
    DeleteModal,
    DropdownFilter,
    Modal,
    StatusBadge,
    UserAvatar,
  ],
  template: `
    <section class="space-y-5">
      <header class="flex flex-col gap-4 rounded-[1.75rem] border border-line bg-surface px-5 py-6 shadow-card sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Présence académique</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-principalText">Enseignants</h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            #teacherImportInput
            type="file"
            accept=".xlsx"
            class="hidden"
            (change)="handleImportFile($event)"
          />
          <app-button
            label="Importer Excel"
            icon="fa-regular fa-file-excel"
            variant="outline"
            [fullWidth]="false"
            [loading]="importing()"
            (clicked)="openImportPicker()"
          ></app-button>
          <app-button
            label="Ajouter un enseignant"
            icon="fa-solid fa-plus"
            [fullWidth]="false"
            (clicked)="openAddTeacherModal()"
          ></app-button>
        </div>
      </header>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {{ errorMessage() }}
        </div>
      }

      <section class="rounded-[1.75rem] border border-line bg-surface p-4 shadow-card">
        <div class="grid items-end gap-3 xl:grid-cols-[minmax(17rem,1.2fr)_repeat(5,minmax(11rem,1fr))]">
          <label class="block text-sm font-semibold text-principalText">
            <span class="mb-2 flex items-center gap-2">
              <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-primary-soft text-primary">
                <i class="fa-solid fa-magnifying-glass text-sm" aria-hidden="true"></i>
              </span>
              Rechercher
            </span>
            <span class="relative block">
              <i
                class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs text-secondaryText"
                aria-hidden="true"
              ></i>
              <input
                type="search"
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                placeholder="Nom ou e-mail..."
                class="h-12 w-full rounded-2xl border border-line bg-surface px-11 text-sm font-medium text-principalText shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </span>
          </label>

          <app-dropdown-filter
            label="Année universitaire"
            identifier="teacher-year-filter"
            allLabel="Toutes les années"
            [options]="academicYearOptions()"
            [value]="filterValue(academicYearFilter())"
            iconClass="fa-regular fa-calendar"
            iconBackgroundClass="bg-warning-soft"
            iconColor="warning"
            (filterChange)="setAcademicYearFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Formation"
            identifier="teacher-formation-filter"
            allLabel="Toutes les formations"
            [options]="filterFormationOptions()"
            [value]="filterValue(formationFilter())"
            iconClass="fa-solid fa-layer-group"
            iconBackgroundClass="bg-secondary-soft"
            iconColor="secondary"
            (filterChange)="setFormationFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Groupe"
            identifier="teacher-group-filter"
            allLabel="Tous les groupes"
            [options]="filterGroupOptions()"
            [value]="filterValue(groupFilter())"
            iconClass="fa-solid fa-users"
            iconBackgroundClass="bg-primary-soft"
            (filterChange)="setGroupFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Module"
            identifier="teacher-module-filter"
            allLabel="Tous les modules"
            [options]="filterModuleOptions()"
            [value]="filterValue(moduleFilter())"
            iconClass="fa-solid fa-book"
            iconBackgroundClass="bg-secondary-soft"
            iconColor="secondary"
            (filterChange)="setModuleFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Statut du compte"
            identifier="teacher-status-filter"
            allLabel="Tous les statuts"
            [options]="statusOptions"
            [value]="filterValue(statusFilter())"
            iconClass="fa-solid fa-circle-check"
            iconBackgroundClass="bg-warning-soft"
            iconColor="warning"
            (filterChange)="setStatusFilter($event)"
          ></app-dropdown-filter>
        </div>
      </section>

      <app-data-table
        searchPlaceholder="Rechercher des enseignants..."
        emptyStateTitle="Aucun enseignant trouvé"
        emptyStateDescription="Ajustez les filtres ou ajoutez un enseignant."
        [rows]="filteredTeachers()"
        [columns]="columns"
        [rowId]="rowId"
        [initialPageSize]="10"
        [showToolbar]="false"
        [showResultSummary]="false"
        [showColumnFilters]="false"
        [showColumnVisibility]="false"
        [rowClickable]="true"
        paginationPlacement="top"
        (rowClicked)="openTeacherDetails($event)"
      >
        <ng-template [appDataTableCell]="'teacher'" let-row="row">
          <div class="flex min-w-0 items-center gap-4">
            <app-user-avatar
              [name]="row.name"
              [imageUrl]="row.pfpUrl"
              size="lg"
              shape="rounded"
            ></app-user-avatar>
            <div class="min-w-0">
              <p class="truncate text-[0.95rem] font-semibold text-principalText">{{ row.name }}</p>
              <p class="mt-0.5 truncate text-[0.8rem] text-secondaryText">{{ row.email }}</p>
            </div>
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'assignment'" let-row="row">
          <div class="space-y-1.5">
            <p class="font-semibold text-principalText">{{ row.moduleName }}</p>
            @if (row.assignmentCount > 1) {
              <span class="inline-flex rounded-full border border-primary-soft bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                {{ row.assignmentCount }} affectations au total
              </span>
            }
          </div>
        </ng-template>

        <ng-template [appDataTableCell]="'status'" let-row="row">
          <app-status-badge [label]="statusLabel(row.status)" [variant]="statusVariant(row.status)"></app-status-badge>
        </ng-template>
      </app-data-table>
    </section>

    <app-modal
      [open]="teacherFormOpen()"
      [title]="formTitle()"
      [description]="formDescription()"
      size="lg"
      (closed)="closeTeacherFormModal()"
    >
      <div modal-body>
        <form [formGroup]="teacherForm" class="grid gap-5 sm:grid-cols-2">
          <div class="form-section-title sm:col-span-2">
            <span class="form-section-icon bg-primary-soft text-primary">
              <i class="fa-solid fa-id-card" aria-hidden="true"></i>
            </span>
            <div>
              <h3>Informations d'identité</h3>
              <p>Données principales du compte enseignant utilisées par les sessions et affectations.</p>
            </div>
          </div>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Prénom *</span>
            <input type="text" formControlName="firstName" class="form-input" />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Nom *</span>
            <input type="text" formControlName="lastName" class="form-input" />
          </label>

          <label class="space-y-1 sm:col-span-2">
            <span class="text-sm font-medium text-principalText">E-mail *</span>
            <input type="email" formControlName="email" class="form-input" />
            <span class="text-xs text-secondaryText">Utilisez le domaine de l'école : @ump.ac.ma</span>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Statut du compte *</span>
            <select formControlName="status" class="form-input">
              <option value="Enabled">Activé</option>
              <option value="Suspended">Suspendu</option>
            </select>
          </label>

          <div class="form-section-title sm:col-span-2">
            <span class="form-section-icon bg-secondary-soft text-secondary">
              <i class="fa-solid fa-chalkboard-user" aria-hidden="true"></i>
            </span>
            <div>
              <h3>Affectation d'enseignement</h3>
              <p>Affectez l'enseignant à une année, une formation, un groupe et un module valides.</p>
            </div>
          </div>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Année universitaire *</span>
            <select formControlName="academicYearId" class="form-input" (change)="onFormYearChange()">
              <option value="">Sélectionner une année universitaire</option>
              @for (year of academicYears(); track year.id) {
                <option [value]="year.id">{{ year.name }}{{ year.active ? ' (active)' : '' }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Formation *</span>
            <select formControlName="formationId" class="form-input" (change)="onFormFormationChange()" [disabled]="!teacherForm.controls.academicYearId.value">
              <option value="">{{ teacherForm.controls.academicYearId.value ? 'Sélectionner une formation' : 'Sélectionnez d'abord une année universitaire' }}</option>
              @for (formation of formFormationOptions(); track formation.id) {
                <option [value]="formation.id">{{ formation.name }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Groupe *</span>
            <select formControlName="groupeId" class="form-input" [disabled]="!teacherForm.controls.formationId.value">
              <option value="">{{ teacherForm.controls.formationId.value ? 'Sélectionner un groupe' : 'Sélectionnez d'abord une formation' }}</option>
              @for (group of formGroupOptions(); track group.id) {
                <option [value]="group.id">{{ group.name }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Module *</span>
            <select formControlName="moduleId" class="form-input" [disabled]="!teacherForm.controls.formationId.value">
              <option value="">{{ teacherForm.controls.formationId.value ? 'Sélectionner un module' : 'Sélectionnez d'abord une formation' }}</option>
              @for (module of formModuleOptions(); track module.id) {
                <option [value]="module.id">{{ module.name }}</option>
              }
            </select>
          </label>
        </form>
      </div>

      <div modal-footer class="flex w-full items-center justify-end gap-3">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeTeacherFormModal()"></app-button>
        <app-button
          [label]="formSubmitLabel()"
          [disabled]="teacherForm.invalid || saving()"
          [loading]="saving()"
          [fullWidth]="false"
          (clicked)="submitTeacherForm()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="teacherDetailsOpen()"
      [title]="selectedTeacher()?.name || 'Profil enseignant'"
      description="Identité et affectation d'enseignement."
      size="lg"
      [showFooter]="false"
      (closed)="closeTeacherDetails()"
    >
      <div modal-body>
        @if (selectedTeacher(); as teacher) {
          <div class="space-y-5">
            <section class="flex flex-col gap-4 rounded-3xl border border-line bg-surface-subtle p-5 sm:flex-row sm:items-center">
              <app-user-avatar
                [name]="teacher.name"
                [imageUrl]="teacher.pfpUrl"
                size="lg"
                shape="rounded"
              ></app-user-avatar>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-2xl font-semibold text-principalText">{{ teacher.name }}</h3>
                <p class="mt-1 text-sm text-secondaryText">{{ teacher.email }}</p>
              </div>
              <app-status-badge [label]="teacher.status" [variant]="statusVariant(teacher.status)"></app-status-badge>
            </section>

            <section class="rounded-3xl border border-line bg-surface p-5">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Affectations d’enseignement</p>
                  <h4 class="mt-1 text-lg font-semibold text-principalText">Groupes et modules</h4>
                </div>
                <button
                  type="button"
                  class="profile-action-button text-primary hover:border-primary-soft hover:bg-primary-soft"
                  title="Ajouter une affectation"
                  aria-label="Ajouter une affectation d’enseignement"
                  (click)="openAddAssignmentModal(teacher)"
                >
                  <i class="fa-solid fa-plus text-xs" aria-hidden="true"></i>
                </button>
              </div>

              <div class="mt-4 grid gap-3">
                @for (assignment of assignmentsForTeacher(teacher.id); track assignment.id) {
                  <article class="rounded-2xl border border-line bg-surface-subtle p-4">
                    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div class="min-w-0">
                        <h5 class="truncate font-semibold text-principalText">{{ assignment.moduleName }}</h5>
                        <p class="mt-1 text-sm text-secondaryText">
                          {{ assignment.academicYearName }} · {{ assignment.formationName }} · {{ assignment.groupeName }}
                        </p>
                        <span class="mt-2 inline-flex rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-secondaryText">
                          {{ assignment.moduleCode }}
                        </span>
                      </div>
                      <button
                        type="button"
                        class="profile-action-button h-10 w-10 text-danger hover:border-danger/20 hover:bg-danger-soft"
                        title="Remove assignment"
                        aria-label="Remove teaching assignment"
                        (click)="deleteTeacherAssignment(assignment)"
                      >
                        <i class="fa-regular fa-trash-can text-[11px]" aria-hidden="true"></i>
                      </button>
                    </div>
                  </article>
                } @empty {
                  <div class="rounded-2xl border border-dashed border-line bg-surface-subtle px-4 py-6 text-center">
                    <p class="font-semibold text-principalText">Aucune affectation pour le moment</p>
                    <p class="mt-1 text-sm text-secondaryText">Ajoutez une responsabilité de groupe et de module pour cet enseignant.</p>
                  </div>
                }
              </div>
            </section>

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="profile-action-button text-primary hover:border-primary-soft hover:bg-primary-soft"
                title="Modifier le profil"
                aria-label="Modifier le profil enseignant"
                (click)="openEditTeacherModal(teacher)"
              >
                <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="profile-action-button text-secondaryText hover:border-warning-soft hover:bg-warning-soft hover:text-warning"
                [title]="teacher.status === 'Enabled' ? 'Suspendre l’enseignant' : 'Activer l’enseignant'"
                [attr.aria-label]="teacher.status === 'Enabled' ? 'Suspendre l’enseignant' : 'Activer l’enseignant'"
                (click)="toggleTeacherStatus(teacher)"
              >
                <i
                  class="fa-solid"
                  [class.fa-user-slash]="teacher.status === 'Enabled'"
                  [class.fa-user-check]="teacher.status !== 'Enabled'"
                  aria-hidden="true"
                ></i>
              </button>
              <button
                type="button"
                class="profile-action-button text-danger hover:border-danger/20 hover:bg-danger-soft"
                title="Supprimer l’enseignant"
                aria-label="Supprimer l’enseignant"
                (click)="openDeleteTeacherModal(teacher)"
              >
                <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        }
      </div>
    </app-modal>

    <app-modal
      [open]="assignmentFormOpen()"
      title="Ajouter une affectation d’enseignement"
      description="Rattachez cet enseignant à une année universitaire, une formation, un groupe et un module."
      size="lg"
      (closed)="closeAssignmentFormModal()"
    >
      <div modal-body>
        @if (assignmentTeacher(); as teacher) {
          <section class="mb-5 flex items-center gap-3 rounded-2xl border border-line bg-surface-subtle p-4">
            <app-user-avatar
              [name]="teacher.name"
              [imageUrl]="teacher.pfpUrl"
              size="lg"
              shape="rounded"
            ></app-user-avatar>
            <div class="min-w-0">
              <h3 class="truncate font-semibold text-principalText">{{ teacher.name }}</h3>
              <p class="truncate text-sm text-secondaryText">{{ teacher.email }}</p>
            </div>
          </section>
        }

        <form [formGroup]="assignmentForm" class="grid gap-5 sm:grid-cols-2">
          <div class="form-section-title sm:col-span-2">
            <span class="form-section-icon bg-secondary-soft text-secondary">
              <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            </span>
            <div>
              <h3>Périmètre d’affectation</h3>
              <p>Seuls les formations, groupes et modules compatibles sont listés.</p>
            </div>
          </div>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Année universitaire *</span>
            <select formControlName="academicYearId" class="form-input" (change)="onAssignmentFormYearChange()">
              <option value="">Sélectionner une année universitaire</option>
              @for (year of academicYears(); track year.id) {
                <option [value]="year.id">{{ year.name }}{{ year.active ? ' (active)' : '' }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Formation *</span>
            <select formControlName="formationId" class="form-input" (change)="onAssignmentFormFormationChange()" [disabled]="!assignmentForm.controls.academicYearId.value">
              <option value="">{{ assignmentForm.controls.academicYearId.value ? 'Sélectionner une formation' : 'Sélectionnez d'abord une année universitaire' }}</option>
              @for (formation of assignmentFormFormationOptions(); track formation.id) {
                <option [value]="formation.id">{{ formation.name }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Groupe *</span>
            <select formControlName="groupeId" class="form-input" [disabled]="!assignmentForm.controls.formationId.value">
              <option value="">{{ assignmentForm.controls.formationId.value ? 'Sélectionner un groupe' : 'Sélectionnez d'abord une formation' }}</option>
              @for (group of assignmentFormGroupOptions(); track group.id) {
                <option [value]="group.id">{{ group.name }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Module *</span>
            <select formControlName="moduleId" class="form-input" [disabled]="!assignmentForm.controls.formationId.value">
              <option value="">{{ assignmentForm.controls.formationId.value ? 'Sélectionner un module' : 'Sélectionnez d'abord une formation' }}</option>
              @for (module of assignmentFormModuleOptions(); track module.id) {
                <option [value]="module.id">{{ module.name }}</option>
              }
            </select>
          </label>
        </form>
      </div>

      <div modal-footer class="flex justify-end gap-2">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeAssignmentFormModal()"></app-button>
        <app-button
          label="Ajouter une affectation"
          [disabled]="assignmentForm.invalid || assignmentSaving()"
          [loading]="assignmentSaving()"
          [fullWidth]="false"
          (clicked)="submitAssignmentForm()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="importResult() !== null"
      title="Résumé d’import des enseignants"
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
                <h3 class="font-semibold text-danger">Lignes avec erreurs</h3>
                <div class="mt-3 max-h-56 space-y-2 overflow-y-auto">
                  @for (error of result.errors; track error.rowNumber + '-' + error.field + '-' + error.message) {
                    <p class="rounded-xl bg-surface px-3 py-2 text-sm text-principalText">
                      Ligne {{ error.rowNumber ?? '-' }}: {{ error.field ?? 'ligne' }} - {{ error.message ?? 'Erreur d’import' }}
                    </p>
                  }
                </div>
              </section>
            }

            @if ((result.warnings?.length ?? 0) > 0) {
              <section class="rounded-2xl border border-warning-soft bg-warning-soft p-4">
                <h3 class="font-semibold text-warning-strong">Avertissements</h3>
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
      title="Supprimer cet enseignant ?"
      [itemName]="teacherToDelete()?.name || ''"
      confirmMessage="Vous êtes sur le point de supprimer :"
      warningMessage="Les relations en base peuvent bloquer la suppression si cet enseignant a des affectations ou des sessions de présence."
      deleteButtonLabel="Supprimer l’enseignant"
      (closeRequested)="closeDeleteTeacherModal()"
      (confirmDelete)="confirmDeleteTeacher()"
    ></app-delete-modal>
  `,
  styles: `
    .form-input {
      width: 100%;
      border-radius: 0.75rem;
      border: 1px solid var(--color-line);
      background: var(--color-surface);
      padding: 0.75rem 0.875rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-principalText);
      outline: none;
      box-shadow: var(--shadow-card);
      transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
    }

    .form-input:hover {
      border-color: var(--color-line-strong);
    }

    .form-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 12%, transparent);
    }

    .form-input:disabled {
      cursor: not-allowed;
      background: var(--color-surface-subtle);
      color: var(--color-muted);
      opacity: 0.7;
    }

    .form-section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border-radius: 1rem;
      border: 1px solid var(--color-line);
      background: var(--color-surface-subtle);
      padding: 0.875rem 1rem;
    }

    .form-section-icon {
      display: inline-flex;
      height: 2.25rem;
      width: 2.25rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 0.75rem;
      border: 1px solid var(--color-line);
      font-size: 0.875rem;
    }

    .form-section-title h3 {
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--color-principalText);
    }

    .form-section-title p {
      margin-top: 0.125rem;
      font-size: 0.75rem;
      color: var(--color-secondaryText);
    }

    .profile-action-button {
      display: inline-flex;
      height: 2.75rem;
      width: 2.75rem;
      align-items: center;
      justify-content: center;
      border-radius: 0.9rem;
      border: 1px solid var(--color-line);
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
    }

    .profile-action-button:hover {
      transform: translateY(-1px);
    }

    .profile-action-button:focus-visible {
      outline: none;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 14%, transparent);
    }

    .detail-card {
      border-radius: 1rem;
      border: 1px solid var(--color-line);
      background: var(--color-surface);
      padding: 1rem;
    }

    .detail-card span {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-muted);
    }

    .detail-card strong {
      margin-top: 0.35rem;
      display: block;
      color: var(--color-principalText);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachersPage {
  private readonly fb = inject(FormBuilder);
  private readonly teacherService = inject(AdminTeacherService);
  private readonly inscriptionService = inject(AdminInscriptionService);
  private readonly yearService = inject(AnneeUniversitaireService);
  private readonly formationService = inject(FormationService);
  private readonly groupService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('teacherImportInput');

  readonly statusOptions: readonly Option[] = [
    { value: 'Enabled', label: 'Activé' },
    { value: 'Suspended', label: 'Suspendu' },
  ];

  readonly teachers = signal<readonly TeacherRow[]>([]);
  readonly academicYears = signal<readonly AnneeUniversitaire[]>([]);
  readonly formations = signal<readonly Formation[]>([]);
  readonly groups = signal<readonly Groupe[]>([]);
  readonly modules = signal<readonly Module[]>([]);
  readonly assignments = signal<readonly AdminTeacherAssignmentDto[]>([]);
  readonly searchQuery = signal('');
  readonly academicYearFilter = signal('all');
  readonly formationFilter = signal('all');
  readonly groupFilter = signal('all');
  readonly moduleFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly formAcademicYearId = signal('');
  readonly formFormationId = signal('');
  readonly isLoading = signal(false);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly teacherFormOpen = signal(false);
  readonly teacherDetailsOpen = signal(false);
  readonly assignmentFormOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly selectedTeacher = signal<TeacherRow | null>(null);
  readonly assignmentTeacher = signal<TeacherRow | null>(null);
  readonly teacherToDelete = signal<TeacherRow | null>(null);
  readonly editingTeacherId = signal<number | null>(null);
  readonly importResult = signal<AdminImportResult | null>(null);
  readonly assignmentSaving = signal(false);
  readonly rowId = (row: TeacherRow) => String(row.id);

  readonly teacherForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254), Validators.pattern(/^[^\s@]+@ump\.ac\.ma$/i)]],
    status: ['Enabled' as AdminDirectoryStatus, [Validators.required]],
    academicYearId: ['', [Validators.required]],
    formationId: ['', [Validators.required]],
    groupeId: ['', [Validators.required]],
    moduleId: ['', [Validators.required]],
  });

  readonly assignmentForm = this.fb.nonNullable.group({
    academicYearId: ['', [Validators.required]],
    formationId: ['', [Validators.required]],
    groupeId: ['', [Validators.required]],
    moduleId: ['', [Validators.required]],
  });

  readonly formTitle = computed(() => (this.editingTeacherId() ? 'Modifier l’enseignant' : 'Ajouter un enseignant'));
  readonly formDescription = computed(() =>
    this.editingTeacherId()
      ? 'Mettre à jour l’identité et l’affectation d’enseignement.'
      : 'Créer l’enseignant et affecter ses responsabilités de groupe/module dans le même flux.',
  );
  readonly formSubmitLabel = computed(() => (this.editingTeacherId() ? 'Enregistrer les modifications' : 'Ajouter l’enseignant'));
  readonly academicYearOptions = computed<Option[]>(() =>
    this.academicYears().map((year) => ({ value: String(year.id), label: year.name })),
  );
  readonly filterFormationOptions = computed<Option[]>(() =>
    this.formationsForYear(this.academicYearFilter()).map((formation) => ({
      value: String(formation.id),
      label: formation.name,
    })),
  );
  readonly filterGroupOptions = computed<Option[]>(() =>
    this.groupsForFormation(this.formationFilter()).map((group) => ({
      value: String(group.id),
      label: group.name,
    })),
  );
  readonly filterModuleOptions = computed<Option[]>(() =>
    this.modulesForFormation(this.formationFilter()).map((module) => ({
      value: String(module.id),
      label: module.name,
    })),
  );
  readonly formFormationOptions = computed(() => this.formationsForYear(this.formAcademicYearId() || 'all'));
  readonly formGroupOptions = computed(() => this.groupsForFormation(this.formFormationId() || 'all'));
  readonly formModuleOptions = computed(() => this.modulesForFormation(this.formFormationId() || 'all'));
  readonly assignmentFormAcademicYearId = signal('');
  readonly assignmentFormFormationId = signal('');
  readonly assignmentFormFormationOptions = computed(() =>
    this.formationsForYear(this.assignmentFormAcademicYearId() || 'all'),
  );
  readonly assignmentFormGroupOptions = computed(() =>
    this.groupsForFormation(this.assignmentFormFormationId() || 'all'),
  );
  readonly assignmentFormModuleOptions = computed(() =>
    this.modulesForFormation(this.assignmentFormFormationId() || 'all'),
  );
  readonly filteredTeachers = computed(() => {
    const search = this.searchQuery().trim().toLowerCase();
    const year = this.academicYearFilter();
    const formation = this.formationFilter();
    const group = this.groupFilter();
    const module = this.moduleFilter();
    const status = this.statusFilter();

    return this.teachers().filter((teacher) => {
      const teacherAssignments = this.assignmentsForTeacher(teacher.id);
      const matchesAssignment = (predicate: (assignment: AdminTeacherAssignmentDto) => boolean) =>
        teacherAssignments.some(predicate);

      if (year !== 'all' && !matchesAssignment((assignment) => String(assignment.academicYearId) === year)) return false;
      if (formation !== 'all' && !matchesAssignment((assignment) => String(assignment.formationId) === formation)) return false;
      if (group !== 'all' && !matchesAssignment((assignment) => String(assignment.groupeId) === group)) return false;
      if (module !== 'all' && !matchesAssignment((assignment) => String(assignment.moduleId) === module)) return false;
      if (status !== 'all' && teacher.status !== status) return false;
      if (!search) return true;

      const assignmentText = teacherAssignments
        .map((assignment) =>
          [
            assignment.academicYearName,
            assignment.formationName,
            assignment.groupeName,
            assignment.moduleCode,
            assignment.moduleName,
          ].join(' '),
        )
        .join(' ');

      return [teacher.name, teacher.email, assignmentText]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  });

  readonly columns: readonly DataTableColumn<TeacherRow>[] = [
    { id: 'teacher', header: 'Enseignant', accessor: (row) => row.name, sortable: false, width: '22rem' },
    { id: 'status', header: 'Statut du compte', accessor: (row) => row.status, sortable: false, width: '11rem' },
    { id: 'year', header: 'Année universitaire', accessor: (row) => row.academicYearName, sortable: false, width: '12rem' },
    { id: 'formation', header: 'Formation', accessor: (row) => row.formationName, sortable: false, width: '14rem' },
    { id: 'group', header: 'Groupe', accessor: (row) => row.groupeName, sortable: false, width: '10rem' },
    { id: 'assignment', header: 'Module', accessor: (row) => row.moduleName, sortable: false, width: '15rem' },
  ];

  constructor() {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      teachers: this.teacherService.getAll(),
      assignments: this.inscriptionService.getTeacherAssignments().pipe(catchError(() => of([] as readonly AdminTeacherAssignmentDto[]))),
      academicYears: this.yearService.getAll().pipe(catchError(() => of([] as readonly AnneeUniversitaire[]))),
      formations: this.formationService.getAll().pipe(catchError(() => of([] as readonly Formation[]))),
      groups: this.groupService.getAll().pipe(catchError(() => of([] as readonly Groupe[]))),
      modules: this.moduleService.getAll().pipe(catchError(() => of([] as readonly Module[]))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ teachers, assignments, academicYears, formations, groups, modules }) => {
          this.assignments.set(assignments);
          this.academicYears.set(academicYears);
          this.formations.set(formations);
          this.groups.set(groups);
          this.modules.set(modules);
          this.teachers.set(teachers.map((teacher) => this.toRow(teacher, assignments)));
        },
        error: () => this.errorMessage.set('Unable to load teachers from user-service.'),
      });
  }

  onSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchQuery.set(target.value);
    }
  }

  setAcademicYearFilter(value: string | null): void {
    this.academicYearFilter.set(value ?? 'all');
    this.formationFilter.set('all');
    this.groupFilter.set('all');
    this.moduleFilter.set('all');
  }

  setFormationFilter(value: string | null): void {
    this.formationFilter.set(value ?? 'all');
    this.groupFilter.set('all');
    this.moduleFilter.set('all');
  }

  setGroupFilter(value: string | null): void {
    this.groupFilter.set(value ?? 'all');
  }

  setModuleFilter(value: string | null): void {
    this.moduleFilter.set(value ?? 'all');
  }

  setStatusFilter(value: string | null): void {
    this.statusFilter.set(value ?? 'all');
  }

  filterValue(value: string): string | null {
    return value === 'all' ? null : value;
  }

  onFormYearChange(): void {
    this.formAcademicYearId.set(this.teacherForm.controls.academicYearId.value);
    this.formFormationId.set('');
    this.teacherForm.patchValue({ formationId: '', groupeId: '', moduleId: '' });
  }

  onFormFormationChange(): void {
    this.formFormationId.set(this.teacherForm.controls.formationId.value);
    this.teacherForm.patchValue({ groupeId: '', moduleId: '' });
  }

  openImportPicker(): void {
    this.importInput()?.nativeElement.click();
  }

  handleImportFile(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) return;

    const file = input.files[0];
    input.value = '';
    this.importing.set(true);
    this.teacherService.importExcel(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importing.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.importResult.set(result);
          this.showImportToast('Enseignant', result);
          this.loadTeachers();
        },
        error: () => this.toast.error('Échec de l’import des enseignants', 'Vérifiez le format Excel et les journaux backend.'),
      });
  }

  closeImportResult(): void {
    this.importResult.set(null);
  }

  openAddTeacherModal(): void {
    this.editingTeacherId.set(null);
    this.teacherForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      status: 'Enabled',
      academicYearId: '',
      formationId: '',
      groupeId: '',
      moduleId: '',
    });
    this.formAcademicYearId.set('');
    this.formFormationId.set('');
    this.teacherFormOpen.set(true);
  }

  openEditTeacherModal(teacher: TeacherRow): void {
    this.teacherDetailsOpen.set(false);
    this.selectedTeacher.set(null);
    this.editingTeacherId.set(teacher.id);
    this.teacherForm.reset({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      status: teacher.status,
      academicYearId: teacher.academicYearId ? String(teacher.academicYearId) : '',
      formationId: teacher.formationId ? String(teacher.formationId) : '',
      groupeId: teacher.groupeId ? String(teacher.groupeId) : '',
      moduleId: teacher.moduleId ? String(teacher.moduleId) : '',
    });
    this.formAcademicYearId.set(teacher.academicYearId ? String(teacher.academicYearId) : '');
    this.formFormationId.set(teacher.formationId ? String(teacher.formationId) : '');
    this.teacherFormOpen.set(true);
  }

  closeTeacherFormModal(): void {
    this.teacherFormOpen.set(false);
    this.editingTeacherId.set(null);
    this.teacherForm.reset();
  }

  submitTeacherForm(): void {
    if (this.teacherForm.invalid) {
      this.teacherForm.markAllAsTouched();
      return;
    }

    const value = this.teacherForm.getRawValue();
    const state = accountState(value.status);
    const teacherPayload = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      pfpUrl: this.currentEditedRow()?.pfpUrl ?? null,
      enabled: state.enabled,
      firstLogin: state.firstLogin,
    };
    const editingId = this.editingTeacherId();

    const request = editingId
      ? this.teacherService.update(editingId, teacherPayload).pipe(
          switchMap((teacher) => this.saveAssignment(teacher.id, this.currentEditedRow()?.assignmentId ?? null)),
        )
      : this.teacherService.create(teacherPayload).pipe(
          switchMap((teacher) =>
            this.saveAssignment(teacher.id, null).pipe(
              catchError((error: unknown) =>
                this.teacherService.delete(teacher.id).pipe(
                  switchMap(() => throwError(() => error)),
                  catchError(() => throwError(() => error)),
                ),
              ),
            ),
          ),
        );

    this.saving.set(true);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(editingId ? 'Enseignant mis à jour' : 'Enseignant créé');
          this.closeTeacherFormModal();
          this.loadTeachers();
        },
        error: () => this.toast.error('Échec de l’enregistrement de l’enseignant', 'Vérifiez les champs d’identité et l’affectation d’enseignement.'),
      });
  }

  openTeacherDetails(teacher: TeacherRow): void {
    this.selectedTeacher.set(teacher);
    this.teacherDetailsOpen.set(true);
  }

  closeTeacherDetails(): void {
    this.teacherDetailsOpen.set(false);
    this.selectedTeacher.set(null);
  }

  openAddAssignmentModal(teacher: TeacherRow): void {
    this.teacherDetailsOpen.set(false);
    this.selectedTeacher.set(null);
    this.assignmentTeacher.set(teacher);
    this.assignmentForm.reset({
      academicYearId: '',
      formationId: '',
      groupeId: '',
      moduleId: '',
    });
    this.assignmentFormAcademicYearId.set('');
    this.assignmentFormFormationId.set('');
    this.assignmentFormOpen.set(true);
  }

  closeAssignmentFormModal(): void {
    this.assignmentFormOpen.set(false);
    this.assignmentTeacher.set(null);
    this.assignmentForm.reset();
    this.assignmentFormAcademicYearId.set('');
    this.assignmentFormFormationId.set('');
  }

  onAssignmentFormYearChange(): void {
    this.assignmentFormAcademicYearId.set(this.assignmentForm.controls.academicYearId.value);
    this.assignmentFormFormationId.set('');
    this.assignmentForm.patchValue({ formationId: '', groupeId: '', moduleId: '' });
  }

  onAssignmentFormFormationChange(): void {
    this.assignmentFormFormationId.set(this.assignmentForm.controls.formationId.value);
    this.assignmentForm.patchValue({ groupeId: '', moduleId: '' });
  }

  submitAssignmentForm(): void {
    const teacher = this.assignmentTeacher();
    if (!teacher || this.assignmentForm.invalid) {
      this.assignmentForm.markAllAsTouched();
      return;
    }

    const value = this.assignmentForm.getRawValue();
    const payload: AdminTeacherAssignmentRequest = {
      teacherId: teacher.id,
      academicYearId: Number(value.academicYearId),
      formationId: Number(value.formationId),
      groupeId: Number(value.groupeId),
      moduleId: Number(value.moduleId),
    };

    this.assignmentSaving.set(true);
    this.inscriptionService
      .createTeacherAssignment(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.assignmentSaving.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success('Affectation ajoutée');
          this.closeAssignmentFormModal();
          this.loadTeachers();
        },
        error: () => this.toast.error('Échec de l’enregistrement de l’affectation', 'Vérifiez l’année universitaire, la formation, le groupe et le module.'),
      });
  }

  deleteTeacherAssignment(assignment: AdminTeacherAssignmentDto): void {
    this.inscriptionService
      .deleteTeacherAssignment(assignment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Affectation supprimée');
          this.loadTeachers();
        },
        error: () => this.toast.error('Échec de suppression de l’affectation', 'Cette affectation est peut-être utilisée par une session.'),
      });
  }

  toggleTeacherStatus(teacher: TeacherRow): void {
    const nextStatus: AdminDirectoryStatus = teacher.status === 'Enabled' ? 'Suspended' : 'Enabled';
    const state = accountState(nextStatus);
    this.teacherService.update(teacher.id, {
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      pfpUrl: teacher.pfpUrl,
      enabled: state.enabled,
      firstLogin: state.firstLogin,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(nextStatus === 'Enabled' ? 'Enseignant activé' : 'Enseignant suspendu');
        this.closeTeacherDetails();
        this.loadTeachers();
      },
      error: () => this.toast.error('Échec de mise à jour du statut'),
    });
  }

  openDeleteTeacherModal(teacher: TeacherRow): void {
    this.teacherToDelete.set(teacher);
    this.deleteOpen.set(true);
  }

  closeDeleteTeacherModal(): void {
    this.deleteOpen.set(false);
    this.teacherToDelete.set(null);
  }

  confirmDeleteTeacher(): void {
    const teacher = this.teacherToDelete();
    if (!teacher) return;

    this.teacherService.delete(teacher.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Enseignant supprimé');
        this.closeDeleteTeacherModal();
        this.closeTeacherDetails();
        this.loadTeachers();
      },
      error: () => this.toast.error('Échec de suppression', 'Cet enseignant peut être référencé par des affectations ou des sessions.'),
    });
  }

  statusVariant(status: AdminDirectoryStatus): 'success' | 'warning' | 'error' | 'neutral' {
    return statusVariant(status);
  }

  assignmentsForTeacher(teacherId: number): readonly AdminTeacherAssignmentDto[] {
    return this.assignments().filter((assignment) => assignment.teacherId === teacherId);
  }

  importStatusMessage(result: AdminImportResult | null): string {
    if (!result) return '';
    if ((result.failedRows ?? result.rowsRejected ?? 0) > 0 || (result.errors?.length ?? 0) > 0) {
      return 'Import terminé avec des erreurs. Vérifiez les lignes ci-dessous avant de réimporter.';
    }
    if ((result.warningsCount ?? result.warnings?.length ?? 0) > 0) return 'Import terminé avec des avertissements.';
    return 'Import terminé avec succès.';
  }

  importMetrics(result: AdminImportResult): ReadonlyArray<{ readonly label: string; readonly value: number }> {
    return [
      { label: 'Lignes totales', value: result.totalRows ?? 0 },
      { label: 'Enseignants créés', value: result.createdTeachers ?? result.teachersCreated ?? 0 },
      { label: 'Enseignants mis à jour', value: result.updatedTeachers ?? result.teachersUpdated ?? 0 },
      { label: 'Affectations', value: result.createdAssignments ?? result.assignmentsCreated ?? 0 },
      { label: 'Doublons', value: result.duplicatesSkipped ?? ((result.duplicateAssignments ?? 0) + (result.duplicateAssignmentsInsideFile ?? 0)) },
      { label: 'Rejetées', value: result.failedRows ?? result.rowsRejected ?? 0 },
      { label: 'Avertissements', value: result.warningsCount ?? result.warnings?.length ?? 0 },
      { label: 'Erreurs', value: result.errorsCount ?? result.errors?.length ?? 0 },
    ];
  }

  statusLabel(status: AdminDirectoryStatus): string {
    return status === 'Enabled' ? 'Activé' : 'Suspendu';
  }

  private saveAssignment(teacherId: number, assignmentId: number | null) {
    const payload = this.assignmentPayload(teacherId);
    return (assignmentId
      ? this.inscriptionService.updateTeacherAssignment(assignmentId, payload)
      : this.inscriptionService.createTeacherAssignment(payload)).pipe(map(() => teacherId));
  }

  private assignmentPayload(teacherId: number): AdminTeacherAssignmentRequest {
    const value = this.teacherForm.getRawValue();
    return {
      teacherId,
      academicYearId: Number(value.academicYearId),
      formationId: Number(value.formationId),
      groupeId: Number(value.groupeId),
      moduleId: Number(value.moduleId),
    };
  }

  private currentEditedRow(): TeacherRow | null {
    const id = this.editingTeacherId();
    return id ? this.teachers().find((teacher) => teacher.id === id) ?? null : null;
  }

  private formationsForYear(yearId: string): readonly Formation[] {
    return this.formations().filter((formation) => yearId === 'all' || String(formation.anneeUniversitaireId) === yearId);
  }

  private groupsForFormation(formationId: string): readonly Groupe[] {
    return this.groups().filter((group) => formationId === 'all' || String(group.formationId) === formationId);
  }

  private modulesForFormation(formationId: string): readonly Module[] {
    return this.modules().filter((module) => formationId === 'all' || String(module.formationId) === formationId);
  }

  private toRow(teacher: AdminTeacherDto, assignments: readonly AdminTeacherAssignmentDto[]): TeacherRow {
    const teacherAssignments = assignments.filter((item) => item.teacherId === teacher.id);
    const assignment = teacherAssignments[0] ?? null;
    const name = fullName(teacher.firstName, teacher.lastName) || teacher.email;
    return {
      id: teacher.id,
      name,
      email: teacher.email,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      pfpUrl: teacher.pfpUrl,
      enabled: teacher.enabled,
      firstLogin: teacher.firstLogin,
      status: accountStatus(teacher.enabled, teacher.firstLogin),
      assignmentId: assignment?.id ?? null,
      assignmentCount: teacherAssignments.length,
      academicYearId: assignment?.academicYearId ?? null,
      academicYearName: assignment?.academicYearName ?? 'Non affecté',
      formationId: assignment?.formationId ?? null,
      formationName: assignment?.formationName ?? 'Non affectée',
      groupeId: assignment?.groupeId ?? null,
      groupeName: assignment?.groupeName ?? 'Non affecté',
      moduleId: assignment?.moduleId ?? null,
      moduleName: assignment?.moduleName ?? 'Non affecté',
    };
  }

  private showImportToast(entity: string, result: AdminImportResult): void {
    const processed = result.successfulRows ?? 0;
    if ((result.failedRows ?? result.rowsRejected ?? 0) > 0 || (result.errors?.length ?? 0) > 0) {
      this.toast.error(`${entity} import completed with errors`, `${processed} row(s) processed.`);
      return;
    }
    if ((result.warningsCount ?? result.warnings?.length ?? 0) > 0) {
      this.toast.warning(`${entity} import completed with warnings`, `${processed} row(s) processed.`);
      return;
    }
    this.toast.success(`${entity} import completed successfully`, `${processed} row(s) processed.`);
  }
}
