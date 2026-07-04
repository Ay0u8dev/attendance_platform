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
  AdminStudentDto,
  accountState,
  accountStatus,
  fullName,
  statusVariant,
} from '../../../core/admin/models/admin-user.model';
import {
  AdminStudentInscriptionDto,
  AdminStudentInscriptionRequest,
} from '../../../core/admin/models/admin-inscription.model';
import { AdminStudentAttendanceSummaryDto } from '../../../core/admin/models/admin-attendance.model';
import { StudentAttendanceSessionSummaryDto } from '../../../core/attendance/models/student-attendance.model';
import { AdminAttendanceService } from '../../../core/admin/services/admin-attendance.service';
import { AdminInscriptionService } from '../../../core/admin/services/admin-inscription.service';
import { AdminStudentService } from '../../../core/admin/services/admin-student.service';
import { AnneeUniversitaire } from '../../../core/structure/models/annee-universitaire.model';
import { Formation } from '../../../core/structure/models/formation.model';
import { Groupe } from '../../../core/structure/models/groupe.model';
import { AnneeUniversitaireService } from '../../../core/structure/services/annee-universitaire.service';
import { FormationService } from '../../../core/structure/services/formation.service';
import { GroupeService } from '../../../core/structure/services/groupe.service';
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
  readonly inscriptionId: number | null;
  readonly academicYearId: number | null;
  readonly academicYearName: string;
  readonly formationId: number | null;
  readonly formationName: string;
  readonly groupeId: number | null;
  readonly groupeName: string;
}

