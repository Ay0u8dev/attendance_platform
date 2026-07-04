import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  AdminAttendanceOverviewDto,
  AdminAttendanceSessionDetailsDto,
  AdminAttendanceSessionSummaryDto,
  AdminAttendanceStudentViewDto,
  AdminStudentAttendanceSummaryDto,
  AttendanceStudentStatus,
} from '../../../core/admin/models/admin-attendance.model';
import { AdminAttendanceService } from '../../../core/admin/services/admin-attendance.service';
import { AdminStudentService } from '../../../core/admin/services/admin-student.service';
import { AnneeUniversitaire } from '../../../core/structure/models/annee-universitaire.model';
import { Filiere } from '../../../core/structure/models/filiere.model';
import { Formation } from '../../../core/structure/models/formation.model';
import { Groupe } from '../../../core/structure/models/groupe.model';
import { Module } from '../../../core/structure/models/module.model';
import { AnneeUniversitaireService } from '../../../core/structure/services/annee-universitaire.service';
import { FiliereService } from '../../../core/structure/services/filiere.service';
import { FormationService } from '../../../core/structure/services/formation.service';
import { GroupeService } from '../../../core/structure/services/groupe.service';
import { ModuleService } from '../../../core/structure/services/module.service';
import { Button } from '../../../shared/components/button/button';
import { Modal } from '../../../shared/components/modal/modal';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';
import { UserAvatar } from '../../../shared/components/user-avatar/user-avatar';

type RosterFilter = 'ALL' | AttendanceStudentStatus;

