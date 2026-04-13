import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';

@Component({
  selector: 'app-fields-header',
  standalone: true,
  imports: [Button],
  template: `
    <header class="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-secondaryText">Structure académique</p>
          <h2 class="mt-2 text-xl font-semibold text-principalText">Filières</h2>
          <p class="mt-1 text-sm text-secondaryText">
            Administrez les filières, les effectifs et les règles d'admission.          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="rounded-2xl border border-line bg-surface-subtle px-4 py-3">
            <p class="text-xs uppercase tracking-wide text-secondaryText">Total filières</p>
            <p class="text-lg text-center font-semibold text-principalText">{{ totalFields() }}</p>          </div>
          <app-button
            label="Ajouter une filière"
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
export class FieldsHeader {
  readonly totalFields = input.required<number>();
  readonly addClicked = output<void>();
}
