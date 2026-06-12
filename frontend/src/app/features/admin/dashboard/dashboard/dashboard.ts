import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
 
import { StatCard } from '../../../../shared/components/stat-card/stat-card';
import { StatusBadge } from '../../../../shared/components/status-badge/status-badge';
 
type StatVariant = 'info' | 'error' | 'warning' | 'success';
type MethodVariant = 'success' | 'info' | 'warning' | 'error';
 
type DashboardStat = {
  readonly label: string;
  readonly value: string;
  readonly icon: string;
  readonly badge: string;
  readonly variant: StatVariant;
};
 
type RecentSession = {
  readonly date: string;
  readonly time: string;
  readonly classroom: string;
  readonly module: string;
  readonly teacher: string;
  readonly method: string;
  readonly methodVariant: MethodVariant;
};
 
type QuickAction = {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
};
 
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, StatCard, StatusBadge],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly stats: readonly DashboardStat[] = [
    {
      label: 'Sessions Today',
      value: '12',
      icon: 'fa-regular fa-calendar-days',
      badge: '+12%',
      variant: 'info',
    },
    {
      label: 'Absent Students',
      value: '3',
      icon: 'fa-solid fa-user-slash',
      badge: '-3%',
      variant: 'error',
    },
    {
      label: 'Pending Justifications',
      value: '5',
      icon: 'fa-regular fa-clipboard',
      badge: 'New',
      variant: 'info',
    },
    {
      label: 'Critical Student',
      value: '1',
      icon: 'fa-solid fa-circle-exclamation',
      badge: 'Warning',
      variant: 'warning',
    },
  ];
 
  readonly sessions: readonly RecentSession[] = [
    {
      date: 'Oct 24, 2023',
      time: '09:00 AM',
      classroom: 'Computer Science A1',
      module: 'Advanced Algorithms',
      teacher: 'Dr. Robert Chen',
      method: 'In-person',
      methodVariant: 'success',
    },
    {
      date: 'Oct 24, 2023',
      time: '11:30 AM',
      classroom: 'Economics B3',
      module: 'Macro Analysis',
      teacher: 'Sarah Jenkins',
      method: 'Remote',
      methodVariant: 'info',
    },
    {
      date: 'Oct 23, 2023',
      time: '02:00 PM',
      classroom: 'Physics C2',
      module: 'Quantum Mechanics',
      teacher: 'Prof. Marcus Thorne',
      method: 'In-person',
      methodVariant: 'success',
    },
  ];
 
  readonly quickActions: readonly QuickAction[] = [
    { label: 'Add Student', icon: 'fa-solid fa-user-plus', route: '/students' },
    { label: 'New Session', icon: 'fa-regular fa-calendar-plus', route: '/attendance' },
    { label: 'Send Alerts', icon: 'fa-regular fa-envelope', route: '/alerts' },
    { label: 'Reports', icon: 'fa-regular fa-file-lines', route: '/statistics' },
    { label: 'Integration', icon: 'fa-solid fa-sliders', route: '/structure' },
    { label: 'Support', icon: 'fa-regular fa-circle-question', route: '/dashboard' },
  ];
 
  readonly trendPoints =
    '8,160 60,110 120,135 180,90 240,55 300,75 360,150 420,180 480,135 540,55 600,30 660,95 712,150';
}