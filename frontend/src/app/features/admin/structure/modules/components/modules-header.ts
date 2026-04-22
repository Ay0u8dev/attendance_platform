import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';

@Component({
  selector: 'app-modules-header',
  imports: [Button],
  template: `
    <header class="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex-1">
          <p class="text-xs uppercase tracking-wide text-secondaryText">Structure academique</p>
          <h2 class="mt-2 text-xl font-semibold text-principalText">Modules</h2>
          <p class="mt-1 text-sm text-secondaryText">
            Suivez les modules, les crédits et les volumes horaires par formation.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4">
          <div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-linear-to-r from-primary/5 to-secondary/5 border border-line/50 shadow-sm hover:shadow-md hover:border-line transition">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary shrink-0">
              <i class="fa-solid fa-layer-group text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-baseline gap-1.5">
                <span class="text-lg font-bold text-primary">{{ filteredCount() }}</span>
                <span class="text-sm text-secondaryText font-medium">/ {{ totalCount() }}</span>
              </div>
              <p class="text-xs uppercase tracking-wider text-secondaryText font-semibold">Modules suivis</p>
            </div>
          </div>

          <app-button
            label="Ajouter un module"
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
export class ModulesHeader {
  readonly filteredCount = input(0);
  readonly totalCount = input(0);
  readonly addClicked = output<void>();
}
