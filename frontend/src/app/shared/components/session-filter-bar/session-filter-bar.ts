import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-session-filter-bar',
  template: `
    <section
      class="flex flex-col gap-4 rounded-[1.75rem] border border-line bg-surface p-5 shadow-card"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-primary">
            {{ eyebrow() }}
          </p>
          <h2 class="mt-1 text-xl font-semibold tracking-tight text-principalText">
            {{ title() }}
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-secondaryText">
            {{ description() }}
          </p>
        </div>

        @if (summaryLabel()) {
          <div
            class="inline-flex items-center gap-2 rounded-2xl border border-primary-soft bg-primary-soft px-4 py-3 text-sm font-medium text-primary"
          >
            <span class="h-2.5 w-2.5 rounded-full bg-primary"></span>
            {{ summaryLabel() }}
          </div>
        }
      </div>

      <div class="flex flex-wrap gap-3">
        @for (option of options(); track option.value) {
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200"
            [class]="selected() === option.value
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-line bg-surface text-secondaryText hover:border-primary-soft hover:bg-primary-soft hover:text-primary'"
            (click)="selectedChange.emit(option.value)"
          >
            <span>{{ option.label }}</span>
            <span
              class="inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs"
              [class]="selected() === option.value
                ? 'bg-primary text-white'
                : 'bg-surface-subtle text-principalText'"
            >
              {{ option.count }}
            </span>
          </button>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionFilterBar {
  readonly eyebrow = input('Consultation');
  readonly title = input('Toutes vos séances en un seul endroit');
  readonly description = input(
    "Consultez l'historique chargé, filtrez vos présences et vos absences, puis affinez la recherche localement sans confondre données chargées et historique complet.",
  );
  readonly options = input.required<readonly { value: string; label: string; count: number }[]>();
  readonly selected = input.required<string>();
  readonly summaryLabel = input('');

  readonly selectedChange = output<string>();
}