@Component({
  selector: 'app-students-page',
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
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-principalText">Étudiants</h1>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <input
            #studentImportInput
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
            label="Ajouter un étudiant"
            icon="fa-solid fa-plus"
            [fullWidth]="false"
            (clicked)="openAddStudentModal()"
          ></app-button>
        </div>
      </header>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {{ errorMessage() }}
        </div>
      }

      <section class="rounded-[1.75rem] border border-line bg-surface p-4 shadow-card">
        <div class="grid items-end gap-3 lg:grid-cols-[minmax(17rem,1.2fr)_repeat(4,minmax(12rem,1fr))]">
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
                placeholder="Nom, e-mail ou Apogée..."
                class="h-12 w-full rounded-2xl border border-line bg-surface px-11 text-sm font-medium text-principalText shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </span>
          </label>

          <app-dropdown-filter
            label="Année universitaire"
            identifier="student-year-filter"
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
            identifier="student-formation-filter"
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
            identifier="student-group-filter"
            allLabel="Tous les groupes"
            [options]="filterGroupOptions()"
            [value]="filterValue(groupFilter())"
            iconClass="fa-solid fa-users"
            iconBackgroundClass="bg-primary-soft"
            (filterChange)="setGroupFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Statut du compte"
            identifier="student-status-filter"
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
        searchPlaceholder="Rechercher des étudiants..."
        emptyStateTitle="Aucun étudiant trouvé"
        emptyStateDescription="Ajustez les filtres ou ajoutez un étudiant."
        [rows]="filteredStudents()"
        [columns]="columns"
        [rowId]="rowId"
        [initialPageSize]="10"
        [showToolbar]="false"
        [showResultSummary]="false"
        [showColumnFilters]="false"
        [showColumnVisibility]="false"
        [rowClickable]="true"
        paginationPlacement="top"
        (rowClicked)="openStudentDetails($event)"
      >
        <ng-template [appDataTableCell]="'student'" let-row="row">
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

        <ng-template [appDataTableCell]="'apogee'" let-row="row">
          <span class="inline-flex rounded-xl border border-line bg-surface-subtle px-3 py-1.5 text-sm font-semibold text-principalText shadow-sm">
            {{ row.numApogee }}
          </span>
        </ng-template>

        <ng-template [appDataTableCell]="'status'" let-row="row">
          <app-status-badge [label]="statusLabel(row.status)" [variant]="statusVariant(row.status)"></app-status-badge>
        </ng-template>
      </app-data-table>
    </section>

    <app-modal
      [open]="studentFormOpen()"
      [title]="formTitle()"
      [description]="formDescription()"
      size="lg"
      (closed)="closeStudentFormModal()"
    >
      <div modal-body>
        <form [formGroup]="studentForm" class="grid gap-5 sm:grid-cols-2">
          <div class="form-section-title sm:col-span-2">
            <span class="form-section-icon bg-primary-soft text-primary">
              <i class="fa-solid fa-id-card" aria-hidden="true"></i>
            </span>
            <div>
              <h3>Informations d'identité</h3>
              <p>Données principales du compte étudiant utilisées par l'authentification et les listes.</p>
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
            <span class="text-sm font-medium text-principalText">Numéro Apogée *</span>
            <input type="text" formControlName="numApogee" class="form-input" />
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
              <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            </span>
            <div>
              <h3>Affectation académique</h3>
              <p>Choisissez une année, une formation et un groupe valides depuis la structure académique.</p>
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
            <select formControlName="formationId" class="form-input" (change)="onFormFormationChange()" [disabled]="!studentForm.controls.academicYearId.value">
              <option value="">{{ studentForm.controls.academicYearId.value ? 'Sélectionner une formation' : 'Sélectionnez d'abord une année universitaire' }}</option>
              @for (formation of formFormationOptions(); track formation.id) {
                <option [value]="formation.id">{{ formation.name }}</option>
              }
            </select>
            @if (studentForm.controls.academicYearId.value && formFormationOptions().length === 0) {
              <span class="text-xs text-secondaryText">Aucune formation disponible pour cette année universitaire.</span>
            }
          </label>

          <label class="space-y-1 sm:col-span-2">
            <span class="text-sm font-medium text-principalText">Groupe *</span>
            <select formControlName="groupeId" class="form-input" [disabled]="!studentForm.controls.formationId.value">
              <option value="">{{ studentForm.controls.formationId.value ? 'Sélectionner un groupe' : 'Sélectionnez d'abord une formation' }}</option>
              @for (group of formGroupOptions(); track group.id) {
                <option [value]="group.id">{{ group.name }}</option>
              }
            </select>
            @if (studentForm.controls.formationId.value && formGroupOptions().length === 0) {
              <span class="text-xs text-secondaryText">Aucun groupe disponible pour cette formation.</span>
            }
          </label>
        </form>
      </div>

      <div modal-footer class="flex w-full items-center justify-end gap-3">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeStudentFormModal()"></app-button>
        <app-button
          [label]="formSubmitLabel()"
          [disabled]="studentForm.invalid || saving()"
          [loading]="saving()"
          [fullWidth]="false"
          (clicked)="submitStudentForm()"
        ></app-button>
      </div>
    </app-modal>

    <app-modal
      [open]="studentDetailsOpen()"
      [title]="selectedStudent()?.name || 'Profil étudiant'"
      description="Identité, affectation académique et résumé des présences."
      size="lg"
      [showFooter]="false"
      (closed)="closeStudentDetails()"
    >
      <div modal-body>
        @if (selectedStudent(); as student) {
          <div class="space-y-5">
            <section class="rounded-[1.5rem] border border-line bg-linear-to-br from-primary-soft/70 via-surface to-secondary-soft/40 p-5 shadow-card">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 items-center gap-4">
                  <app-user-avatar
                    [name]="student.name"
                    [imageUrl]="student.pfpUrl"
                    size="lg"
                    shape="rounded"
                  ></app-user-avatar>
                  <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Profil étudiant</p>
                    <h3 class="mt-1 truncate text-2xl font-semibold text-principalText">{{ student.name }}</h3>
                    <p class="mt-1 truncate text-sm text-secondaryText">{{ student.email }}</p>
                  </div>
                </div>
                <app-status-badge [label]="student.status" [variant]="statusVariant(student.status)"></app-status-badge>
              </div>
            </section>

            <section class="grid gap-3 sm:grid-cols-2">
              <div class="profile-info-card">
                <span class="profile-info-icon bg-primary-soft text-primary">
                  <i class="fa-solid fa-id-card" aria-hidden="true"></i>
                </span>
                <div>
                  <p>Apogée</p>
                  <strong>{{ student.numApogee }}</strong>
                </div>
              </div>
              <div class="profile-info-card">
                <span class="profile-info-icon bg-warning-soft text-warning">
                  <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                </span>
                <div>
                  <p>Année universitaire</p>
                  <strong>{{ student.academicYearName }}</strong>
                </div>
              </div>
              <div class="profile-info-card">
                <span class="profile-info-icon bg-secondary-soft text-secondary-strong">
                  <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
                </span>
                <div>
                  <p>Formation</p>
                  <strong>{{ student.formationName }}</strong>
                </div>
              </div>
              <div class="profile-info-card">
                <span class="profile-info-icon bg-primary-soft text-primary">
                  <i class="fa-solid fa-users" aria-hidden="true"></i>
                </span>
                <div>
                  <p>Groupe</p>
                  <strong>{{ student.groupeName }}</strong>
                </div>
              </div>
            </section>

            @if (summaryLoading()) {
              <section class="rounded-3xl border border-line bg-surface p-5 text-sm font-medium text-secondaryText">
                Chargement du résumé des présences...
              </section>
            } @else if (selectedStudentSummary(); as summary) {
              <section class="rounded-[1.5rem] border border-line bg-surface p-5 shadow-card">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Résumé de l’année universitaire</p>
                  <h4 class="mt-1 text-lg font-semibold text-principalText">Analyse des absences</h4>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div class="profile-metric-card">
                    <span class="profile-metric-icon bg-surface text-primary">
                      <i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p>Absences totales</p>
                      <strong>{{ summary.totalAbsences }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card border-success/20 bg-secondary-soft">
                    <span class="profile-metric-icon bg-surface text-secondary-strong">
                      <i class="fa-solid fa-check" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-secondary-strong">Justifiées</p>
                      <strong class="text-secondary-strong">{{ summary.justifiedAbsences }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card border-danger/20 bg-danger-soft">
                    <span class="profile-metric-icon bg-surface text-danger">
                      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-danger">Non justifiées</p>
                      <strong class="text-danger">{{ summary.unjustifiedAbsences }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card">
                    <span class="profile-metric-icon bg-surface text-warning">
                      <i class="fa-regular fa-hourglass-half" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p>Heures d'absence</p>
                      <strong>{{ formatHours(summary.totalAbsenceHours) }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card sm:col-span-2">
                    <span class="profile-metric-icon bg-surface text-secondaryText">
                      <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p>Dernière absence</p>
                      <strong class="text-base">
                        {{ summary.lastAbsenceAt ? formatDateTime(summary.lastAbsenceAt) : 'Aucune absence enregistrée' }}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
            }

            <section class="rounded-[1.5rem] border border-line bg-surface p-5 shadow-card">
              <div class="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                    Historique des absences
                  </p>
                  <h4 class="mt-1 text-lg font-semibold text-principalText">
                    Modules avec absences
                  </h4>
                </div>
                <span class="inline-flex w-fit rounded-full bg-danger-soft px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-danger">
                  {{ absentSessions().length }} au total
                </span>
              </div>

              <label class="mt-4 block text-sm font-semibold text-principalText">
                <span class="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                  Filtrer par module
                </span>
                <select
                  class="form-input"
                  [value]="absenceModuleFilter()"
                  (change)="onAbsenceModuleFilterChange($any($event.target).value)"
                >
                  <option value="">Tous les modules ({{ absentSessions().length }} absences)</option>
                  @for (module of modulesWithAbsencesCount(); track module.name) {
                    <option [value]="module.name">
                      {{ module.name }} ({{ module.count }} {{ module.count > 1 ? 'absences' : 'absence' }})
                    </option>
                  }
                </select>
              </label>

              @if (absencesLoading()) {
                <div class="mt-4 rounded-2xl border border-line bg-surface-subtle px-4 py-6 text-center text-sm font-medium text-secondaryText">
                  Chargement des absences...
                </div>
              } @else if (filteredAbsentSessions().length === 0) {
                <div class="mt-4 rounded-2xl border border-dashed border-line bg-surface-subtle px-4 py-6 text-center text-sm font-medium text-secondaryText">
                  Aucune absence enregistrée pour ce filtre.
                </div>
              } @else {
                <div class="mt-4 overflow-hidden rounded-2xl border border-line">
                  <div class="grid grid-cols-[minmax(0,1fr)_9rem_6rem] gap-3 border-b border-line bg-surface-subtle px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <span>Module</span>
                    <span>Session</span>
                    <span class="text-right">Statut</span>
                  </div>
                  <div class="max-h-64 overflow-y-auto divide-y divide-line">
                    @for (session of filteredAbsentSessions(); track session.sessionId) {
                      <div class="grid grid-cols-[minmax(0,1fr)_9rem_6rem] items-center gap-3 px-4 py-3 text-sm">
                        <div class="min-w-0">
                          <p class="truncate font-semibold text-principalText">
                            {{ session.courseLabel || 'Module non renseigné' }}
                          </p>
                          <p class="mt-0.5 truncate text-xs text-secondaryText">
                            {{ session.teacherFullName || 'Enseignant non renseigné' }}
                          </p>
                        </div>
                        <div class="min-w-0 text-xs text-secondaryText">
                          <p class="font-semibold text-principalText">
                            {{ formatDate(session.startedAt) }}
                          </p>
                          <p class="mt-0.5">
                            {{ formatTimeRange(session.startedAt, session.endedAt) }}
                          </p>
                        </div>
                        <span class="justify-self-end rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-danger">
                          Absent
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }
            </section>

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="profile-action-button text-primary hover:border-primary-soft hover:bg-primary-soft"
                title="Modifier le profil"
                aria-label="Modifier le profil étudiant"
                (click)="openEditStudentModal(student)"
              >
                <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="profile-action-button text-secondaryText hover:border-warning-soft hover:bg-warning-soft hover:text-warning"
                [title]="student.status === 'Enabled' ? 'Suspendre l’étudiant' : 'Activer l’étudiant'"
                [attr.aria-label]="student.status === 'Enabled' ? 'Suspendre l’étudiant' : 'Activer l’étudiant'"
                (click)="toggleStudentStatus(student)"
              >
                <i
                  class="fa-solid"
                  [class.fa-user-slash]="student.status === 'Enabled'"
                  [class.fa-user-check]="student.status !== 'Enabled'"
                  aria-hidden="true"
                ></i>
              </button>
              <button
                type="button"
                class="profile-action-button text-danger hover:border-danger/20 hover:bg-danger-soft"
                title="Supprimer l’étudiant"
                aria-label="Supprimer l’étudiant"
                (click)="openDeleteStudentModal(student)"
              >
                <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
              </button>
            </div>
          </div>
        }
      </div>
    </app-modal>

    <app-modal
      [open]="importResult() !== null"
      title="Résumé d’import des étudiants"
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
      title="Supprimer cet étudiant ?"
      [itemName]="studentToDelete()?.name || ''"
      confirmMessage="Vous êtes sur le point de supprimer :"
      warningMessage="Les relations en base peuvent bloquer la suppression si cet étudiant a des inscriptions ou des pointages."
      deleteButtonLabel="Supprimer l’étudiant"
      (closeRequested)="closeDeleteStudentModal()"
      (confirmDelete)="confirmDeleteStudent()"
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

    .profile-info-card,
    .profile-metric-card {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      border-radius: 1rem;
      border: 1px solid var(--color-line);
      background: var(--color-surface);
      padding: 1rem;
      box-shadow: var(--shadow-card);
    }

    .profile-info-icon,
    .profile-metric-icon {
      display: inline-flex;
      height: 2.5rem;
      width: 2.5rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 0.85rem;
      border: 1px solid var(--color-line);
      box-shadow: var(--shadow-card);
    }

    .profile-info-card p,
    .profile-metric-card p {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-muted);
    }

    .profile-info-card strong,
    .profile-metric-card strong {
      margin-top: 0.25rem;
      display: block;
      color: var(--color-principalText);
      font-weight: 700;
    }

    .profile-metric-card {
      background: var(--color-surface-subtle);
    }

    .profile-metric-card strong {
      font-size: 1.6rem;
      line-height: 1.1;
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
export class StudentsPage {
  private readonly fb = inject(FormBuilder);
  private readonly studentService = inject(AdminStudentService);
  private readonly inscriptionService = inject(AdminInscriptionService);
  private readonly attendanceService = inject(AdminAttendanceService);
  private readonly yearService = inject(AnneeUniversitaireService);
  private readonly formationService = inject(FormationService);
  private readonly groupService = inject(GroupeService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('studentImportInput');

  readonly statusOptions: readonly Option[] = [
    { value: 'Enabled', label: 'Activé' },
    { value: 'Suspended', label: 'Suspendu' },
  ];

  readonly students = signal<readonly StudentRow[]>([]);
  readonly academicYears = signal<readonly AnneeUniversitaire[]>([]);
  readonly formations = signal<readonly Formation[]>([]);
  readonly groups = signal<readonly Groupe[]>([]);
  readonly inscriptions = signal<readonly AdminStudentInscriptionDto[]>([]);
  readonly searchQuery = signal('');
  readonly academicYearFilter = signal('all');
  readonly formationFilter = signal('all');
  readonly groupFilter = signal('all');
  readonly statusFilter = signal('all');
  readonly formAcademicYearId = signal('');
  readonly formFormationId = signal('');
  readonly isLoading = signal(false);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly summaryLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly studentFormOpen = signal(false);
  readonly studentDetailsOpen = signal(false);
  readonly deleteOpen = signal(false);
  readonly selectedStudent = signal<StudentRow | null>(null);
  readonly studentToDelete = signal<StudentRow | null>(null);
  readonly selectedStudentSummary = signal<AdminStudentAttendanceSummaryDto | null>(null);
  readonly absentSessions = signal<readonly StudentAttendanceSessionSummaryDto[]>([]);
  readonly absenceModuleFilter = signal('');
  readonly absencesLoading = signal(false);
  readonly editingStudentId = signal<number | null>(null);
  readonly importResult = signal<AdminImportResult | null>(null);
  readonly rowId = (row: StudentRow) => String(row.id);

  readonly studentForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254), Validators.pattern(/^[^\s@]+@ump\.ac\.ma$/i)]],
    numApogee: ['', [Validators.required, Validators.maxLength(30)]],
    status: ['Enabled' as AdminDirectoryStatus, [Validators.required]],
    academicYearId: ['', [Validators.required]],
    formationId: ['', [Validators.required]],
    groupeId: ['', [Validators.required]],
  });

  readonly formTitle = computed(() => (this.editingStudentId() ? 'Modifier l’étudiant' : 'Ajouter un étudiant'));
  readonly formDescription = computed(() =>
    this.editingStudentId()
      ? 'Mettre à jour l’identité et l’affectation académique.'
      : 'Créer l’étudiant et affecter son groupe académique dans le même flux.',
  );
  readonly formSubmitLabel = computed(() => (this.editingStudentId() ? 'Enregistrer les modifications' : 'Ajouter l’étudiant'));

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
  readonly formFormationOptions = computed(() => this.formationsForYear(this.formAcademicYearId() || 'all'));
  readonly formGroupOptions = computed(() => this.groupsForFormation(this.formFormationId() || 'all'));
  readonly modulesWithAbsencesCount = computed(() => {
    const counts = new Map<string, number>();
    for (const session of this.absentSessions()) {
      const moduleName = session.courseLabel || 'Module non renseigné';
      counts.set(moduleName, (counts.get(moduleName) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, count]) => ({ name, count }));
  });
  readonly filteredAbsentSessions = computed(() => {
    const moduleFilter = this.absenceModuleFilter();
    if (!moduleFilter) {
      return this.absentSessions();
    }

    return this.absentSessions().filter((session) => session.courseLabel === moduleFilter);
  });
  readonly filteredStudents = computed(() => {
    const search = this.searchQuery().trim().toLowerCase();
    const year = this.academicYearFilter();
    const formation = this.formationFilter();
    const group = this.groupFilter();
    const status = this.statusFilter();

    return this.students().filter((student) => {
      if (year !== 'all' && String(student.academicYearId) !== year) return false;
      if (formation !== 'all' && String(student.formationId) !== formation) return false;
      if (group !== 'all' && String(student.groupeId) !== group) return false;
      if (status !== 'all' && student.status !== status) return false;
      if (!search) return true;

      return [student.name, student.email, student.numApogee, student.academicYearName, student.formationName, student.groupeName]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  });

  readonly columns: readonly DataTableColumn<StudentRow>[] = [
    {
      id: 'student',
      header: 'Étudiant',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.email, row.numApogee],
      sortable: false,
      width: '22rem',
    },
    { id: 'apogee', header: 'Code Apogée', accessor: (row) => row.numApogee, sortable: false, width: '11rem' },
    { id: 'year', header: 'Année universitaire', accessor: (row) => row.academicYearName, sortable: false, width: '12rem' },
    { id: 'formation', header: 'Formation', accessor: (row) => row.formationName, sortable: false, width: '14rem' },
    { id: 'group', header: 'Groupe', accessor: (row) => row.groupeName, sortable: false, width: '10rem' },
    { id: 'status', header: 'Statut du compte', accessor: (row) => row.status, sortable: false, width: '11rem' },
  ];

  constructor() {
    this.loadStudents();
  }

  loadStudents(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      students: this.studentService.getAll(),
      inscriptions: this.inscriptionService.getStudentInscriptions().pipe(catchError(() => of([] as readonly AdminStudentInscriptionDto[]))),
      academicYears: this.yearService.getAll().pipe(catchError(() => of([] as readonly AnneeUniversitaire[]))),
      formations: this.formationService.getAll().pipe(catchError(() => of([] as readonly Formation[]))),
      groups: this.groupService.getAll().pipe(catchError(() => of([] as readonly Groupe[]))),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ students, inscriptions, academicYears, formations, groups }) => {
          this.inscriptions.set(inscriptions);
          this.academicYears.set(academicYears);
          this.formations.set(formations);
          this.groups.set(groups);
          this.students.set(students.map((student) => this.toRow(student, inscriptions)));
        },
        error: () => this.errorMessage.set('Unable to load students from user-service.'),
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
  }

  setFormationFilter(value: string | null): void {
    this.formationFilter.set(value ?? 'all');
    this.groupFilter.set('all');
  }

  setGroupFilter(value: string | null): void {
    this.groupFilter.set(value ?? 'all');
  }

  setStatusFilter(value: string | null): void {
    this.statusFilter.set(value ?? 'all');
  }

  filterValue(value: string): string | null {
    return value === 'all' ? null : value;
  }

  onFormYearChange(): void {
    this.formAcademicYearId.set(this.studentForm.controls.academicYearId.value);
    this.formFormationId.set('');
    this.studentForm.patchValue({ formationId: '', groupeId: '' });
  }

  onFormFormationChange(): void {
    this.formFormationId.set(this.studentForm.controls.formationId.value);
    this.studentForm.patchValue({ groupeId: '' });
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
    this.studentService.importExcel(file)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.importing.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.importResult.set(result);
          this.showImportToast('Étudiant', result);
          this.loadStudents();
        },
        error: () => this.toast.error('Échec de l’import des étudiants', 'Vérifiez le format Excel et les journaux backend.'),
      });
  }

  closeImportResult(): void {
    this.importResult.set(null);
  }

  openAddStudentModal(): void {
    this.editingStudentId.set(null);
    this.studentForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      numApogee: '',
      status: 'Enabled',
      academicYearId: '',
      formationId: '',
      groupeId: '',
    });
    this.formAcademicYearId.set('');
    this.formFormationId.set('');
    this.studentFormOpen.set(true);
  }

  openEditStudentModal(student: StudentRow): void {
    this.studentDetailsOpen.set(false);
    this.selectedStudent.set(null);
    this.selectedStudentSummary.set(null);
    this.absentSessions.set([]);
    this.absenceModuleFilter.set('');
    this.editingStudentId.set(student.id);
    this.studentForm.reset({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      numApogee: student.numApogee,
      status: student.status,
      academicYearId: student.academicYearId ? String(student.academicYearId) : '',
      formationId: student.formationId ? String(student.formationId) : '',
      groupeId: student.groupeId ? String(student.groupeId) : '',
    });
    this.formAcademicYearId.set(student.academicYearId ? String(student.academicYearId) : '');
    this.formFormationId.set(student.formationId ? String(student.formationId) : '');
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
    const studentPayload = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      numApogee: value.numApogee.trim(),
      pfpUrl: this.currentEditedRow()?.pfpUrl ?? null,
      enabled: state.enabled,
      firstLogin: state.firstLogin,
    };
    const editingId = this.editingStudentId();

    const request = editingId
      ? this.studentService.update(editingId, studentPayload).pipe(
          switchMap((student) => this.saveInscription(student.id, this.currentEditedRow()?.inscriptionId ?? null)),
        )
      : this.studentService.create(studentPayload).pipe(
          switchMap((student) =>
            this.saveInscription(student.id, null).pipe(
              catchError((error: unknown) =>
                this.studentService.delete(student.id).pipe(
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
          this.toast.success(editingId ? 'Étudiant mis à jour' : 'Étudiant créé');
          this.closeStudentFormModal();
          this.loadStudents();
        },
        error: () => this.toast.error('Échec de l’enregistrement de l’étudiant', 'Vérifiez les champs d’identité et l’affectation académique.'),
      });
  }

  openStudentDetails(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.studentDetailsOpen.set(true);
    this.selectedStudentSummary.set(null);
    this.absentSessions.set([]);
    this.absenceModuleFilter.set('');
    this.summaryLoading.set(true);
    this.absencesLoading.set(true);
    const year = this.academicYears().find((item) => item.id === student.academicYearId);
    this.attendanceService.getStudentSummary(student.id, {
      dateFrom: year?.startDate ?? null,
      dateTo: year?.endDate ?? null,
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.summaryLoading.set(false)),
      )
      .subscribe({
        next: (summary) => this.selectedStudentSummary.set(summary),
        error: () => this.selectedStudentSummary.set(null),
      });

    this.attendanceService
      .getStudentSessions(student.id, {
        status: 'ABSENT',
        dateFrom: year?.startDate ?? null,
        dateTo: year?.endDate ?? null,
        size: 1000,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.absencesLoading.set(false)),
      )
      .subscribe({
        next: (response) => this.absentSessions.set(response.items),
        error: () => this.absentSessions.set([]),
      });
  }

  closeStudentDetails(): void {
    this.studentDetailsOpen.set(false);
    this.selectedStudent.set(null);
    this.selectedStudentSummary.set(null);
    this.absentSessions.set([]);
    this.absenceModuleFilter.set('');
  }

  onAbsenceModuleFilterChange(value: string): void {
    this.absenceModuleFilter.set(value);
  }

  toggleStudentStatus(student: StudentRow): void {
    const nextStatus: AdminDirectoryStatus = student.status === 'Enabled' ? 'Suspended' : 'Enabled';
    const state = accountState(nextStatus);
    this.studentService.update(student.id, {
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      numApogee: student.numApogee,
      pfpUrl: student.pfpUrl,
      enabled: state.enabled,
      firstLogin: state.firstLogin,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(nextStatus === 'Enabled' ? 'Étudiant activé' : 'Étudiant suspendu');
        this.closeStudentDetails();
        this.loadStudents();
      },
      error: () => this.toast.error('Échec de mise à jour du statut'),
    });
  }

  openDeleteStudentModal(student: StudentRow): void {
    this.studentToDelete.set(student);
    this.deleteOpen.set(true);
  }

  closeDeleteStudentModal(): void {
    this.deleteOpen.set(false);
    this.studentToDelete.set(null);
  }

  confirmDeleteStudent(): void {
    const student = this.studentToDelete();
    if (!student) return;

    this.studentService.delete(student.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Étudiant supprimé');
        this.closeDeleteStudentModal();
        this.closeStudentDetails();
        this.loadStudents();
      },
      error: () => this.toast.error('Échec de suppression', 'Cet étudiant peut être référencé par des inscriptions ou des pointages.'),
    });
  }

  statusVariant(status: AdminDirectoryStatus): 'success' | 'warning' | 'error' | 'neutral' {
    return statusVariant(status);
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
      { label: 'Étudiants créés', value: result.createdStudents ?? result.studentsCreated ?? 0 },
      { label: 'Étudiants mis à jour', value: result.updatedStudents ?? result.studentsUpdated ?? 0 },
      { label: 'Inscriptions', value: result.createdInscriptions ?? result.inscriptionsCreated ?? 0 },
      { label: 'Doublons', value: result.duplicateInscriptions ?? result.duplicatesSkipped ?? 0 },
      { label: 'Rejetées', value: result.failedRows ?? result.rowsRejected ?? 0 },
      { label: 'Avertissements', value: result.warningsCount ?? result.warnings?.length ?? 0 },
      { label: 'Erreurs', value: result.errorsCount ?? result.errors?.length ?? 0 },
    ];
  }

  statusLabel(status: AdminDirectoryStatus): string {
    return status === 'Enabled' ? 'Activé' : 'Suspendu';
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  formatHours(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded} h`;
  }

  formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  }

  formatTimeRange(startedAt: string, endedAt: string | null): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const start = formatter.format(new Date(startedAt));
    if (!endedAt) {
      return start;
    }

    return `${start} - ${formatter.format(new Date(endedAt))}`;
  }

  private saveInscription(studentId: number, inscriptionId: number | null) {
    const payload = this.inscriptionPayload(studentId);
    return (inscriptionId
      ? this.inscriptionService.updateStudentInscription(inscriptionId, payload)
      : this.inscriptionService.createStudentInscription(payload)).pipe(map(() => studentId));
  }

  private inscriptionPayload(studentId: number): AdminStudentInscriptionRequest {
    const value = this.studentForm.getRawValue();
    return {
      studentId,
      academicYearId: Number(value.academicYearId),
      formationId: Number(value.formationId),
      groupeId: Number(value.groupeId),
    };
  }

  private currentEditedRow(): StudentRow | null {
    const id = this.editingStudentId();
    return id ? this.students().find((student) => student.id === id) ?? null : null;
  }

  private formationsForYear(yearId: string): readonly Formation[] {
    return this.formations().filter((formation) => yearId === 'all' || String(formation.anneeUniversitaireId) === yearId);
  }

  private groupsForFormation(formationId: string): readonly Groupe[] {
    return this.groups().filter((group) => formationId === 'all' || String(group.formationId) === formationId);
  }

  private toRow(student: AdminStudentDto, inscriptions: readonly AdminStudentInscriptionDto[]): StudentRow {
    const inscription = inscriptions.find((item) => item.studentId === student.id) ?? null;
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
      inscriptionId: inscription?.id ?? null,
      academicYearId: inscription?.academicYearId ?? null,
      academicYearName: inscription?.academicYearName ?? 'Non affecté',
      formationId: inscription?.formationId ?? null,
      formationName: inscription?.formationName ?? 'Non affectée',
      groupeId: inscription?.groupeId ?? null,
      groupeName: inscription?.groupeName ?? 'Non affecté',
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
