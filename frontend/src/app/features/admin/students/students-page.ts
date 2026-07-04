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
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Academic attendance</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-tight text-principalText">Students</h1>
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
              Search
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
                placeholder="Name, email or Apogee..."
                class="h-12 w-full rounded-2xl border border-line bg-surface px-11 text-sm font-medium text-principalText shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </span>
          </label>

          <app-dropdown-filter
            label="Academic year"
            identifier="student-year-filter"
            allLabel="All years"
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
            allLabel="All formations"
            [options]="filterFormationOptions()"
            [value]="filterValue(formationFilter())"
            iconClass="fa-solid fa-layer-group"
            iconBackgroundClass="bg-secondary-soft"
            iconColor="secondary"
            (filterChange)="setFormationFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Group"
            identifier="student-group-filter"
            allLabel="All groups"
            [options]="filterGroupOptions()"
            [value]="filterValue(groupFilter())"
            iconClass="fa-solid fa-users"
            iconBackgroundClass="bg-primary-soft"
            (filterChange)="setGroupFilter($event)"
          ></app-dropdown-filter>

          <app-dropdown-filter
            label="Account status"
            identifier="student-status-filter"
            allLabel="All statuses"
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
        searchPlaceholder="Search students..."
        emptyStateTitle="No students found"
        emptyStateDescription="Adjust the filters or add a student."
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
          <app-status-badge [label]="row.status" [variant]="statusVariant(row.status)"></app-status-badge>
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
              <h3>Identity information</h3>
              <p>Core student account data used by authentication and rosters.</p>
            </div>
          </div>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">First name *</span>
            <input type="text" formControlName="firstName" class="form-input" />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Last name *</span>
            <input type="text" formControlName="lastName" class="form-input" />
          </label>

          <label class="space-y-1 sm:col-span-2">
            <span class="text-sm font-medium text-principalText">Email *</span>
            <input type="email" formControlName="email" class="form-input" />
            <span class="text-xs text-secondaryText">Use the school domain: @ump.ac.ma</span>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Apogee number *</span>
            <input type="text" formControlName="numApogee" class="form-input" />
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Account status *</span>
            <select formControlName="status" class="form-input">
              <option value="Enabled">Enabled</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>

          <div class="form-section-title sm:col-span-2">
            <span class="form-section-icon bg-secondary-soft text-secondary">
              <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
            </span>
            <div>
              <h3>Academic assignment</h3>
              <p>Choose a valid year, formation, and group from the structure database.</p>
            </div>
          </div>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Academic year *</span>
            <select formControlName="academicYearId" class="form-input" (change)="onFormYearChange()">
              <option value="">Select academic year</option>
              @for (year of academicYears(); track year.id) {
                <option [value]="year.id">{{ year.name }}{{ year.active ? ' (active)' : '' }}</option>
              }
            </select>
          </label>

          <label class="space-y-1">
            <span class="text-sm font-medium text-principalText">Formation *</span>
            <select formControlName="formationId" class="form-input" (change)="onFormFormationChange()" [disabled]="!studentForm.controls.academicYearId.value">
              <option value="">{{ studentForm.controls.academicYearId.value ? 'Select formation' : 'Select an academic year first' }}</option>
              @for (formation of formFormationOptions(); track formation.id) {
                <option [value]="formation.id">{{ formation.name }}</option>
              }
            </select>
            @if (studentForm.controls.academicYearId.value && formFormationOptions().length === 0) {
              <span class="text-xs text-secondaryText">No formations available for this academic year.</span>
            }
          </label>

          <label class="space-y-1 sm:col-span-2">
            <span class="text-sm font-medium text-principalText">Group *</span>
            <select formControlName="groupeId" class="form-input" [disabled]="!studentForm.controls.formationId.value">
              <option value="">{{ studentForm.controls.formationId.value ? 'Select group' : 'Select a formation first' }}</option>
              @for (group of formGroupOptions(); track group.id) {
                <option [value]="group.id">{{ group.name }}</option>
              }
            </select>
            @if (studentForm.controls.formationId.value && formGroupOptions().length === 0) {
              <span class="text-xs text-secondaryText">No groups available for this formation.</span>
            }
          </label>
        </form>
      </div>

      <div modal-footer class="flex w-full items-center justify-end gap-3">
        <app-button label="Cancel" variant="outline" [fullWidth]="false" (clicked)="closeStudentFormModal()"></app-button>
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
      [title]="selectedStudent()?.name || 'Student profile'"
      description="Identity, academic assignment, and attendance summary."
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
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Student profile</p>
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
                  <p>Apogee</p>
                  <strong>{{ student.numApogee }}</strong>
                </div>
              </div>
              <div class="profile-info-card">
                <span class="profile-info-icon bg-warning-soft text-warning">
                  <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                </span>
                <div>
                  <p>Academic year</p>
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
                  <p>Group</p>
                  <strong>{{ student.groupeName }}</strong>
                </div>
              </div>
            </section>

            @if (summaryLoading()) {
              <section class="rounded-3xl border border-line bg-surface p-5 text-sm font-medium text-secondaryText">
                Loading attendance summary...
              </section>
            } @else if (selectedStudentSummary(); as summary) {
              <section class="rounded-[1.5rem] border border-line bg-surface p-5 shadow-card">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Academic year summary</p>
                  <h4 class="mt-1 text-lg font-semibold text-principalText">Absence analytics</h4>
                </div>

                <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div class="profile-metric-card">
                    <span class="profile-metric-icon bg-surface text-primary">
                      <i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p>Total absences</p>
                      <strong>{{ summary.totalAbsences }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card border-success/20 bg-secondary-soft">
                    <span class="profile-metric-icon bg-surface text-secondary-strong">
                      <i class="fa-solid fa-check" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-secondary-strong">Justified</p>
                      <strong class="text-secondary-strong">{{ summary.justifiedAbsences }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card border-danger/20 bg-danger-soft">
                    <span class="profile-metric-icon bg-surface text-danger">
                      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-danger">Unjustified</p>
                      <strong class="text-danger">{{ summary.unjustifiedAbsences }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card">
                    <span class="profile-metric-icon bg-surface text-warning">
                      <i class="fa-regular fa-hourglass-half" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p>Absence hours</p>
                      <strong>{{ formatHours(summary.totalAbsenceHours) }}</strong>
                    </div>
                  </div>
                  <div class="profile-metric-card sm:col-span-2">
                    <span class="profile-metric-icon bg-surface text-secondaryText">
                      <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p>Last absence</p>
                      <strong class="text-base">
                        {{ summary.lastAbsenceAt ? formatDateTime(summary.lastAbsenceAt) : 'No absence recorded' }}
                      </strong>
                    </div>
                  </div>
                </div>
              </section>
            }

            <div class="flex items-center justify-end gap-2">
              <button
                type="button"
                class="profile-action-button text-primary hover:border-primary-soft hover:bg-primary-soft"
                title="Edit profile"
                aria-label="Edit student profile"
                (click)="openEditStudentModal(student)"
              >
                <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="profile-action-button text-secondaryText hover:border-warning-soft hover:bg-warning-soft hover:text-warning"
                [title]="student.status === 'Enabled' ? 'Suspend student' : 'Enable student'"
                [attr.aria-label]="student.status === 'Enabled' ? 'Suspend student' : 'Enable student'"
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
                title="Delete student"
                aria-label="Delete student"
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
      [itemName]="studentToDelete()?.name || ''"
      confirmMessage="You are about to delete:"
      warningMessage="Database relationships may block deletion if this student has inscriptions or attendance records."
      deleteButtonLabel="Delete student"
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
    { value: 'Enabled', label: 'Enabled' },
    { value: 'Suspended', label: 'Suspended' },
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

  readonly formTitle = computed(() => (this.editingStudentId() ? 'Edit student' : 'Add student'));
  readonly formDescription = computed(() =>
    this.editingStudentId()
      ? 'Update identity and academic assignment.'
      : 'Create the student and assign the academic group in one flow.',
  );
  readonly formSubmitLabel = computed(() => (this.editingStudentId() ? 'Save changes' : 'Add student'));

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
      header: 'Student',
      accessor: (row) => row.name,
      filterValue: (row) => [row.name, row.email, row.numApogee],
      sortable: false,
      width: '22rem',
    },
    { id: 'apogee', header: 'Code Apogee', accessor: (row) => row.numApogee, sortable: false, width: '11rem' },
    { id: 'year', header: 'Academic year', accessor: (row) => row.academicYearName, sortable: false, width: '12rem' },
    { id: 'formation', header: 'Formation', accessor: (row) => row.formationName, sortable: false, width: '14rem' },
    { id: 'group', header: 'Group', accessor: (row) => row.groupeName, sortable: false, width: '10rem' },
    { id: 'status', header: 'Account status', accessor: (row) => row.status, sortable: false, width: '11rem' },
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
          this.showImportToast('Student', result);
          this.loadStudents();
        },
        error: () => this.toast.error('Student import failed', 'Check the Excel format and backend logs.'),
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
          this.toast.success(editingId ? 'Student updated' : 'Student created');
          this.closeStudentFormModal();
          this.loadStudents();
        },
        error: () => this.toast.error('Student save failed', 'Check identity fields and academic assignment.'),
      });
  }

  openStudentDetails(student: StudentRow): void {
    this.selectedStudent.set(student);
    this.studentDetailsOpen.set(true);
    this.selectedStudentSummary.set(null);
    this.summaryLoading.set(true);
    const year = this.academicYears().find((item) => item.id === student.academicYearId);
    this.attendanceService.getStudentSummary(student.id, {
      dateFrom: year?.startDate ?? null,
      dateTo: year?.endDate ?? null,
    })
      .pipe(finalize(() => this.summaryLoading.set(false)))
      .subscribe({
        next: (summary) => this.selectedStudentSummary.set(summary),
        error: () => this.selectedStudentSummary.set(null),
      });
  }

  closeStudentDetails(): void {
    this.studentDetailsOpen.set(false);
    this.selectedStudent.set(null);
    this.selectedStudentSummary.set(null);
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
        this.toast.success(nextStatus === 'Enabled' ? 'Student enabled' : 'Student suspended');
        this.closeStudentDetails();
        this.loadStudents();
      },
      error: () => this.toast.error('Status update failed'),
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
        this.toast.success('Student deleted');
        this.closeDeleteStudentModal();
        this.closeStudentDetails();
        this.loadStudents();
      },
      error: () => this.toast.error('Delete failed', 'This student may be referenced by inscriptions or attendance records.'),
    });
  }

  statusVariant(status: AdminDirectoryStatus): 'success' | 'warning' | 'error' | 'neutral' {
    return statusVariant(status);
  }

  importStatusMessage(result: AdminImportResult | null): string {
    if (!result) return '';
    if ((result.failedRows ?? result.rowsRejected ?? 0) > 0 || (result.errors?.length ?? 0) > 0) {
      return 'Import completed with errors. Review the rows below before re-importing.';
    }
    if ((result.warningsCount ?? result.warnings?.length ?? 0) > 0) return 'Import completed with warnings.';
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
      academicYearName: inscription?.academicYearName ?? 'Not assigned',
      formationId: inscription?.formationId ?? null,
      formationName: inscription?.formationName ?? 'Not assigned',
      groupeId: inscription?.groupeId ?? null,
      groupeName: inscription?.groupeName ?? 'Not assigned',
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
