import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';

@Component({
  selector: 'app-academic-year-header',
  imports: [Button],
  template: `
    <header class="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-secondaryText">Structure academique</p>
          <h2 class="mt-2 text-xl font-semibold text-principalText">Années académiques</h2>
          <p class="mt-1 text-sm text-secondaryText">
            Définissez les périodes officielles, semestres et statuts institutionnels.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-2xl border border-line bg-surface-subtle px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-secondaryText">Total années</p>
            <p class="text-lg text-center font-semibold text-principalText">{{ totalYears() }}</p>
          </div>
          <app-button
            label="Ajouter une année"
            icon="fa-solid fa-plus"
            variant="primary"
            [fullWidth]="false"
            (clicked)="addClicked.emit()"
          ></app-button>
        </div>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicYearHeader {
  readonly totalYears = input.required<number>();
  readonly addClicked = output<void>();
}
