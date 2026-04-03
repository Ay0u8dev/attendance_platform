import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
export class Dashboard {
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

  readonly stats = [
    {
      label: 'Sessions today',
      value: '12',
      icon: 'fa-regular fa-calendar-days',
      badge: '+12%',
      variant: 'info' as const,
    },
    {
      label: 'Absent students',
      value: '3',
      icon: 'fa-solid fa-user-slash',
      badge: '-3%',
      variant: 'error' as const,
    },
    {
      label: 'Pending justifications',
      value: '5',
      icon: 'fa-regular fa-clipboard',
      badge: 'New',
      variant: 'info' as const,
    },
    {
      label: 'Critical students',
      value: '1',
      icon: 'fa-solid fa-circle-exclamation',
      badge: 'Warning',
      variant: 'warning' as const,
    },
  ];

  readonly sessions = [
    {
      date: 'Oct 24, 2023',
      time: '09:00 AM',
      classroom: 'Computer Science A1',
      module: 'Advanced Algorithms',
      teacher: 'Dr. Robert Chen',
      method: 'In-person',
      variant: 'success' as const,
    },
    {
      date: 'Oct 24, 2023',
      time: '11:30 AM',
      classroom: 'Economics B3',
      module: 'Macro Analysis',
      teacher: 'Sarah Jenkins',
      method: 'Remote',
      variant: 'info' as const,
    },
    {
      date: 'Oct 23, 2023',
      time: '02:00 PM',
      classroom: 'Physics C2',
      module: 'Quantum Mechanics',
      teacher: 'Prof. Marcus Thorne',
      method: 'In-person',
      variant: 'success' as const,
    },
  ];

  readonly quickActions = [
    {
      label: 'Add student',
      description: 'Create or import a new student record.',
      icon: 'fa-solid fa-user-plus',
      route: '/students',
      tone: 'primary' as const,
    },
    {
      label: 'New session',
      description: 'Register a new attendance session.',
      icon: 'fa-regular fa-calendar-plus',
      route: '/attendance',
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
      route: '/statistics',
      tone: 'primary' as const,
    },
  ];

  readonly trendPoints =
    '8,146 72,100 136,122 200,80 264,40 328,58 392,150 456,188 520,124 584,32 648,18 712,112';
}
