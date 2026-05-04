import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';

type GroupItem = {
  readonly id: string;
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
  imports: [PageHeader],
  templateUrl: './groups-page.html',
  styleUrl: './groups-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherGroupsPage {
  readonly groups: readonly GroupItem[] = [
    {
      id: 'g1',
      name: 'Group 02',
      type: 'Lecture & Lab',
      module: 'Advanced Web Dev',
      students: 22,
      nextSession: 'Tomorrow, 10:00',
      attendanceRate: 94,
    },
    {
      id: 'g2',
      name: 'Group 01',
      type: 'Tutorial',
      module: 'Advanced Web Dev',
      students: 20,
      nextSession: 'Thursday, 14:00',
      attendanceRate: 88,
    },
    {
      id: 'g3',
      name: 'Group A',
      type: 'Lab',
      module: 'Database Arch',
      students: 19,
      nextSession: 'Friday, 08:30',
      attendanceRate: 91,
    },
    {
      id: 'g4',
      name: 'Group B',
      type: 'Lab',
      module: 'Database Arch',
      students: 19,
      nextSession: 'Today, 16:00',
      attendanceRate: 85,
    },
    {
      id: 'g5',
      name: 'Group 03',
      type: 'Lecture',
      module: 'Network Security',
      students: 25,
      nextSession: 'Monday, 09:00',
      attendanceRate: 97,
    },
    {
      id: 'g6',
      name: 'Group 01',
      type: 'Seminar',
      module: 'Machine Learning',
      students: 31,
      nextSession: 'Wednesday, 11:30',
      attendanceRate: 79,
    },
  ];
}
