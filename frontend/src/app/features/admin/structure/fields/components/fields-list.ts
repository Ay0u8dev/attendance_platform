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
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 mt-6">
      @for (field of fields(); track field.id) {
        <article class="overflow-hidden rounded-3xl border border-line bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-card-strong">
          <span class="block h-1" [class]="field.barClass"></span>
          <div class="space-y-4 p-5">
            <div class="flex items-start justify-between gap-3">
              <span class="rounded-xl px-3 py-1 text-xs font-semibold" [class]="field.badgeClass">
                {{ field.code }}
              </span>
              <div class="flex items-center gap-2">
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

            <div>
              <p class="text-base font-semibold text-principalText">{{ field.name }}</p>
              <p class="text-sm text-secondaryText">{{ field.description }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-line bg-surface-subtle px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-secondaryText">Étudiants</p>
                <p class="text-lg font-semibold text-principalText">{{ field.students }}</p>
              </div>
              <div class="rounded-2xl border border-line bg-surface-subtle px-4 py-3">
                <p class="text-xs uppercase tracking-wide text-secondaryText">Cycles</p>
                <p class="text-lg font-semibold text-principalText">{{ field.cycles }}</p>
              </div>
            </div>
            <div class="flex items-center justify-between rounded-2xl border border-line bg-surface-subtle px-4 py-3 text-xs text-secondaryText">
              <span>Dernière mise à jour</span>
              <span class="font-semibold text-principalText">{{ field.lastUpdated | date: 'dd MMMM yyyy' }}</span>
            </div>
          </div>
        </article>
      }

      <button
        type="button"
        class="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-5 text-center text-secondaryText transition hover:border-primary hover:text-primary"
        (click)="createClicked.emit()"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface hover:border-primary hover:text-primary">
          <i class="fa-solid fa-plus text-sm" aria-hidden="true"></i>
        </span>
        <span class="text-sm font-medium">Ajouter une nouvelle filière</span>
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
