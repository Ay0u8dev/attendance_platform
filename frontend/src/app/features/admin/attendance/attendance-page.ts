import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-attendance-page',
  imports: [PageHeader, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Attendance"
        description="Track sessions, review capture methods, and inspect attendance quality across groups and modules."
        meta="48 sessions this week"
      ></app-page-header>

      <div class="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <div class="grid gap-3">
          @for (session of sessions; track session.module) {
            <div class="rounded-2xl border border-line px-4 py-4">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p class="font-medium text-principalText">{{ session.module }}</p>
                  <p class="text-sm text-secondaryText">{{ session.teacher }} • {{ session.group }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <span class="text-sm text-secondaryText">{{ session.time }}</span>
                  <app-status-badge [label]="session.method" variant="info"></app-status-badge>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendancePage {
  readonly sessions = [
    {
      module: 'Advanced Algorithms',
      teacher: 'Dr. Robert Chen',
      group: 'Computer Science A1',
      time: 'Today, 09:00 - 11:00',
      method: 'In-person',
    },
    {
      module: 'Macro Analysis',
      teacher: 'Sarah Jenkins',
      group: 'Economics B3',
      time: 'Today, 11:30 - 13:00',
      method: 'Remote',
    },
  ];
}
