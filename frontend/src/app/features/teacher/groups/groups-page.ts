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
  readonly module: string;
  readonly students: number;
  readonly sessions: number;
  readonly attendanceRate: number;
  readonly lastSessionLabel: string;
  readonly needsAttention: boolean;
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
      const groupSessions = this.sessions().filter((session) => session.groupIds.includes(group.id));
      const present = groupSessions.reduce((sum, session) => sum + session.presentCount, 0);
      const total = groupSessions.reduce(
        (sum, session) => sum + session.presentCount + session.absentCount + session.unknownCount,
        0,
      );
      const attendanceRate = total ? Math.round((present / total) * 100) : 0;
      const lastSession = groupSessions[0];

      return {
        id: group.id,
        name: group.name,
        module: module?.name ?? 'Module non renseigne',
        students: this.studentCountFor(group.name),
        sessions: groupSessions.length,
        attendanceRate,
        lastSessionLabel: lastSession
          ? new Date(lastSession.startedAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'short',
            })
          : 'Aucune',
        needsAttention: attendanceRate > 0 && attendanceRate < 75,
      };
    }),
  );

  readonly summary = computed(() => {
    const items = this.groupItems();
    const totalStudents = items.reduce((sum, item) => sum + item.students, 0);
    const averageAttendance = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.attendanceRate, 0) / items.length)
      : 0;
    const atRisk = items.filter((item) => item.needsAttention).length;

    return {
      totalStudents,
      averageAttendance,
      atRisk,
    };
  });

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
