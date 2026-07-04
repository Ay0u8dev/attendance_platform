import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceSessionSummary } from '../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { Module } from '../../../core/structure/models/module.model';
import { ModuleService } from '../../../core/structure/services/module.service';
import { Modal } from '../../../shared/components/modal/modal';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ToastService } from '../../../shared/components/toast/toast.service';

type ModuleItem = {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly program: string;
  readonly sessions: number;
  readonly attendanceRate: number;
  readonly groupCount: number;
  readonly lastSessionLabel: string;
  readonly needsAttention: boolean;
};

@Component({
  selector: 'app-teacher-modules-page',
  standalone: true,
  imports: [PageHeader, RouterLink, Modal],
  templateUrl: './modules-page.html',
  styleUrl: './modules-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherModulesPage implements OnInit {
  private readonly moduleService = inject(ModuleService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly toastService = inject(ToastService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly modules = signal<Module[]>([]);
  readonly allModules = signal<Module[]>([]);
  readonly sessions = signal<AttendanceSessionSummary[]>([]);
  readonly showAssignmentModal = signal(false);
  readonly selectedRequestModuleId = signal<number | null>(null);
  readonly submittingRequest = signal(false);

  readonly moduleItems = computed<ModuleItem[]>(() =>
    this.modules().map((module) => {
      const moduleSessions = this.sessions().filter((session) => session.courseLabel === module.name);
      const present = moduleSessions.reduce((sum, session) => sum + session.presentCount, 0);
      const total = moduleSessions.reduce(
        (sum, session) => sum + session.presentCount + session.absentCount + session.unknownCount,
        0,
      );
      const groupIds = new Set(moduleSessions.flatMap((session) => session.groupIds));
      const lastSession = moduleSessions[0];

      return {
        id: module.id,
        code: module.code,
        name: module.name,
        program: `Formation ${module.formationId}`,
        sessions: moduleSessions.length,
        attendanceRate: total ? Math.round((present / total) * 100) : 0,
        groupCount: groupIds.size,
        lastSessionLabel: lastSession
          ? new Date(lastSession.startedAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : 'Aucune session',
        needsAttention: moduleSessions.length === 0 || (total > 0 && present / total < 0.75),
      };
    }),
  );

  readonly summary = computed(() => {
    const items = this.moduleItems();
    const totalSessions = items.reduce((sum, item) => sum + item.sessions, 0);
    const withoutSession = items.filter((item) => item.sessions === 0).length;
    const averageAttendance = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.attendanceRate, 0) / items.length)
      : 0;

    return {
      totalSessions,
      withoutSession,
      averageAttendance,
    };
  });

  readonly selectedRequestModule = computed(
    () => this.allModules().find((module) => module.id === this.selectedRequestModuleId()) ?? null,
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.moduleService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (modules) => {
          this.modules.set(modules);
          this.allModules.set(modules);
        },
        error: () => this.error.set('Impossible de charger les modules.'),
      });

    this.attendanceService.getTeacherSessions({ page: 0, size: 50, sort: 'startedAt,desc' }).subscribe({
      next: (page) => this.sessions.set(page.items),
      error: () => undefined,
    });
  }

  openAssignmentModal(): void {
    this.selectedRequestModuleId.set(null);
    this.showAssignmentModal.set(true);
  }

  closeAssignmentModal(): void {
    if (this.submittingRequest()) {
      return;
    }

    this.showAssignmentModal.set(false);
    this.selectedRequestModuleId.set(null);
  }

  isModuleAssigned(moduleId: number): boolean {
    return this.modules().some((module) => module.id === moduleId);
  }

  selectRequestModule(moduleId: number): void {
    if (this.isModuleAssigned(moduleId)) {
      return;
    }

    this.selectedRequestModuleId.set(moduleId);
  }

  confirmAssignmentRequest(): void {
    const module = this.selectedRequestModule();
    if (!module || this.submittingRequest()) {
      return;
    }

    this.submittingRequest.set(true);

    window.setTimeout(() => {
      this.toastService.success(
        'Demande envoyee',
        `Votre demande d'affectation pour ${module.name} a ete transmise a l'administration.`,
      );
      this.submittingRequest.set(false);
      this.closeAssignmentModal();
    }, 450);
  }
}
