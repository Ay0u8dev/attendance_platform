import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-teacher-sessions-page',
  standalone: true,
  imports: [PageHeader, RouterLink],
  templateUrl: './sessions-page.html',
  styleUrl: './sessions-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSessionsPage {}
