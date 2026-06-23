import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  AdminAttendanceOverviewDto,
  AdminAttendanceSessionDetailsDto,
  AdminAttendanceSessionSummaryDto,
  AdminAttendanceStudentViewDto,
  AttendanceStudentStatus,
} from '../../../core/admin/models/admin-attendance.model';
import { AdminAttendanceService } from '../../../core/admin/services/admin-attendance.service';
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

type RosterFilter = 'ALL' | AttendanceStudentStatus;

@Component({
  selector: 'app-attendance-page',
  imports: [Button, Modal, StatusBadge],
  template: `
    <section class="space-y-7">
      <header class="rounded-[1.75rem] border border-line bg-surface px-5 py-6 shadow-card sm:px-7">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-muted">Academic attendance</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-principalText">Attendance</h1>
            <p class="mt-2 max-w-3xl text-sm leading-6 text-secondaryText">
              Track sessions, inspect rosters, and verify attendance quality across groups.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span class="inline-flex items-center gap-2 rounded-2xl border border-primary-soft bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
              <span class="h-2 w-2 rounded-full bg-secondary"></span>
              {{ overviewMeta() }}
            </span>
            <app-button
              label="Refresh"
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
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Session registry</p>
            <h2 class="mt-1 text-2xl font-semibold text-principalText">Registered sessions</h2>
          </div>
          <p class="text-sm text-secondaryText">Open one session at a time to inspect its roster.</p>
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
                        [label]="session.status === 'ACTIVE' ? 'Active' : 'Finalized'"
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
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-secondary-strong">Present</span>
                      </span>
                      <span class="rounded-2xl bg-danger-soft px-3 py-2">
                        <span class="block text-xl font-semibold text-danger">{{ session.absentCount }}</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-danger">Absent</span>
                      </span>
                      <span class="rounded-2xl bg-surface-subtle px-3 py-2">
                        <span class="block text-xl font-semibold text-secondaryText">{{ session.unknownCount }}</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Open</span>
                      </span>
                      <span class="rounded-2xl bg-primary-soft px-3 py-2">
                        <span class="block text-xl font-semibold text-primary">{{ attendanceRateValue(session) }}%</span>
                        <span class="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-primary">Rate</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      class="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      [attr.aria-expanded]="isSelected(session)"
                      (click)="toggleRoster(session)"
                    >
                      <i [class]="isSelected(session) ? 'fa-solid fa-chevron-up' : 'fa-solid fa-users-viewfinder'" aria-hidden="true"></i>
                      {{ isSelected(session) ? 'Hide roster' : 'View roster' }}
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
                              <h3 class="text-xl font-semibold text-principalText">Roster inspection</h3>
                              <p class="mt-1 text-sm text-secondaryText">Review student attendance status for this session.</p>
                            </div>

                            <label class="relative block min-w-0 xl:w-96">
                              <span class="sr-only">Search roster</span>
                              <i
                                class="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs text-secondaryText"
                                aria-hidden="true"
                              ></i>
                              <input
                                type="search"
                                [value]="rosterSearchQuery()"
                                (input)="onRosterSearchInput($event)"
                                placeholder="Search student, email, Apogee or group..."
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

                          <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            @for (item of sessionContextItems(detail); track item.label) {
                              <div class="rounded-2xl border border-line bg-surface-subtle px-4 py-3">
                                <p class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{{ item.label }}</p>
                                <p class="mt-1 truncate text-sm font-semibold text-principalText">{{ item.value }}</p>
                              </div>
                            }
                          </div>
                        </div>

                        <div class="max-h-[34rem] overflow-y-auto p-4">
                          <div class="space-y-3">
                            @for (student of filteredRoster(); track student.studentId) {
                              <button
                                type="button"
                                class="group w-full rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-soft hover:bg-primary-soft/20 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                (click)="openStudentProfile(student)"
                              >
                                <div class="grid gap-4 xl:grid-cols-[minmax(16rem,1fr)_minmax(18rem,1fr)_auto] xl:items-center">
                                  <div class="flex min-w-0 items-center gap-4">
                                    <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-soft bg-gradient-to-br from-primary-soft to-surface text-sm font-semibold text-primary shadow-sm">
                                      {{ studentInitials(student) }}
                                    </span>
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
                                      Apogee {{ student.numApogee }}
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
                                      View profile
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
                                <p class="font-semibold text-principalText">No students match this filter</p>
                                <p class="mt-1 text-sm text-secondaryText">Try another status or search term.</p>
                              </div>
                            }
                          </div>
                        </div>
                      </div>
                    } @else {
                      <div class="rounded-2xl border border-line bg-surface px-4 py-10 text-center text-sm font-medium text-secondaryText">
                        Loading roster details...
                      </div>
                    }

                    @if (detailLoading()) {
                      <p class="mt-3 text-sm font-medium text-secondaryText">Refreshing roster details...</p>
                    }
                  </section>
                }
              </article>
            }
          } @else {
            <div class="rounded-3xl border border-dashed border-line bg-surface px-5 py-16 text-center sm:px-6">
              <p class="text-base font-semibold text-principalText">No sessions found</p>
              <p class="mt-1 text-sm text-secondaryText">
                Start backend services and create attendance sessions to populate this page.
              </p>
            </div>
          }
        </div>
      </section>

      <app-modal
        [open]="studentProfileOpen()"
        [title]="selectedStudentName()"
        description="Student roster profile for the selected session."
        size="lg"
        [showFooter]="false"
        (closed)="closeStudentProfile()"
      >
        <div modal-body>
          @if (selectedStudent(); as student) {
            <div class="space-y-6">
              <section class="flex flex-col gap-4 rounded-3xl border border-line bg-surface-subtle p-5 sm:flex-row sm:items-center">
                <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-primary-soft bg-gradient-to-br from-primary-soft to-surface text-lg font-semibold text-primary shadow-sm">
                  {{ studentInitials(student) }}
                </span>
                <div class="min-w-0 flex-1">
                  <h3 class="truncate text-2xl font-semibold text-principalText">{{ student.firstName }} {{ student.lastName }}</h3>
                  <p class="mt-1 text-sm text-secondaryText">{{ student.email }}</p>
                </div>
                <app-status-badge
                  [label]="studentStatusLabel(student.status)"
                  [variant]="studentStatusVariant(student.status)"
                ></app-status-badge>
              </section>

              <section class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-line bg-surface p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Apogee</p>
                  <p class="mt-1 font-semibold text-principalText">{{ student.numApogee }}</p>
                </div>
                <div class="rounded-2xl border border-line bg-surface p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Group</p>
                  <p class="mt-1 font-semibold text-principalText">{{ groupName(student.groupId) }}</p>
                </div>
                <div class="rounded-2xl border border-line bg-surface p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Attendance method</p>
                  <p class="mt-1 font-semibold text-principalText">{{ methodLabel(student.markMethod) }}</p>
                </div>
                @if (student.markedAt) {
                  <div class="rounded-2xl border border-line bg-surface p-4">
                    <p class="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Marked time</p>
                    <p class="mt-1 font-semibold text-principalText">{{ formatDateTime(student.markedAt) }}</p>
                  </div>
                }
              </section>

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
  private readonly yearService = inject(AnneeUniversitaireService);
  private readonly formationService = inject(FormationService);
  private readonly groupService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);
  private readonly filiereService = inject(FiliereService);

  readonly rosterFilters: ReadonlyArray<{ readonly value: RosterFilter; readonly label: string }> = [
    { value: 'ALL', label: 'All' },
    { value: 'PRESENT', label: 'Present' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'JUSTIFIED', label: 'Justified' },
    { value: 'UNKNOWN', label: 'Open' },
  ];

  readonly overview = signal<AdminAttendanceOverviewDto | null>(null);
  readonly sessions = signal<readonly AdminAttendanceSessionSummaryDto[]>([]);
  readonly selectedSessionId = signal<number | null>(null);
  readonly selectedDetail = signal<AdminAttendanceSessionDetailsDto | null>(null);
  readonly selectedStudent = signal<AdminAttendanceStudentViewDto | null>(null);
  readonly academicYears = signal<readonly AnneeUniversitaire[]>([]);
  readonly formations = signal<readonly Formation[]>([]);
  readonly groups = signal<readonly Groupe[]>([]);
  readonly modules = signal<readonly Module[]>([]);
  readonly filieres = signal<readonly Filiere[]>([]);
  readonly rosterStatusFilter = signal<RosterFilter>('ALL');
  readonly rosterSearchQuery = signal('');
  readonly isLoading = signal(false);
  readonly detailLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly overviewMeta = computed(() => {
    const overview = this.overview();
    return overview ? `${overview.totalSessions} total sessions` : 'Attendance tracking';
  });
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
  readonly studentProfileOpen = computed(() => this.selectedStudent() !== null);
  readonly selectedStudentName = computed(() => {
    const student = this.selectedStudent();
    return student ? `${student.firstName} ${student.lastName}` : 'Student profile';
  });
  // TODO: Add yearly attendance statistics when an admin endpoint exposes student attendance history by academic year.

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
    })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ({ overview, sessions, academicYears, formations, groups, modules, filieres }) => {
          this.overview.set(overview);
          this.sessions.set(sessions.items);
          this.academicYears.set(academicYears);
          this.formations.set(formations);
          this.groups.set(groups);
          this.modules.set(modules);
          this.filieres.set(filieres);
          const selectedId = this.selectedSessionId();
          if (selectedId && !sessions.items.some((session) => session.sessionId === selectedId)) {
            this.clearSelectedRoster();
          }
        },
        error: () => {
          this.errorMessage.set('Unable to load attendance sessions. Check backend services and auth.');
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
    this.rosterStatusFilter.set('ALL');
    this.rosterSearchQuery.set('');
    this.detailLoading.set(true);
    this.attendanceService
      .getSession(session.sessionId)
      .pipe(finalize(() => this.detailLoading.set(false)))
      .subscribe({
        next: (detail) => this.selectedDetail.set(detail),
        error: () => this.errorMessage.set('Unable to load selected session roster.'),
      });
  }

  clearSelectedRoster(): void {
    this.selectedSessionId.set(null);
    this.selectedDetail.set(null);
    this.selectedStudent.set(null);
    this.rosterStatusFilter.set('ALL');
    this.rosterSearchQuery.set('');
  }

  isSelected(session: AdminAttendanceSessionSummaryDto): boolean {
    return this.selectedSessionId() === session.sessionId;
  }

  openStudentProfile(student: AdminAttendanceStudentViewDto): void {
    this.selectedStudent.set(student);
  }

  closeStudentProfile(): void {
    this.selectedStudent.set(null);
  }

  setRosterStatus(status: RosterFilter): void {
    this.rosterStatusFilter.set(status);
  }

  onRosterSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.rosterSearchQuery.set(target.value);
    }
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
    return value?.trim() || 'Teacher not provided';
  }

  groupLabel(groupIds: readonly number[]): string {
    return groupIds.length ? groupIds.map((id) => this.groupName(id)).join(', ') : 'No groups';
  }

  groupName(groupId: number): string {
    return this.groups().find((group) => group.id === groupId)?.name ?? `Group #${groupId}`;
  }

  sessionContextItems(session: AdminAttendanceSessionSummaryDto): ReadonlyArray<{ readonly label: string; readonly value: string }> {
    return [
      { label: 'Academic year', value: this.academicYearLabel(session.groupIds) },
      { label: 'Formation', value: this.formationLabel(session.groupIds) },
      { label: 'Filiere', value: this.filiereLabel(session.groupIds) },
      { label: 'Semester', value: this.semesterLabel(session.courseLabel, session.groupIds) },
      { label: 'Module', value: session.courseLabel },
      { label: 'Group', value: this.groupLabel(session.groupIds) },
      { label: 'Teacher', value: this.teacherLabel(session.teacherFullName) },
      { label: 'Room', value: session.roomLabel },
      { label: 'Date', value: this.formatDate(session.startedAt) },
      { label: 'Time', value: this.formatTimeRange(session.startedAt, session.endedAt ?? session.endsAt) },
      { label: 'Status', value: session.status === 'ACTIVE' ? 'Active' : 'Finalized' },
      { label: 'Attendance rate', value: `${this.attendanceRateValue(session)}%` },
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
    return minutes > 0 ? `${minutes} min` : 'Duration unknown';
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
        return 'Present';
      case 'ABSENT':
        return 'Absent';
      case 'JUSTIFIED':
        return 'Justified';
      case 'UNKNOWN':
        return 'Open';
    }
  }

  methodLabel(method: AdminAttendanceStudentViewDto['markMethod']): string {
    switch (method) {
      case 'QR_CODE':
        return 'QR code';
      case 'FACE_ID':
        return 'Face ID';
      case 'MANUAL':
        return 'Manual';
      default:
        return 'Not marked';
    }
  }

  studentInitials(student: AdminAttendanceStudentViewDto): string {
    return `${student.firstName?.[0] ?? ''}${student.lastName?.[0] ?? ''}`.toUpperCase() || 'ST';
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
      return 'Not specified';
    }
    return this.academicYears().find((year) => year.id === formation.anneeUniversitaireId)?.name ?? 'Not specified';
  }

  private formationLabel(groupIds: readonly number[]): string {
    return this.firstFormationForGroups(groupIds)?.name ?? 'Not specified';
  }

  private filiereLabel(groupIds: readonly number[]): string {
    const formation = this.firstFormationForGroups(groupIds);
    if (!formation?.filiereId) {
      return 'Not specified';
    }
    const filiere = this.filieres().find((item) => item.id === formation.filiereId);
    return filiere ? `${filiere.code} - ${filiere.name}` : 'Not specified';
  }

  private semesterLabel(courseLabel: string, groupIds: readonly number[]): string {
    const formation = this.firstFormationForGroups(groupIds);
    const normalizedCourse = courseLabel.trim().toLowerCase();
    const module = this.modules().find(
      (item) =>
        item.formationId === formation?.id &&
        (item.name.trim().toLowerCase() === normalizedCourse || item.code.trim().toLowerCase() === normalizedCourse),
    );
    return module?.semester ? `Semester ${module.semester}` : 'Not specified';
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
}
