import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, forkJoin, of, OperatorFunction } from 'rxjs';

import {
  AdminAttendanceOverviewDto,
  AdminAttendanceSessionSummaryDto,
  PagedResponseDto,
} from '../../../../core/admin/models/admin-attendance.model';
import { AdminStudentInscriptionDto, AdminTeacherAssignmentDto } from '../../../../core/admin/models/admin-inscription.model';
import { JustificationDto } from '../../../../core/justifications/justification.model';
import { AdminStudentDto, AdminTeacherDto } from '../../../../core/admin/models/admin-user.model';
import { AdminAttendanceService } from '../../../../core/admin/services/admin-attendance.service';
import { AdminInscriptionService } from '../../../../core/admin/services/admin-inscription.service';
import { JustificationService } from '../../../../core/justifications/justification.service';
import { AdminStudentService } from '../../../../core/admin/services/admin-student.service';
import { AdminTeacherService } from '../../../../core/admin/services/admin-teacher.service';
import { AnneeUniversitaire } from '../../../../core/structure/models/annee-universitaire.model';
import { Filiere } from '../../../../core/structure/models/filiere.model';
import { Formation } from '../../../../core/structure/models/formation.model';
import { Groupe } from '../../../../core/structure/models/groupe.model';
import { Module } from '../../../../core/structure/models/module.model';
import { AnneeUniversitaireService } from '../../../../core/structure/services/annee-universitaire.service';
import { FiliereService } from '../../../../core/structure/services/filiere.service';
import { FormationService } from '../../../../core/structure/services/formation.service';
import { GroupeService } from '../../../../core/structure/services/groupe.service';
import { ModuleService } from '../../../../core/structure/services/module.service';
import { DropdownFilter } from '../../../../shared/components/dropdown-filter/dropdown-filter';
import { Modal } from '../../../../shared/components/modal/modal';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
import {
  AbsenceAnalyticsPoint,
  AbsenceLineChart,
} from '../components/absence-line-chart/absence-line-chart';

type DashboardVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';
type AnalyticsRange = '14' | 'month' | 'year';
type AnalyticsMode = 'day' | 'time';

interface KpiCard {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly icon: string;
  readonly variant: DashboardVariant;
}

interface DistributionSegment {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
  readonly variant: DashboardVariant;
}

interface PerformanceRow {
  readonly id: string;
  readonly label: string;
  readonly meta: string;
  readonly rate: number;
  readonly present: number;
  readonly absent: number;
  readonly variant: DashboardVariant;
  readonly formationId?: number | null;
  readonly filiereId?: number | null;
  readonly moduleIds?: readonly number[];
}

