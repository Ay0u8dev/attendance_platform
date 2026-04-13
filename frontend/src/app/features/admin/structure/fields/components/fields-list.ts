import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';

import { IconButton } from '../../../../../shared/components/button/icon-button';

export interface FieldItem {
  id: string;
  code: string;
  name: string;
  description: string;
  students: number;
  cycles: number;
  badgeClass: string;
  barClass: string;
  lastUpdated: Date | string;
}

@Component({
  selector: 'app-fields-list',
  standalone: true,
  imports: [IconButton, DatePipe],
  template: `
    <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 mt-6">
      @for (field of fields(); track field.id) {
        <article class="group overflow-hidden rounded-2xl border border-line/40 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-line/60">
          <div class="h-1.5 w-full" [class]="field.barClass"></div>
          <div class="space-y-4 p-6">
            <div class="flex items-start justify-between gap-3">
              <span class="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide" [class]="field.badgeClass + ' bg-opacity-10'">
                {{ field.code }}
              </span>
              <div class="flex items-center gap-1.5">
                <app-icon-button
                  icon="fa-regular fa-pen-to-square"
                  label="Editer la filière"
                  tone="primary"
                  size="sm"
                  (click)="editClicked.emit(field)"
                ></app-icon-button>
                <app-icon-button
                  icon="fa-regular fa-trash-can"
                  label="Supprimer la filière"
                  tone="danger"
                  size="sm"
                  (click)="deleteClicked.emit(field)"
                ></app-icon-button>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-lg font-bold text-principalText line-clamp-2">{{ field.name }}</p>
              <p class="text-sm text-secondaryText line-clamp-2">{{ field.description }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 pt-2">
              <div class="rounded-xl border border-line/30 bg-gradient-to-br from-surface-subtle to-surface px-4 py-3 transition-colors duration-300 group-hover:border-line/50">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondaryText/70">Étudiants</p>
                <p class="mt-1.5 text-2xl font-bold text-principalText">{{ field.students }}</p>
              </div>
              <div class="rounded-xl border border-line/30 bg-gradient-to-br from-surface-subtle to-surface px-4 py-3 transition-colors duration-300 group-hover:border-line/50">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondaryText/70">Cycles</p>
                <p class="mt-1.5 text-2xl font-bold text-principalText">{{ field.cycles }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between rounded-xl border border-line/30 bg-gradient-to-br from-surface-subtle/50 to-surface px-4 py-3 text-xs text-secondaryText/70 transition-colors duration-300 group-hover:border-line/50">
              <span class="font-medium">Dernière mise à jour</span>
              <span class="font-semibold text-principalText">{{ field.lastUpdated | date: 'dd MMM' }}</span>
            </div>
          </div>
        </article>
      }

      <button
        type="button"
        class="group flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-line/40 bg-gradient-to-br from-surface/50 to-surface-subtle p-6 text-center transition-all duration-300 hover:border-primary/50 hover:from-primary/5 hover:to-primary/5"
        (click)="createClicked.emit()"
      >
        <span class="flex h-14 w-14 items-center justify-center rounded-xl border border-line/30 bg-surface text-secondaryText transition-all duration-300 group-hover:border-primary group-hover:text-primary group-hover:bg-primary/5">
          <i class="fa-solid fa-plus text-base font-semibold" aria-hidden="true"></i>
        </span>
        <div>
          <p class="text-base font-bold text-principalText transition-colors duration-300 group-hover:text-primary">Ajouter une nouvelle filière</p>
          <p class="mt-1 text-xs text-secondaryText/60">Créer un nouveau domaine d'études</p>
        </div>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsList {
  readonly fields = input.required<FieldItem[]>();
  readonly createClicked = output<void>();
  readonly editClicked = output<FieldItem>();
  readonly deleteClicked = output<FieldItem>();
}
