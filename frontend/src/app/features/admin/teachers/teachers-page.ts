import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-teachers-page',
  imports: [PageHeader, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Teachers"
        description="Manage teaching staff, assigned modules, and approval workflows for attendance events."
        meta="126 teachers"
      ></app-page-header>

      <div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-lg font-semibold text-principalText">Teaching roster</h2>
          <div class="mt-5 grid gap-3">
            @for (teacher of teachers; track teacher.name) {
              <div class="rounded-2xl border border-line px-4 py-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p class="font-medium text-principalText">{{ teacher.name }}</p>
                    <p class="text-sm text-secondaryText">{{ teacher.department }}</p>
                    <p class="text-xs text-muted">{{ teacher.modules }}</p>
                  </div>
                  <app-status-badge [label]="teacher.status" [variant]="teacher.variant"></app-status-badge>
                </div>
              </div>
            }
          </div>
        </article>

        <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-lg font-semibold text-principalText">Design note</h2>
          <p class="mt-4 text-sm leading-6 text-secondaryText">
            Teacher pages should mirror the same list-detail rhythm as students. Keep filters visible
            on desktop and collapsible on mobile.
          </p>
        </article>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeachersPage {
  readonly teachers = [
    {
      name: 'Dr. Robert Chen',
      department: 'Computer Science',
      modules: 'Advanced Algorithms, Data Structures',
      status: 'Available',
      variant: 'success' as const,
    },
    {
      name: 'Sarah Jenkins',
      department: 'Economics',
      modules: 'Macro Analysis, Economic Policy',
      status: 'Pending review',
      variant: 'warning' as const,
    },
  ];
}
