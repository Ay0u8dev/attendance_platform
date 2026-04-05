import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-structure-page',
  imports: [PageHeader],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Structure"
        description="Academic structure covers departments, sections, cohorts, and the relationships that drive attendance tracking."
        meta="24 academic units"
      ></app-page-header>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (item of units; track item.title) {
          <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <p class="text-sm font-semibold text-principalText">{{ item.title }}</p>
            <p class="mt-2 text-sm leading-6 text-secondaryText">{{ item.description }}</p>
          </article>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructurePage {
  readonly units = [
    { title: 'Departments', description: 'Top-level academic entities used to group teachers and modules.' },
    { title: 'Sections', description: 'Program-specific sections for cohort scheduling and reporting.' },
    { title: 'Groups', description: 'Operational groups used for attendance capture and justification review.' },
  ];
}
