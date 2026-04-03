import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-alerts-page',
  imports: [PageHeader, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Alerts"
        description="Monitor absence thresholds, processing delays, and operational anomalies that need attention."
        meta="4 critical alerts"
      ></app-page-header>

      <div class="grid gap-4 md:grid-cols-2">
        @for (alert of alerts; track alert.title) {
          <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-medium text-principalText">{{ alert.title }}</p>
                <p class="mt-1 text-sm leading-6 text-secondaryText">{{ alert.description }}</p>
              </div>
              <app-status-badge [label]="alert.level" [variant]="alert.variant"></app-status-badge>
            </div>
          </article>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPage {
  readonly alerts = [
    {
      title: 'Critical student risk',
      description: 'A group has exceeded the configured attendance risk threshold this week.',
      level: 'Critical',
      variant: 'error' as const,
    },
    {
      title: 'Pending reviews',
      description: 'Several justifications have not been processed within the target review window.',
      level: 'Warning',
      variant: 'warning' as const,
    },
  ];
}
