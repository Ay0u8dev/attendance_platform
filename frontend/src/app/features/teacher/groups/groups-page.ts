import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AttendanceSessionSummary } from '../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../core/attendance/services/attendance.service';
import { Groupe } from '../../../core/structure/models/groupe.model';
import { Module } from '../../../core/structure/models/module.model';
import { GroupeService } from '../../../core/structure/services/groupe.service';
import { ModuleService } from '../../../core/structure/services/module.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';

type GroupItem = {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly module: string;
  readonly students: number;
  readonly nextSession: string;
  readonly attendanceRate: number;
};

@Component({
  selector: 'app-teacher-groups-page',
  standalone: true,
  imports: [PageHeader, RouterLink],
  templateUrl: './groups-page.html',
  styleUrl: './groups-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherGroupsPage implements OnInit {
  private readonly groupeService = inject(GroupeService);
  private readonly moduleService = inject(ModuleService);
  private readonly attendanceService = inject(AttendanceService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly groups = signal<Groupe[]>([]);
  readonly modules = signal<Module[]>([]);
  readonly sessions = signal<AttendanceSessionSummary[]>([]);

  readonly groupItems = computed<GroupItem[]>(() =>
    this.groups().map((group) => {
      const module = this.modules().find((item) => item.formationId === group.formationId);
      return {
        id: group.id,
        name: group.name,
        type: 'Active cohort',
        module: module?.name ?? 'Module non renseigne',
        students: this.studentCountFor(group.name),
        nextSession: 'A planifier',
        attendanceRate: this.attendanceRateFor(group.id),
      };
    }),
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.groupeService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (groups) => this.groups.set(groups),
        error: () => this.error.set('Impossible de charger les groupes.'),
      });

    this.moduleService.getAll().subscribe({
      next: (modules) => this.modules.set(modules),
      error: () => undefined,
    });

    this.attendanceService.getTeacherSessions({ page: 0, size: 50, sort: 'startedAt,desc' }).subscribe({
      next: (page) => this.sessions.set(page.items),
      error: () => undefined,
    });
  }

  private attendanceRateFor(groupId: number): number {
    const sessions = this.sessions().filter((session) => session.groupIds.includes(groupId));
    const present = sessions.reduce((sum, session) => sum + session.presentCount, 0);
    const total = sessions.reduce(
      (sum, session) => sum + session.presentCount + session.absentCount + session.unknownCount,
      0,
    );
    return total ? Math.round((present / total) * 100) : 0;
  }

  private studentCountFor(groupName: string): number {
    return {
      'GI-1': 3,
      'GI-2': 3,
      'IDS-1': 4,
      'CYBER-1': 1,
      'PREPA-1': 1,
    }[groupName] ?? 0;
  }
}