@Component({
  selector: 'app-attendance-page',
  imports: [Button, Modal, StatusBadge, UserAvatar],
  template: `
    <section class="space-y-7">
      <header class="rounded-[1.75rem] border border-line bg-surface px-5 py-6 shadow-card sm:px-7">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Présence académique</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-principalText">Présences</h1>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <app-button
              label="Actualiser"
              icon="fa-solid fa-rotate"
              variant="outline"
              size="sm"
              [fullWidth]="false"
              [loading]="isLoading()"
              (clicked)="loadData()"
            ></app-button>
          </div>
        </div>
      </header>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {{ errorMessage() }}
        </div>
      }

      <section class="rounded-[1.75rem] border border-line bg-surface p-4 shadow-card sm:p-5">
        <div class="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Registre des sessions</p>
            <h2 class="mt-1 text-2xl font-semibold text-principalText">Sessions enregistrées</h2>
          </div>
        </div>

        <div class="space-y-4">
          @if (sessions().length > 0) {
            @for (session of sessions(); track session.sessionId) {
              <article
                class="overflow-hidden rounded-[1.5rem] border bg-surface shadow-sm transition duration-200"
                [class.border-primary]="isSelected(session)"
                [class.shadow-card-strong]="isSelected(session)"
                [class.border-line]="!isSelected(session)"
              >
                <div class="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.95fr)_auto] lg:items-center">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="truncate text-xl font-semibold text-principalText">{{ session.courseLabel }}</h3>
                      <app-status-badge
                        [label]="session.status === 'ACTIVE' ? 'Active' : 'Finalisée'"
                        [variant]="session.status === 'ACTIVE' ? 'info' : 'success'"
                      ></app-status-badge>
                    </div>
                    <p class="mt-2 text-sm font-medium text-secondaryText">
                      {{ teacherLabel(session.teacherFullName) }} - {{ groupLabel(session.groupIds) }}
                    </p>
                  </div>

                  <div class="flex flex-wrap gap-2 text-sm">
                    <span class="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-3 py-2 font-semibold text-principalText">
                      <i class="fa-solid fa-location-dot text-xs text-primary" aria-hidden="true"></i>
                      {{ session.roomLabel }}
                    </span>
                    <span class="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-3 py-2 font-semibold text-principalText">
                      <i class="fa-regular fa-calendar text-xs text-primary" aria-hidden="true"></i>
                      {{ formatDate(session.startedAt) }}
                    </span>
                    <span class="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-3 py-2 font-semibold text-principalText">
                      <i class="fa-regular fa-clock text-xs text-primary" aria-hidden="true"></i>
                      {{ formatTimeRange(session.startedAt, session.endedAt ?? session.endsAt) }}
                    </span>
                    <span class="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface-subtle px-3 py-2 font-semibold text-principalText">
                      <i class="fa-solid fa-hourglass-half text-xs text-primary" aria-hidden="true"></i>
                      {{ durationLabel(session) }}
                    </span>
                  </div>

                  <div class="flex flex-col gap-3 lg:items-end">
                    <div class="grid grid-cols-4 gap-2 text-center">
                      <span class="rounded-2xl bg-secondary-soft px-3 py-2">
                        <span class="block text-xl font-semibold text-secondary-strong">{{ session.presentCount }}</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-secondary-strong">Présents</span>
                      </span>
                      <span class="rounded-2xl bg-danger-soft px-3 py-2">
                        <span class="block text-xl font-semibold text-danger">{{ session.absentCount }}</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-danger">Absents</span>
                      </span>
                      <span class="rounded-2xl bg-surface-subtle px-3 py-2">
                        <span class="block text-xl font-semibold text-secondaryText">{{ session.unknownCount }}</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Ouverts</span>
                      </span>
                      <span class="rounded-2xl bg-primary-soft px-3 py-2">
                        <span class="block text-xl font-semibold text-primary">{{ attendanceRateValue(session) }}%</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-primary">Taux</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      [attr.aria-expanded]="isSelected(session)"
                      (click)="toggleRoster(session)"
                    >
                      <i [class]="isSelected(session) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-users-viewfinder'" aria-hidden="true"></i>
                      {{ isSelected(session) ? 'Masquer la liste' : 'Voir la liste' }}
                    </button>
                  </div>
                </div>

                @if (isSelected(session)) {
                  <section class="border-t border-primary-soft bg-surface-subtle/55 p-5">
                    @if (selectedDetail(); as detail) {
                      <div class="rounded-[1.5rem] border border-line bg-surface shadow-card">
                        <div class="border-b border-line p-5">
                          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                              <h3 class="text-xl font-semibold text-principalText">Inspection de la liste</h3>
                              <p class="mt-1 text-sm text-secondaryText">Vérifiez le statut de présence des étudiants pour cette session.</p>
                            </div>

                            <label class="relative block min-w-0 xl:w-96">
                              <span class="sr-only">Rechercher dans la liste</span>
                              <i
                                class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs text-secondaryText"
                                aria-hidden="true"
                              ></i>
                              <input
                                type="search"
                                [value]="rosterSearchQuery()"
                                (input)="onRosterSearchInput($event)"
                                placeholder="Rechercher par étudiant, e-mail, Apogée ou groupe..."
                                class="h-12 w-full rounded-2xl border border-line bg-surface px-11 text-sm font-medium text-principalText outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                              />
                            </label>
                          </div>

                          <div class="mt-5 flex flex-wrap gap-2">
                            @for (filter of rosterFilters; track filter.value) {
                              <button
                                type="button"
                                class="inline-flex min-h-10 items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                [class.border-primary]="rosterStatusFilter() === filter.value"
                                [class.bg-primary]="rosterStatusFilter() === filter.value"
                                [class.text-white]="rosterStatusFilter() === filter.value"
                                [class.border-line]="rosterStatusFilter() !== filter.value"
                                [class.bg-surface]="rosterStatusFilter() !== filter.value"
                                [class.text-principalText]="rosterStatusFilter() !== filter.value"
                                (click)="setRosterStatus(filter.value)"
                              >
                                {{ filter.label }}
                                <span
                                  class="rounded-full px-2 py-0.5 text-xs"
                                  [class.bg-white]="rosterStatusFilter() === filter.value"
                                  [class.text-primary]="rosterStatusFilter() === filter.value"
                                  [class.bg-surface-subtle]="rosterStatusFilter() !== filter.value"
                                  [class.text-secondaryText]="rosterStatusFilter() !== filter.value"
                                >
                                  {{ countRosterStatus(filter.value) }}
                                </span>
                              </button>
                            }
                          </div>

                          <div class="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-secondaryText">
                            <span class="rounded-full border border-line bg-surface-subtle px-3 py-1">
                              {{ detail.students.length }} étudiant(s)
                            </span>
                            <span class="rounded-full border border-line bg-surface-subtle px-3 py-1">
                              {{ groupLabel(detail.groupIds) }}
                            </span>
                            <span class="rounded-full border border-line bg-surface-subtle px-3 py-1">
                              {{ attendanceRateValue(detail) }}% de présence
                            </span>
                          </div>
                        </div>

                        <div class="p-4">
                          <div class="space-y-3">
                            @for (student of paginatedRoster(); track student.studentId) {
                              <button
                                type="button"
                                class="group w-full rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-soft hover:bg-primary-soft/20 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                (click)="openStudentProfile(student)"
                              >
                                <div class="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_minmax(18rem,1fr)_auto] xl:items-center">
                                  <div class="flex min-w-0 items-center gap-4">
                                    <app-user-avatar
                                      [name]="student.firstName + ' ' + student.lastName"
                                      [imageUrl]="studentPfpUrl(student)"
                                      size="lg"
                                      shape="rounded"
                                    ></app-user-avatar>
                                    <div class="min-w-0">
                                      <p class="truncate text-[0.95rem] font-semibold text-principalText">
                                        {{ student.firstName }} {{ student.lastName }}
                                      </p>
                                      <p class="mt-0.5 truncate text-[0.8rem] text-secondaryText">
                                        {{ student.email }}
                                      </p>
                                    </div>
                                  </div>

                                  <div class="flex flex-wrap gap-2 text-xs">
                                    <span class="rounded-xl border border-line bg-surface-subtle px-3 py-1.5 font-semibold text-secondaryText shadow-sm">
                                      Apogée {{ student.numApogee }}
                                    </span>
                                    <span class="rounded-xl border border-primary-soft bg-primary-soft px-3 py-1.5 font-semibold text-primary shadow-sm">
                                      {{ groupName(student.groupId) }}
                                    </span>
                                    <span class="rounded-xl border border-secondary-soft bg-secondary-soft px-3 py-1.5 font-semibold text-secondary-strong shadow-sm">
                                      {{ methodLabel(student.markMethod) }}
                                    </span>
                                    @if (student.markedAt) {
                                      <span class="rounded-xl border border-line bg-surface-subtle px-3 py-1.5 font-semibold text-muted shadow-sm">
                                        {{ formatDateTime(student.markedAt) }}
                                      </span>
                                    }
                                  </div>

                                  <div class="flex items-center justify-between gap-3 xl:justify-end">
                                    <span class="text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                                      Voir le profil
                                    </span>
                                    <app-status-badge
                                      [label]="studentStatusLabel(student.status)"
                                      [variant]="studentStatusVariant(student.status)"
                                    ></app-status-badge>
                                  </div>
                                </div>
                              </button>
                            } @empty {
                              <div class="rounded-2xl border border-dashed border-line bg-surface px-4 py-10 text-center">
                                <p class="font-semibold text-principalText">Aucun étudiant ne correspond à ce filtre</p>
                                <p class="mt-1 text-sm text-secondaryText">Essayez un autre statut ou terme de recherche.</p>
                              </div>
                            }
                          </div>

                          @if (filteredRoster().length > rosterPageSize) {
                            <div class="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                              <p class="text-sm font-semibold text-secondaryText">
                                Page {{ normalizedRosterPage() }} sur {{ rosterTotalPages() }}
                                <span class="font-normal">- {{ filteredRoster().length }} étudiant(s)</span>
                              </p>
                              <div class="flex items-center gap-2">
                                <button
                                  type="button"
                                  class="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-principalText transition hover:border-primary-soft hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
                                  [disabled]="normalizedRosterPage() <= 1"
                                  (click)="previousRosterPage()"
                                >
                                  <i class="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>
                                  Précédent
                                </button>
                                <button
                                  type="button"
                                  class="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-principalText transition hover:border-primary-soft hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-40"
                                  [disabled]="normalizedRosterPage() >= rosterTotalPages()"
                                  (click)="nextRosterPage()"
                                >
                                  Suivant
                                  <i class="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
                                </button>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    } @else {
                      <div class="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm font-medium text-secondaryText">
                        Chargement des détails de la liste...
                      </div>
                    }

                    @if (detailLoading()) {
                      <p class="mt-3 text-sm font-medium text-secondaryText">Actualisation des détails de la liste...</p>
                    }
                  </section>
                }
              </article>
            }
          } @else {
            <div class="rounded-3xl border border-dashed border-line bg-surface px-5 py-16 text-center sm:px-6">
              <p class="text-base font-semibold text-principalText">Aucune session trouvée</p>
              <p class="mt-1 text-sm text-secondaryText">
                Démarrez les services backend et créez des sessions de présence pour alimenter cette page.
              </p>
            </div>
          }
        </div>
      </section>

      <app-modal
        [open]="studentProfileOpen()"
        [title]="selectedStudentName()"
        description="Profil de l’étudiant dans la liste de la session sélectionnée."
        size="lg"
        [showFooter]="false"
        (closed)="closeStudentProfile()"
      >
        <div modal-body>
          @if (selectedStudent(); as student) {
            <div class="space-y-5">
              <section class="rounded-[1.5rem] border border-line bg-linear-to-br from-primary-soft/70 via-surface to-secondary-soft/40 p-5 shadow-card">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex min-w-0 items-center gap-4">
                    <app-user-avatar
                      [name]="student.firstName + ' ' + student.lastName"
                      [imageUrl]="studentPfpUrl(student)"
                      size="lg"
                      shape="rounded"
                    ></app-user-avatar>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Profil étudiant</p>
                      <h3 class="mt-1 truncate text-2xl font-semibold text-principalText">{{ student.firstName }} {{ student.lastName }}</h3>
                      <p class="mt-1 truncate text-sm text-secondaryText">{{ student.email }}</p>
                    </div>
                  </div>
                  <app-status-badge
                    [label]="studentStatusLabel(student.status)"
                    [variant]="studentStatusVariant(student.status)"
                  ></app-status-badge>
                </div>
              </section>

              <section class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                  <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-soft bg-primary-soft text-primary">
                      <i class="fa-solid fa-id-card text-sm" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Apogée</p>
                      <p class="mt-1 font-semibold text-principalText">{{ student.numApogee }}</p>
                    </div>
                  </div>
                </div>
                <div class="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                  <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-soft bg-primary-soft text-primary">
                      <i class="fa-solid fa-users text-sm" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Groupe</p>
                      <p class="mt-1 font-semibold text-principalText">{{ groupName(student.groupId) }}</p>
                    </div>
                  </div>
                </div>
                <div class="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                  <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-secondary-soft bg-secondary-soft text-secondary-strong">
                      <i class="fa-solid fa-fingerprint text-sm" aria-hidden="true"></i>
                    </span>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Méthode de présence</p>
                      <p class="mt-1 font-semibold text-principalText">{{ methodLabel(student.markMethod) }}</p>
                    </div>
                  </div>
                </div>
                @if (student.markedAt) {
                  <div class="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                    <div class="flex items-center gap-3">
                      <span class="flex h-10 w-10 items-center justify-center rounded-xl border border-warning-soft bg-warning-soft text-warning">
                        <i class="fa-regular fa-clock text-sm" aria-hidden="true"></i>
                      </span>
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Heure de pointage</p>
                        <p class="mt-1 font-semibold text-principalText">{{ formatDateTime(student.markedAt) }}</p>
                      </div>
                    </div>
                  </div>
                }
              </section>

              @if (studentSummaryLoading()) {
                <section class="rounded-3xl border border-line bg-surface p-5 text-sm font-medium text-secondaryText">
                  Chargement du résumé des présences universitaires...
                </section>
              } @else if (selectedStudentSummary(); as summary) {
                <section class="rounded-[1.5rem] border border-line bg-surface p-5 shadow-card">
                  <div>
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Résumé de l’année universitaire</p>
                      <h4 class="mt-1 text-lg font-semibold text-principalText">Analyse des absences</h4>
                    </div>
                  </div>

                  <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div class="rounded-2xl border border-line bg-surface-subtle p-4">
                      <div class="flex items-center gap-3">
                        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-primary shadow-sm">
                          <i class="fa-regular fa-calendar-xmark" aria-hidden="true"></i>
                        </span>
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Absences totales</p>
                          <p class="mt-1 text-2xl font-semibold text-principalText">{{ summary.totalAbsences }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-success/20 bg-secondary-soft p-4">
                      <div class="flex items-center gap-3">
                        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-secondary-strong shadow-sm">
                          <i class="fa-solid fa-check" aria-hidden="true"></i>
                        </span>
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-secondary-strong">Justifiées</p>
                          <p class="mt-1 text-2xl font-semibold text-secondary-strong">{{ summary.justifiedAbsences }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-danger/20 bg-danger-soft p-4">
                      <div class="flex items-center gap-3">
                        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-danger shadow-sm">
                          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                        </span>
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-danger">Non justifiées</p>
                          <p class="mt-1 text-2xl font-semibold text-danger">{{ summary.unjustifiedAbsences }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-line bg-surface-subtle p-4">
                      <div class="flex items-center gap-3">
                        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-warning shadow-sm">
                          <i class="fa-regular fa-hourglass-half" aria-hidden="true"></i>
                        </span>
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Heures d'absence</p>
                          <p class="mt-1 text-2xl font-semibold text-principalText">{{ formatHours(summary.totalAbsenceHours) }}</p>
                        </div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-line bg-surface-subtle p-4">
                      <div class="flex items-center gap-3">
                        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-secondaryText shadow-sm">
                          <i class="fa-regular fa-calendar" aria-hidden="true"></i>
                        </span>
                        <div>
                          <p class="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Dernière absence</p>
                          <p class="mt-1 text-sm font-semibold text-principalText">
                            {{ summary.lastAbsenceAt ? formatDateTime(summary.lastAbsenceAt) : 'Aucune absence enregistrée' }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              }

            </div>
          }
        </div>
      </app-modal>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePage {
  private readonly attendanceService = inject(AdminAttendanceService);
  private readonly studentService = inject(AdminStudentService);
  private readonly yearService = inject(AnneeUniversitaireService);
  private readonly formationService = inject(FormationService);
  private readonly groupService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);
  private readonly filiereService = inject(FiliereService);

  readonly rosterFilters: ReadonlyArray<{ readonly value: RosterFilter; readonly label: string }> = [
    { value: 'ALL', label: 'Tous' },
    { value: 'PRESENT', label: 'Présents' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'JUSTIFIED', label: 'Justifiées' },
    { value: 'UNKNOWN', label: 'Ouverts' },
  ];

  readonly overview = signal<AdminAttendanceOverviewDto | null>(null);
  readonly sessions = signal<readonly AdminAttendanceSessionSummaryDto[]>([]);
  readonly selectedSessionId = signal<number | null>(null);
  readonly selectedDetail = signal<AdminAttendanceSessionDetailsDto | null>(null);
  readonly selectedStudent = signal<AdminAttendanceStudentViewDto | null>(null);
  readonly selectedStudentSummary = signal<AdminStudentAttendanceSummaryDto | null>(null);
  readonly academicYears = signal<readonly AnneeUniversitaire[]>([]);
  readonly formations = signal<readonly Formation[]>([]);
  readonly groups = signal<readonly Groupe[]>([]);
  readonly modules = signal<readonly Module[]>([]);
  readonly filieres = signal<readonly Filiere[]>([]);
  readonly studentPhotoUrls = signal<ReadonlyMap<number, string>>(new Map());
  readonly rosterStatusFilter = signal<RosterFilter>('ALL');
  readonly rosterSearchQuery = signal('');
  readonly rosterPage = signal(1);
  readonly rosterPageSize = 8;
  readonly isLoading = signal(false);
  readonly detailLoading = signal(false);
  readonly studentSummaryLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly filteredRoster = computed(() => {
    const detail = this.selectedDetail();
    if (!detail) {
      return [];
    }

    const status = this.rosterStatusFilter();
    const search = this.rosterSearchQuery().trim().toLowerCase();

    return detail.students.filter((student) => {
      if (status !== 'ALL' && student.status !== status) {
        return false;
      }
      if (!search) {
        return true;
      }
      return [
        student.firstName,
        student.lastName,
        student.email,
        student.numApogee,
        `group ${student.groupId}`,
        student.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  });
  readonly rosterTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRoster().length / this.rosterPageSize)),
  );
  readonly normalizedRosterPage = computed(() =>
    Math.min(this.rosterPage(), this.rosterTotalPages()),
  );
  readonly paginatedRoster = computed(() => {
    const start = (this.normalizedRosterPage() - 1) * this.rosterPageSize;
    return this.filteredRoster().slice(start, start + this.rosterPageSize);
  });
  readonly studentProfileOpen = computed(() => this.selectedStudent() !== null);
  readonly selectedStudentName = computed(() => {
    const student = this.selectedStudent();
    return student ? `${student.firstName} ${student.lastName}` : 'Profil étudiant';
  });
  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      overview: this.attendanceService.getOverview(),
      sessions: this.attendanceService.getSessions({ page: 0, size: 200, sort: 'startedAt,desc' }),
      academicYears: this.yearService.getAll().pipe(catchError(() => of([] as readonly AnneeUniversitaire[]))),
      formations: this.formationService.getAll().pipe(catchError(() => of([] as readonly Formation[]))),
      groups: this.groupService.getAll().pipe(catchError(() => of([] as readonly Groupe[]))),
      modules: this.moduleService.getAll().pipe(catchError(() => of([] as readonly Module[]))),
      filieres: this.filiereService.getAll().pipe(catchError(() => of([] as readonly Filiere[]))),
      students: this.studentService.getAll().pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ overview, sessions, academicYears, formations, groups, modules, filieres, students }) => {
          this.overview.set(overview);
          this.sessions.set(sessions.items);
          this.academicYears.set(academicYears);
          this.formations.set(formations);
          this.groups.set(groups);
          this.modules.set(modules);
          this.filieres.set(filieres);
          this.studentPhotoUrls.set(
            new Map(
              students
                .map((student) => [student.id, student.pfpUrl?.trim() || null] as const)
                .filter((entry): entry is readonly [number, string] => Boolean(entry[1])),
            ),
          );
          const selectedId = this.selectedSessionId();
          if (selectedId && !sessions.items.some((session) => session.sessionId === selectedId)) {
            this.clearSelectedRoster();
          }
        },
        error: () => {
          this.errorMessage.set('Impossible de charger les sessions de présence. Vérifiez les services backend et l’authentification.');
        },
      });
  }

  toggleRoster(session: AdminAttendanceSessionSummaryDto): void {
    if (this.selectedSessionId() === session.sessionId) {
      this.clearSelectedRoster();
      return;
    }

    this.selectedSessionId.set(session.sessionId);
    this.selectedDetail.set(null);
    this.selectedStudent.set(null);
    this.selectedStudentSummary.set(null);
    this.rosterStatusFilter.set('ALL');
    this.rosterSearchQuery.set('');
    this.rosterPage.set(1);
    this.detailLoading.set(true);
    this.attendanceService
      .getSession(session.sessionId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => this.selectedDetail.set(detail),
        error: () => this.errorMessage.set('Impossible de charger la liste de la session sélectionnée.'),
      });
  }

  clearSelectedRoster(): void {
    this.selectedSessionId.set(null);
    this.selectedDetail.set(null);
    this.selectedStudent.set(null);
    this.selectedStudentSummary.set(null);
    this.rosterStatusFilter.set('ALL');
    this.rosterSearchQuery.set('');
    this.rosterPage.set(1);
  }

  isSelected(session: AdminAttendanceSessionSummaryDto): boolean {
    return this.selectedSessionId() === session.sessionId;
  }

  openStudentProfile(student: AdminAttendanceStudentViewDto): void {
    this.selectedStudent.set(student);
    this.selectedStudentSummary.set(null);
    this.studentSummaryLoading.set(true);
    const range = this.summaryRangeForGroup(student.groupId);
    this.attendanceService
      .getStudentSummary(student.studentId, range)
      .pipe(finalize(() => this.studentSummaryLoading.set(false)))
      .subscribe({
        next: (summary) => this.selectedStudentSummary.set(summary),
        error: () => this.selectedStudentSummary.set(null),
      });
  }

  studentPfpUrl(student: AdminAttendanceStudentViewDto): string | null {
    return student.pfpUrl?.trim() || this.studentPhotoUrls().get(student.studentId) || null;
  }

  closeStudentProfile(): void {
    this.selectedStudent.set(null);
    this.selectedStudentSummary.set(null);
  }

  setRosterStatus(status: RosterFilter): void {
    this.rosterStatusFilter.set(status);
    this.rosterPage.set(1);
  }

  onRosterSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.rosterSearchQuery.set(target.value);
      this.rosterPage.set(1);
    }
  }

  previousRosterPage(): void {
    this.rosterPage.update((page) => Math.max(1, page - 1));
  }

  nextRosterPage(): void {
    this.rosterPage.update((page) => Math.min(this.rosterTotalPages(), page + 1));
  }

  countRosterStatus(status: RosterFilter): number {
    const detail = this.selectedDetail();
    if (!detail) {
      return 0;
    }
    return status === 'ALL'
      ? detail.students.length
      : detail.students.filter((student) => student.status === status).length;
  }

  teacherLabel(value: string | null): string {
    return value?.trim() || 'Enseignant non renseigné';
  }

  groupLabel(groupIds: readonly number[]): string {
    return groupIds.length ? groupIds.map((id) => this.groupName(id)).join(', ') : 'Aucun groupe';
  }

  groupName(groupId: number): string {
    return this.groups().find((group) => group.id === groupId)?.name ?? `Groupe #${groupId}`;
  }

  sessionContextItems(session: AdminAttendanceSessionSummaryDto): ReadonlyArray<{ readonly label: string; readonly value: string }> {
    return [
      { label: 'Année universitaire', value: this.academicYearLabel(session.groupIds) },
      { label: 'Formation', value: this.formationLabel(session.groupIds) },
      { label: 'Filière', value: this.filiereLabel(session.groupIds) },
      { label: 'Semestre', value: this.semesterLabel(session.courseLabel, session.groupIds) },
      { label: 'Module', value: session.courseLabel },
      { label: 'Groupe', value: this.groupLabel(session.groupIds) },
      { label: 'Enseignant', value: this.teacherLabel(session.teacherFullName) },
      { label: 'Salle', value: session.roomLabel },
      { label: 'Date', value: this.formatDate(session.startedAt) },
      { label: 'Heure', value: this.formatTimeRange(session.startedAt, session.endedAt ?? session.endsAt) },
      { label: 'Statut', value: session.status === 'ACTIVE' ? 'Active' : 'Finalisée' },
      { label: 'Taux de présence', value: `${this.attendanceRateValue(session)}%` },
    ];
  }

  attendanceRateValue(session: AdminAttendanceSessionSummaryDto): number {
    const resolved = session.presentCount + session.absentCount;
    return resolved === 0 ? 0 : Math.round((session.presentCount / resolved) * 100);
  }

  durationLabel(session: AdminAttendanceSessionSummaryDto): string {
    const start = new Date(session.startedAt).getTime();
    const end = new Date(session.endedAt ?? session.endsAt).getTime();
    const minutes = Math.max(0, Math.round((end - start) / 60000));
    return minutes > 0 ? `${minutes} min` : 'Durée inconnue';
  }

  studentStatusVariant(status: AttendanceStudentStatus): 'success' | 'warning' | 'error' | 'neutral' {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'error';
      case 'JUSTIFIED':
        return 'warning';
      case 'UNKNOWN':
        return 'neutral';
    }
  }

  studentStatusLabel(status: AttendanceStudentStatus): string {
    switch (status) {
      case 'PRESENT':
        return 'Présent';
      case 'ABSENT':
        return 'Absent';
      case 'JUSTIFIED':
        return 'Justifiées';
      case 'UNKNOWN':
        return 'Ouvert';
    }
  }

  methodLabel(method: AdminAttendanceStudentViewDto['markMethod']): string {
    switch (method) {
      case 'QR_CODE':
        return 'QR code';
      case 'FACE_ID':
        return 'Face ID';
      case 'MANUAL':
        return 'Manuel';
      default:
        return 'Non pointé';
    }
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  formatHours(value: number): string {
    return `${Number(value.toFixed(1))} h`;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
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

  formatTimeRange(start: string, end: string): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`;
  }

  private academicYearLabel(groupIds: readonly number[]): string {
    const formation = this.firstFormationForGroups(groupIds);
    if (!formation) {
      return 'Non renseigné';
    }
    return this.academicYears().find((year) => year.id === formation.anneeUniversitaireId)?.name ?? 'Non renseigné';
  }

  private formationLabel(groupIds: readonly number[]): string {
    return this.firstFormationForGroups(groupIds)?.name ?? 'Non renseigné';
  }

  private filiereLabel(groupIds: readonly number[]): string {
    const formation = this.firstFormationForGroups(groupIds);
    if (!formation?.filiereId) {
      return 'Non renseigné';
    }
    const filiere = this.filieres().find((item) => item.id === formation.filiereId);
    return filiere ? `${filiere.code} - ${filiere.name}` : 'Non renseigné';
  }

  private semesterLabel(courseLabel: string, groupIds: readonly number[]): string {
    const formation = this.firstFormationForGroups(groupIds);
    const normalizedCourse = courseLabel.trim().toLowerCase();
    const module = this.modules().find(
      (item) =>
        item.formationId === formation?.id &&
        (item.name.trim().toLowerCase() === normalizedCourse || item.code.trim().toLowerCase() === normalizedCourse),
    );
    return module?.semester ? `Semestre ${module.semester}` : 'Non renseigné';
  }

  private firstFormationForGroups(groupIds: readonly number[]): Formation | null {
    const group = groupIds
      .map((groupId) => this.groups().find((item) => item.id === groupId))
      .find((item): item is Groupe => Boolean(item));
    if (!group) {
      return null;
    }
    return this.formations().find((formation) => formation.id === group.formationId) ?? null;
  }

  private summaryRangeForGroup(groupId: number): { readonly dateFrom?: string | null; readonly dateTo?: string | null } {
    const group = this.groups().find((item) => item.id === groupId);
    const formation = group ? this.formations().find((item) => item.id === group.formationId) : null;
    const year = formation
      ? this.academicYears().find((item) => item.id === formation.anneeUniversitaireId)
      : null;
    return {
      dateFrom: year?.startDate ?? null,
      dateTo: year?.endDate ?? null,
    };
  }
}