interface AlertItem {
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly route: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DropdownFilter, Modal, StatusBadge, AbsenceLineChart],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly attendanceService = inject(AdminAttendanceService);
  private readonly justificationService = inject(JustificationService);
  private readonly studentService = inject(AdminStudentService);
  private readonly teacherService = inject(AdminTeacherService);
  private readonly inscriptionService = inject(AdminInscriptionService);
  private readonly yearService = inject(AnneeUniversitaireService);
  private readonly formationService = inject(FormationService);
  private readonly groupService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);
  private readonly filiereService = inject(FiliereService);
  private readonly destroyRef = inject(DestroyRef);

  readonly overview = signal<AdminAttendanceOverviewDto | null>(null);
  readonly sessions = signal<readonly AdminAttendanceSessionSummaryDto[]>([]);
  readonly justifications = signal<readonly JustificationDto[]>([]);
  readonly students = signal<readonly AdminStudentDto[]>([]);
  readonly teachers = signal<readonly AdminTeacherDto[]>([]);
  readonly studentInscriptions = signal<readonly AdminStudentInscriptionDto[]>([]);
  readonly teacherAssignments = signal<readonly AdminTeacherAssignmentDto[]>([]);
  readonly academicYears = signal<readonly AnneeUniversitaire[]>([]);
  readonly formations = signal<readonly Formation[]>([]);
  readonly groups = signal<readonly Groupe[]>([]);
  readonly modules = signal<readonly Module[]>([]);
  readonly filieres = signal<readonly Filiere[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastUpdated = signal<Date | null>(null);
  readonly analyticsRange = signal<AnalyticsRange>('14');
  readonly analyticsMode = signal<AnalyticsMode>('day');
  readonly analyticsExpanded = signal(false);
  readonly groupFiliereFilter = signal('all');
  readonly groupModuleFilter = signal('all');

  readonly analyticsRanges: ReadonlyArray<{ readonly value: AnalyticsRange; readonly label: string }> = [
    { value: '14', label: '14 jours' },
    { value: 'month', label: 'Ce mois' },
    { value: 'year', label: 'Année' },
  ];
  readonly analyticsModes: ReadonlyArray<{ readonly value: AnalyticsMode; readonly label: string }> = [
    { value: 'day', label: 'Par jour' },
    { value: 'time', label: 'Par heure' },
  ];

  readonly activeYearName = computed(() => this.academicYears().find((year) => year.active)?.name ?? 'Aucune année active');
  readonly todaySessions = computed(() => this.sessions().filter((session) => this.isToday(session.startedAt)));
  readonly activeSessions = computed(() => this.sessions().filter((session) => session.status === 'ACTIVE'));
  readonly pendingJustifications = computed(() => this.justifications().filter((item) => item.status === 'PENDING'));
  readonly todayPresent = computed(() => this.todaySessions().reduce((total, session) => total + session.presentCount, 0));
  readonly todayAbsent = computed(() => this.todaySessions().reduce((total, session) => total + session.absentCount, 0));
  readonly todayOpen = computed(() => this.todaySessions().reduce((total, session) => total + session.unknownCount, 0));
  readonly todayAttendanceRate = computed(() => this.rate(this.todayPresent(), this.todayAbsent()));

  readonly groupsWithAttendanceToday = computed(() => {
    const ids = new Set<number>();
    for (const session of this.todaySessions()) {
      session.groupIds.forEach((groupId) => ids.add(groupId));
    }
    return ids;
  });
  readonly groupsWithoutAttendanceToday = computed(() =>
    this.groups().filter((group) => !this.groupsWithAttendanceToday().has(group.id)).length,
  );

  readonly kpiCards = computed<readonly KpiCard[]>(() => [
    {
      label: 'Étudiants',
      value: String(this.students().length),
      helper: `${this.studentInscriptions().length} inscrit(s)`,
      icon: 'fa-solid fa-user-graduate',
      variant: 'info',
    },
    {
      label: 'Enseignants',
      value: String(this.teachers().length),
      helper: `${this.teacherAssignments().length} affectation(s)`,
      icon: 'fa-solid fa-chalkboard-user',
      variant: 'neutral',
    },
    {
      label: 'Groupes',
      value: String(this.groups().length),
      helper: `${this.groupsWithoutAttendanceToday()} sans présence aujourd'hui`,
      icon: 'fa-solid fa-users-rectangle',
      variant: this.groupsWithoutAttendanceToday() > 0 ? 'warning' : 'success',
    },
    {
      label: 'Modules',
      value: String(this.modules().length),
      helper: `${this.formations().length} formation(s)`,
      icon: 'fa-solid fa-book-open',
      variant: 'neutral',
    },
    {
      label: 'Sessions du jour',
      value: String(this.todaySessions().length),
      helper: `${this.sessions().length} enregistrée(s) au total`,
      icon: 'fa-regular fa-calendar-check',
      variant: 'info',
    },
    {
      label: 'Sessions actives',
      value: String(this.activeSessions().length),
      helper: this.activeSessions().length ? 'suivi en direct' : 'aucune en cours',
      icon: 'fa-solid fa-signal',
      variant: this.activeSessions().length ? 'info' : 'neutral',
    },
    {
      label: 'Présence aujourd’hui',
      value: this.formatPercent(this.todayAttendanceRate()),
      helper: `${this.todayPresent()} présent(s) / ${this.todayAbsent()} absent(s)`,
      icon: 'fa-solid fa-chart-line',
      variant: this.healthVariant(this.todayAttendanceRate()),
    },
    {
      label: 'Justifications en attente',
      value: String(this.pendingJustifications().length),
      helper: 'en attente de décision',
      icon: 'fa-regular fa-file-lines',
      variant: this.pendingJustifications().length ? 'warning' : 'success',
    },
  ]);

  readonly attendanceDistribution = computed<readonly DistributionSegment[]>(() => {
    const total = this.todayPresent() + this.todayAbsent() + this.todayOpen();
    return [
      { label: 'Présents', value: this.todayPresent(), percent: this.percent(this.todayPresent(), total), variant: 'success' },
      { label: 'Absents', value: this.todayAbsent(), percent: this.percent(this.todayAbsent(), total), variant: 'error' },
      { label: 'Ouverts', value: this.todayOpen(), percent: this.percent(this.todayOpen(), total), variant: 'neutral' },
    ];
  });

  readonly analyticsPoints = computed<readonly AbsenceAnalyticsPoint[]>(() =>
    this.analyticsMode() === 'time' ? this.buildTimeAnalytics() : this.buildTimelineAnalytics(),
  );
  readonly markedToday = computed(() => this.todayPresent() + this.todayAbsent() + this.todayOpen());
  readonly groupFiliereOptions = computed(() =>
    this.filieres()
      .map((filiere) => ({ value: String(filiere.id), label: `${filiere.code} - ${filiere.name}` }))
      .sort((left, right) => left.label.localeCompare(right.label)),
  );
  readonly groupModuleOptions = computed(() => {
    const selectedFiliere = this.groupFiliereFilter();
    return this.modules()
      .filter((module) => {
        if (selectedFiliere === 'all') {
          return true;
        }
        const formation = this.formations().find((item) => item.id === module.formationId);
        return formation?.filiereId === Number(selectedFiliere);
      })
      .map((module) => ({ value: String(module.id), label: `${module.code} - ${module.name}` }))
      .sort((left, right) => left.label.localeCompare(right.label));
  });
  readonly groupPerformance = computed(() => {
    const filiere = this.groupFiliereFilter();
    const module = this.groupModuleFilter();
    return this.performanceByGroup()
      .filter((row) => filiere === 'all' || row.filiereId === Number(filiere))
      .filter((row) => module === 'all' || row.moduleIds?.includes(Number(module)))
      .slice(0, 6);
  });
  readonly teacherPerformance = computed(() => this.performanceByTeacher().slice(0, 6));
  readonly recentSessions = computed(() => this.sessions().slice(0, 6));

  readonly alerts = computed<readonly AlertItem[]>(() => {
    const alerts: AlertItem[] = [];
    if (this.pendingJustifications().length > 0) {
      alerts.push({
        severity: 'warning',
        title: `${this.pendingJustifications().length} justification(s) en attente`,
        description: 'Traitez les demandes afin que les absences justifiées soient correctement reflétées.',
        actionLabel: 'Examiner',
        route: '/justifications',
      });
    }

    if (this.groupsWithoutAttendanceToday() > 0) {
      alerts.push({
        severity: 'info',
        title: `${this.groupsWithoutAttendanceToday()} groupe(s) sans présence`,
        description: 'Vérifiez la couverture de l’emploi du temps ou les sessions non démarrées.',
        actionLabel: 'Ouvrir la structure',
        route: '/structure',
      });
    }

    const activeTooLong = this.activeSessions().filter((session) => new Date(session.endsAt) < new Date()).length;
    if (activeTooLong > 0) {
      alerts.push({
        severity: 'critical',
        title: `${activeTooLong} session(s) active(s) après l’heure de fin`,
        description: 'Demandez aux enseignants de finaliser les sessions ou de vérifier la capture en direct.',
        actionLabel: 'Inspecter',
        route: '/attendance',
      });
    }

    const weakGroup = this.groupPerformance().find((row) => row.rate > 0 && row.rate < 70);
    if (weakGroup) {
      alerts.push({
        severity: 'critical',
        title: `${weakGroup.label} nécessite un suivi`,
        description: `Le taux de présence est de ${this.formatPercent(weakGroup.rate)} sur les sessions capturées.`,
        actionLabel: 'Auditer',
        route: '/attendance',
      });
    }

    return alerts.length
      ? alerts.slice(0, 4)
      : [
          {
            severity: 'success',
            title: 'Aucun blocage immédiat',
            description: 'Les indicateurs de présence sont stables d’après les données chargées.',
            actionLabel: 'Voir les sessions',
            route: '/attendance',
          },
        ];
  });

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      overview: this.attendanceService.getOverview().pipe(
        catchError(() => {
          this.setPartialDataError();
          return of(null as AdminAttendanceOverviewDto | null);
        }),
      ),
      sessions: this.attendanceService
        .getSessions({ page: 0, size: 250, sort: 'startedAt,desc' })
        .pipe(this.withDashboardFallback(this.emptySessionPage())),
      justifications: this.justificationService
        .getAdminJustifications()
        .pipe(this.withDashboardFallback<readonly JustificationDto[]>([])),
      students: this.studentService.getAll().pipe(this.withDashboardFallback<readonly AdminStudentDto[]>([])),
      teachers: this.teacherService.getAll().pipe(this.withDashboardFallback<readonly AdminTeacherDto[]>([])),
      studentInscriptions: this.inscriptionService
        .getStudentInscriptions()
        .pipe(this.withDashboardFallback<readonly AdminStudentInscriptionDto[]>([])),
      teacherAssignments: this.inscriptionService
        .getTeacherAssignments()
        .pipe(this.withDashboardFallback<readonly AdminTeacherAssignmentDto[]>([])),
      academicYears: this.yearService.getAll().pipe(this.withDashboardFallback<readonly AnneeUniversitaire[]>([])),
      formations: this.formationService.getAll().pipe(this.withDashboardFallback<readonly Formation[]>([])),
      groups: this.groupService.getAll().pipe(this.withDashboardFallback<readonly Groupe[]>([])),
      modules: this.moduleService.getAll().pipe(this.withDashboardFallback<readonly Module[]>([])),
      filieres: this.filiereService.getAll().pipe(this.withDashboardFallback<readonly Filiere[]>([])),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.overview.set(data.overview);
          this.sessions.set(data.sessions.items);
          this.justifications.set(data.justifications);
          this.students.set(data.students);
          this.teachers.set(data.teachers);
          this.studentInscriptions.set(data.studentInscriptions);
          this.teacherAssignments.set(data.teacherAssignments);
          this.academicYears.set(data.academicYears);
          this.formations.set(data.formations);
          this.groups.set(data.groups);
          this.modules.set(data.modules);
          this.filieres.set(data.filieres);
          this.lastUpdated.set(new Date());
        },
        error: () => {
          this.errorMessage.set('Impossible de charger le tableau de bord. Vérifiez les services backend et l’authentification.');
        },
      });
  }

  formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  formatDateTime(value: string | Date | null): string {
    if (!value) {
      return 'Pas encore actualisé';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }

  formatTimeRange(session: AdminAttendanceSessionSummaryDto): string {
    const formatter = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const start = formatter.format(new Date(session.startedAt));
    const end = formatter.format(new Date(session.endedAt ?? session.endsAt));
    return `${start} - ${end}`;
  }

  groupLabel(groupIds: readonly number[]): string {
    return groupIds.length ? groupIds.map((id) => this.groupName(id)).join(', ') : 'Aucun groupe';
  }

  sessionRate(session: AdminAttendanceSessionSummaryDto): number {
    return this.rate(session.presentCount, session.absentCount);
  }

  sessionStatusLabel(session: AdminAttendanceSessionSummaryDto): string {
    return session.status === 'ACTIVE' ? 'Active' : 'Finalisée';
  }

  barWidth(value: number, max: number): number {
    if (value === 0 || max === 0) {
      return 0;
    }
    return Math.max(4, Math.round((value / max) * 100));
  }

  badgeVariant(value: DashboardVariant): DashboardVariant {
    return value;
  }

  alertVariant(severity: AlertSeverity): DashboardVariant {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'info';
    }
  }

  severityLabel(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return 'Critique';
      case 'warning':
        return 'Avertissement';
      case 'success':
        return 'Stable';
      default:
        return 'Info';
    }
  }

  setAnalyticsRange(range: AnalyticsRange): void {
    this.analyticsRange.set(range);
  }

  setAnalyticsMode(mode: AnalyticsMode): void {
    this.analyticsMode.set(mode);
  }

  setGroupFiliereFilter(value: string | null): void {
    this.groupFiliereFilter.set(value ?? 'all');
    this.groupModuleFilter.set('all');
  }

  setGroupModuleFilter(value: string | null): void {
    this.groupModuleFilter.set(value ?? 'all');
  }

  openAnalytics(): void {
    this.analyticsExpanded.set(true);
  }

  closeAnalytics(): void {
    this.analyticsExpanded.set(false);
  }

  radialDash(rate: number): string {
    const normalized = Math.max(0, Math.min(100, Math.round(rate)));
    return `${normalized} ${100 - normalized}`;
  }

  private performanceByGroup(): readonly PerformanceRow[] {
    const byGroup = new Map<number, { present: number; absent: number; sessions: number; moduleIds: Set<number> }>();
    for (const session of this.sessions()) {
      for (const groupId of session.groupIds) {
        const current = byGroup.get(groupId) ?? { present: 0, absent: 0, sessions: 0, moduleIds: new Set<number>() };
        current.present += session.presentCount;
        current.absent += session.absentCount;
        current.sessions += 1;
        const matchedModule = this.moduleForGroupSession(groupId, session.courseLabel);
        if (matchedModule) {
          current.moduleIds.add(matchedModule.id);
        }
        byGroup.set(groupId, current);
      }
    }

    return Array.from(byGroup.entries())
      .map(([groupId, value]) => {
        const group = this.groups().find((item) => item.id === groupId);
        const formation = group ? this.formations().find((item) => item.id === group.formationId) : null;
        return this.toPerformanceRow(
          String(groupId),
          this.groupName(groupId),
          `${value.sessions} session(s)`,
          value,
          formation?.id ?? null,
          formation?.filiereId ?? null,
          [...value.moduleIds],
        );
      })
      .sort((left, right) => left.rate - right.rate);
  }

  private performanceByTeacher(): readonly PerformanceRow[] {
    const byTeacher = new Map<string, { present: number; absent: number; sessions: number }>();
    for (const session of this.sessions()) {
      const teacher = session.teacherFullName?.trim() || 'Enseignant non renseigné';
      const current = byTeacher.get(teacher) ?? { present: 0, absent: 0, sessions: 0 };
      current.present += session.presentCount;
      current.absent += session.absentCount;
      current.sessions += 1;
      byTeacher.set(teacher, current);
    }

    return Array.from(byTeacher.entries())
      .map(([teacher, value]) => this.toPerformanceRow(teacher, teacher, `${value.sessions} session(s)`, value))
      .sort((left, right) => left.rate - right.rate);
  }

  private toPerformanceRow(
    id: string,
    label: string,
    meta: string,
    value: { present: number; absent: number },
    formationId: number | null = null,
    filiereId: number | null = null,
    moduleIds: readonly number[] = [],
  ): PerformanceRow {
    const rate = this.rate(value.present, value.absent);
    return {
      id,
      label,
      meta,
      rate,
      present: value.present,
      absent: value.absent,
      variant: this.healthVariant(rate),
      formationId,
      filiereId,
      moduleIds,
    };
  }

  private groupName(groupId: number): string {
    return this.groups().find((group) => group.id === groupId)?.name ?? `Groupe #${groupId}`;
  }

  private moduleForGroupSession(groupId: number, courseLabel: string): Module | null {
    const group = this.groups().find((item) => item.id === groupId);
    if (!group) {
      return null;
    }
    const normalizedCourse = courseLabel.trim().toLowerCase();
    return (
      this.modules().find(
        (module) =>
          module.formationId === group.formationId &&
          (module.name.trim().toLowerCase() === normalizedCourse ||
            module.code.trim().toLowerCase() === normalizedCourse),
      ) ?? null
    );
  }

  private rate(present: number, absent: number): number {
    const resolved = present + absent;
    return resolved === 0 ? 0 : (present / resolved) * 100;
  }

  private percent(value: number, total: number): number {
    return total === 0 ? 0 : Math.round((value / total) * 100);
  }

  private healthVariant(rate: number): DashboardVariant {
    if (rate === 0) {
      return 'neutral';
    }
    if (rate < 70) {
      return 'error';
    }
    if (rate < 85) {
      return 'warning';
    }
    return 'success';
  }

  private buildTimelineAnalytics(): readonly AbsenceAnalyticsPoint[] {
    if (this.analyticsRange() === 'year') {
      return this.monthBuckets()
        .filter((month) => month.sessions.length > 0)
        .map((month) => this.toAnalyticsPoint(month.label, month.detail, month.sessions));
    }

      return this.dayBuckets()
        .filter((day) => day.sessions.length > 0)
        .map((day) => this.toAnalyticsPoint(day.label, day.detail, day.sessions));
  }

  private buildTimeAnalytics(): readonly AbsenceAnalyticsPoint[] {
    const sessions = this.sessionsInRange();
    const buckets = [
      { label: '06-08', detail: 'Début de matinée', from: 6, to: 8 },
      { label: '08-10', detail: '08:00 - 10:00', from: 8, to: 10 },
      { label: '10-12', detail: '10:00 - 12:00', from: 10, to: 12 },
      { label: '12-14', detail: '12:00 - 14:00', from: 12, to: 14 },
      { label: '14-16', detail: '14:00 - 16:00', from: 14, to: 16 },
      { label: '16-18', detail: '16:00 - 18:00', from: 16, to: 18 },
      { label: '18-20', detail: '18:00 - 20:00', from: 18, to: 20 },
    ];

    return buckets
      .map((bucket) =>
        this.toAnalyticsPoint(
          bucket.label,
          bucket.detail,
          sessions.filter((session) => {
            const hour = new Date(session.startedAt).getHours();
            return hour >= bucket.from && hour < bucket.to;
          }),
        ),
      )
      .filter((point) => point.sessions > 0);
  }

  private dayBuckets(): ReadonlyArray<{
    readonly label: string;
    readonly detail: string;
    readonly sessions: readonly AdminAttendanceSessionSummaryDto[];
  }> {
    const days = this.analyticsRange() === '14' ? 14 : this.currentMonthDayCount();
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      return {
        label: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date),
        detail: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(date),
        sessions: this.sessions().filter((session) => this.sameDay(session.startedAt, date)),
      };
    });
  }

  private monthBuckets(): ReadonlyArray<{
    readonly label: string;
    readonly detail: string;
    readonly sessions: readonly AdminAttendanceSessionSummaryDto[];
  }> {
    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      date.setMonth(date.getMonth() - (11 - index));
      return {
        label: new Intl.DateTimeFormat('fr-FR', { month: 'short' }).format(date),
        detail: new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(date),
        sessions: this.sessions().filter((session) => {
          const startedAt = new Date(session.startedAt);
          return startedAt.getFullYear() === date.getFullYear() && startedAt.getMonth() === date.getMonth();
        }),
      };
    });
  }

  private sessionsInRange(): readonly AdminAttendanceSessionSummaryDto[] {
    if (this.analyticsRange() === 'year') {
      const oldestMonth = new Date();
      oldestMonth.setDate(1);
      oldestMonth.setHours(0, 0, 0, 0);
      oldestMonth.setMonth(oldestMonth.getMonth() - 11);
      return this.sessions().filter((session) => new Date(session.startedAt) >= oldestMonth);
    }

    const days = this.analyticsRange() === '14' ? 14 : this.currentMonthDayCount();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    return this.sessions().filter((session) => new Date(session.startedAt) >= from);
  }

  private currentMonthDayCount(): number {
    return new Date().getDate();
  }

  private toAnalyticsPoint(
    label: string,
    detail: string,
    sessions: readonly AdminAttendanceSessionSummaryDto[],
  ): AbsenceAnalyticsPoint {
    const present = sessions.reduce((total, session) => total + session.presentCount, 0);
    const absent = sessions.reduce((total, session) => total + session.absentCount, 0);
    const open = sessions.reduce((total, session) => total + session.unknownCount, 0);
    return {
      label,
      detail,
      absent,
      present,
      open,
      sessions: sessions.length,
      rate: this.rate(present, absent),
    };
  }

  private isToday(value: string): boolean {
    return this.sameDay(value, new Date());
  }

  private sameDay(value: string, date: Date): boolean {
    const sessionDate = new Date(value);
    return (
      sessionDate.getFullYear() === date.getFullYear() &&
      sessionDate.getMonth() === date.getMonth() &&
      sessionDate.getDate() === date.getDate()
    );
  }

  private withDashboardFallback<T>(fallback: T): OperatorFunction<T, T> {
    return catchError(() => {
      this.setPartialDataError();
      return of(fallback);
    });
  }

  private setPartialDataError(): void {
    this.errorMessage.set('Certaines données du tableau de bord n’ont pas pu être chargées. Vérifiez les services backend et l’authentification.');
  }

  private emptySessionPage(): PagedResponseDto<AdminAttendanceSessionSummaryDto> {
    return {
      items: [],
      page: 0,
      size: 0,
      totalElements: 0,
      totalPages: 0,
    };
  }
}
