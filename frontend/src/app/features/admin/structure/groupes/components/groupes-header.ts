import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';

@Component({
  selector: 'app-groupes-header',
  standalone: true,
  imports: [Button],
  template: `
    <header class="rounded-3xl border border-line bg-surface p-5 shadow-card">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex-1">
          <p class="text-xs uppercase tracking-wide text-secondaryText">Structure academique</p>
          <h2 class="mt-2 text-xl font-semibold text-principalText">Groupes</h2>
          <p class="mt-1 text-sm text-secondaryText">
            Gérez les groupes d'étudiants dans chaque formation et semestre.
          </p>
        </div>

        <!-- Results Info Section -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4">
          <!-- Groupe Stats Card -->
          <div class="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-secondary/5 to-primary/5 border border-line/50 shadow-sm hover:shadow-md hover:border-line transition">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft text-secondary flex-shrink-0">
              <i class="fa-solid fa-people-group text-sm"></i>
            </div>
            <div class="flex-1">
              <div class="flex items-baseline gap-1.5">
                <span class="text-lg font-bold text-secondary">{{ filteredCount() }}</span>
                <span class="text-xs text-secondaryText font-medium">/ {{ totalCount() }}</span>
              </div>
              <p class="text-xs uppercase tracking-wider text-secondaryText font-semibold">Groupes actifs</p>
            </div>
          </div>

          <!-- Add Button -->
          <app-button
            label="Ajouter un groupe"
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
export class GroupesHeader {
  readonly filteredCount = input(0);
  readonly totalCount = input(0);
  readonly addClicked = output<void>();
}
