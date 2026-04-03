import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatCard } from '../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-statistics-page',
  imports: [PageHeader, StatCard],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Statistics"
        description="Explore attendance trends, approval throughput, and program-level activity with responsive chart containers."
        meta="Last 30 days"
      ></app-page-header>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <app-stat-card label="Attendance rate" value="92%" icon="fa-solid fa-chart-pie" badge="+3%" variant="success"></app-stat-card>
        <app-stat-card label="Processed reviews" value="314" icon="fa-solid fa-file-signature" badge="Stable" variant="info"></app-stat-card>
        <app-stat-card label="Delayed items" value="12" icon="fa-solid fa-clock" badge="Needs attention" variant="warning"></app-stat-card>
        <app-stat-card label="Escalations" value="4" icon="fa-solid fa-triangle-exclamation" badge="Low" variant="error"></app-stat-card>
      </div>

      <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
        <h2 class="text-lg font-semibold text-principalText">Chart container behavior</h2>
        <p class="mt-4 max-w-3xl text-sm leading-6 text-secondaryText">
          Use horizontally stable card containers on desktop. On mobile, let charts scroll or simplify
          labels instead of shrinking them until they become unreadable.
        </p>
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatisticsPage {}
