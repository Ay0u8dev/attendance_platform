import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AttendanceSessionSummary } from '../../../../core/attendance/models/attendance.model';
import { AttendanceService } from '../../../../core/attendance/services/attendance.service';
import { PageHeader } from '../../../../shared/components/page-header/page-header';
import { QuickActionTile } from '../../../../shared/components/quick-action-tile/quick-action-tile';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, QuickActionTile, RouterLink, StatCard, StatusBadge],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherDashboard implements OnInit {
  private readonly attendanceService = inject(AttendanceService);

  readonly recentSessions = signal<AttendanceSessionSummary[]>([]);

  readonly highlights = [
    'Peak check-in at 09:10 AM',
    'No critical service degradation detected',
    '3 justifications are waiting for review',
  ];

  readonly focusQueue = [
    { label: 'Unverified absences', value: '2', variant: 'warning' as const },
    { label: 'Teachers pending confirmation', value: '4', variant: 'info' as const },
    { label: 'Escalated incidents', value: '0', variant: 'success' as const },
  ];

  readonly stats = computed(() => {
    const sessions = this.recentSessions();
    const absentStudents = sessions.reduce((sum, session) => sum + session.absentCount, 0);
    const totalStudents = sessions.reduce(
      (sum, session) => sum + session.presentCount + session.absentCount + session.unknownCount,
      0,
    );
    const attendanceRate = totalStudents
      ? Math.round((sessions.reduce((sum, session) => sum + session.presentCount, 0) / totalStudents) * 100)
      : 0;

    return [
      {
        label: 'Sessions loaded',
        value: String(sessions.length),
        icon: 'fa-regular fa-calendar-days',
        badge: 'Backend',
        variant: 'info' as const,
      },
      {
        label: 'Absent students',
        value: String(absentStudents),
        icon: 'fa-solid fa-user-slash',
        badge: `${attendanceRate}%`,
        variant: absentStudents > 0 ? ('error' as const) : ('success' as const),
      },
      {
        label: 'Pending justifications',
        value: '0',
        icon: 'fa-regular fa-clipboard',
        badge: 'Soon',
        variant: 'info' as const,
      },
      {
        label: 'Critical students',
        value: String(sessions.filter((session) => session.absentCount > 1).length),
        icon: 'fa-solid fa-circle-exclamation',
        badge: 'Watch',
        variant: 'warning' as const,
      },
    ];
  });

  readonly sessions = computed(() =>
    this.recentSessions().slice(0, 3).map((session) => {
      const startedAt = new Date(session.startedAt);
      return {
        date: startedAt.toLocaleDateString(),
        time: startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        classroom: session.roomLabel ?? 'Salle non renseignee',
        module: session.courseLabel,
        teacher: 'Vous',
        method: session.method,
        variant: session.status === 'FINALIZED' ? ('success' as const) : ('warning' as const),
      };
    }),
  );

  readonly quickActions = [
    {
      label: 'Add student',
      description: 'Create or import a new student record.',
      icon: 'fa-solid fa-user-plus',
      route: '/teacher/students',
      tone: 'primary' as const,
    },
    {
      label: 'New session',
      description: 'Register a new attendance session.',
      icon: 'fa-regular fa-calendar-plus',
      route: '/teacher/mark-attendance/start-session',
      tone: 'secondary' as const,
    },
    {
      label: 'Send alerts',
      description: 'Notify teachers or administration.',
      icon: 'fa-regular fa-envelope',
      route: '/alerts',
      tone: 'warning' as const,
    },
    {
      label: 'Review reports',
      description: 'Open analytical exports and summaries.',
      icon: 'fa-regular fa-file-lines',
      route: '/teacher/sessions',
      tone: 'primary' as const,
    },
  ];

  readonly trendPoints =
    '8,146 72,100 136,122 200,80 264,40 328,58 392,150 456,188 520,124 584,32 648,18 712,112';

  ngOnInit(): void {
    this.attendanceService.getTeacherSessions({ page: 0, size: 10, sort: 'startedAt,desc' }).subscribe({
      next: (page) => this.recentSessions.set(page.items),
      error: () => this.recentSessions.set([]),
    });
  }
}
