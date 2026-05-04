import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-teacher-justifications-page',
  standalone: true,
  imports: [PageHeader],
  templateUrl: './justifications-page.html',
  styleUrl: './justifications-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherJustificationsPage {}
