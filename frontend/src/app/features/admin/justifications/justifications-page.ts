import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { StatusBadge } from '../../../shared/components/status-badge/status-badge';

@Component({
  selector: 'app-justifications-page',
  imports: [PageHeader, StatusBadge],
  template: `
    <section class="space-y-6">
      <app-page-header
        title="Justifications"
        description="Review student submissions, inspect supporting documents, and keep the audit trail readable on every screen size."
        meta="18 pending reviews"
      ></app-page-header>

      <div class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-lg font-semibold text-principalText">Review queue</h2>
          <div class="mt-5 grid gap-3">
            @for (request of requests; track request.id) {
              <div class="rounded-2xl border border-line px-4 py-4">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p class="font-medium text-principalText">{{ request.student }}</p>
                    <p class="text-sm text-secondaryText">{{ request.module }}</p>
                    <p class="text-xs text-muted">{{ request.id }}</p>
                  </div>
                  <app-status-badge [label]="request.status" [variant]="request.variant"></app-status-badge>
                </div>
              </div>
            }
          </div>
        </article>

        <article class="rounded-3xl border border-line bg-surface p-5 shadow-card">
          <h2 class="text-lg font-semibold text-principalText">Responsive rule</h2>
          <p class="mt-4 text-sm leading-6 text-secondaryText">
            On desktop, justification details can open in a wide modal. On mobile, use a full-height
            sheet or dedicated detail page. Do not squeeze a two-column review modal into a phone viewport.
          </p>
        </article>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificationsPage {
  readonly requests = [
    {
      id: '#JST-2023-4492',
      student: 'Sofiane Meziane',
      module: 'Algorithmique Avancée',
      status: 'Approved',
      variant: 'success' as const,
    },
    {
      id: '#JST-2023-4498',
      student: 'Leila Bensalem',
      module: 'Data Mining',
      status: 'Pending',
      variant: 'warning' as const,
    },
  ];
}
