import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceSessionSummary } from '../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { Module } from '../../../core/structure/models/module.model';
import { ModuleService } from '../../../core/structure/services/module.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';

type ModuleItem = {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly program: string;
  readonly students: number;
  readonly progress: number;
  readonly sessions: number;
  readonly icon: string;
  readonly color: string;
};

@Component({
  selector: 'app-teacher-modules-page',
  standalone: true,
  imports: [PageHeader, RouterLink],
  templateUrl: './modules-page.html',
  styleUrl: './modules-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherModulesPage implements OnInit {
  private readonly moduleService = inject(ModuleService);
  private readonly attendanceService = inject(AttendanceService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly modules = signal<Module[]>([]);
  readonly sessions = signal<AttendanceSessionSummary[]>([]);

  readonly moduleItems = computed<ModuleItem[]>(() =>
    this.modules().map((module, index) => {
      const sessions = this.sessions().filter((session) => session.courseLabel === module.name).length;
      return {
        id: module.id,
        code: module.code,
        name: module.name,
        program: `Formation ${module.formationId}`,
        students: 12,
        progress: Math.min(100, Math.max(10, sessions * 20)),
        sessions,
        icon: this.iconFor(index),
        color: this.colorFor(index),
      };
    }),
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
        next: (modules) => this.modules.set(modules),
        error: () => this.error.set('Impossible de charger les modules.'),
      });

    this.attendanceService.getTeacherSessions({ page: 0, size: 50, sort: 'startedAt,desc' }).subscribe({
      next: (page) => this.sessions.set(page.items),
      error: () => undefined,
    });
  }

  private iconFor(index: number): string {
    return ['fa-solid fa-code', 'fa-solid fa-database', 'fa-solid fa-shield-halved', 'fa-solid fa-brain'][
      index % 4
    ];
  }

  private colorFor(index: number): string {
    return ['bg-primary', 'bg-secondary', 'bg-danger', 'bg-warning'][index % 4];
  }
}
