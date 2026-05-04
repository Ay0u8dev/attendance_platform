import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';

type ModuleItem = {
  readonly id: string;
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
  imports: [PageHeader],
  templateUrl: './modules-page.html',
  styleUrl: './modules-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherModulesPage {
  readonly modules: readonly ModuleItem[] = [
    {
      id: 'm1',
      code: 'GEN-302',
      name: 'Advanced Web Development',
      program: 'Software Engineering - Y3',
      students: 42,
      progress: 65,
      sessions: 14,
      icon: 'fa-solid fa-code',
      color: 'bg-primary',
    },
    {
      id: 'm2',
      code: 'DAT-201',
      name: 'Database Architecture',
      program: 'Data Science - Y2',
      students: 38,
      progress: 40,
      sessions: 8,
      icon: 'fa-solid fa-database',
      color: 'bg-secondary',
    },
    {
      id: 'm3',
      code: 'SEC-401',
      name: 'Network Security',
      program: 'Cybersecurity - Y4',
      students: 25,
      progress: 85,
      sessions: 18,
      icon: 'fa-solid fa-shield-halved',
      color: 'bg-danger',
    },
    {
      id: 'm4',
      code: 'AI-305',
      name: 'Machine Learning Basics',
      program: 'Intelligence Artificielle - Y3',
      students: 31,
      progress: 25,
      sessions: 5,
      icon: 'fa-solid fa-brain',
      color: 'bg-warning',
    },
  ];
}
