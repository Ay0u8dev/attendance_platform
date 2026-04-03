import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-students-page',
  imports: [PageHeader, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Students"
        description="Browse academic cohorts, track attendance risk, and review student-level operational data."
        meta="2,184 active students"
      ></app-page-header>

      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-3xl border border-line bg-surface p-5 shadow-card md:col-span-2">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-principalText">Student directory</h2>
              <p class="text-sm text-secondaryText">Mobile collapses the table into stacked records.</p>
            </div>
            <app-status-badge label="Responsive ready" variant="success"></app-status-badge>
          </div>

          <div class="mt-5 grid gap-3">
            @for (student of students; track student.email) {
              <div
                class="grid gap-3 rounded-2xl border border-line px-4 py-4 sm:grid-cols-[minmax(0,2fr)_auto_auto]"
              >
                <div>
                  <p class="font-medium text-principalText">{{ student.name }}</p>
                  <p class="text-sm text-secondaryText">{{ student.program }}</p>
                  <p class="text-xs text-muted">{{ student.email }}</p>
                </div>
                <div class="text-sm text-secondaryText">
                  <p class="font-medium text-principalText">{{ student.group }}</p>
                  <p>Current group</p>
                </div>
                <app-status-badge [label]="student.status" [variant]="student.variant"></app-status-badge>
              </div>
            }
          </div>
        </article>

        <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-lg font-semibold text-principalText">Operational focus</h2>
          <ul class="mt-4 space-y-3 text-sm leading-6 text-secondaryText">
            <li>Prioritize filters for group, risk level, and justification status.</li>
            <li>Keep mobile cards concise and action-oriented.</li>
            <li>Student details should open in a modal or secondary page, not inside the list.</li>
          </ul>
        </article>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentsPage {
  readonly students = [
    {
      name: 'Sofiane Meziane',
      program: 'Software Engineering',
      email: 'sofiane.meziane@ump.ac.ma',
      group: 'Group 02',
      status: 'Good standing',
      variant: 'success' as const,
    },
    {
      name: 'Leila Bensalem',
      program: 'Data Science',
      email: 'leila.bensalem@ump.ac.ma',
      group: 'Group 05',
      status: 'Needs review',
      variant: 'warning' as const,
    },
    {
      name: 'Yassine El Idrissi',
      program: 'Networks & Security',
      email: 'yassine.idrissi@ump.ac.ma',
      group: 'Group 03',
      status: 'Absence alert',
      variant: 'error' as const,
    },
  ];
}
