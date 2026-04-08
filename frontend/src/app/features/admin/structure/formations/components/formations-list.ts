import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

import { IconButton } from '../../../../../shared/components/button/icon-button';

export interface FormationItem {
  id: string;
  code: string;
  cycleName: string;
  fieldName: string;
  semester: string;
  year: string;
  groups: number;
  modules: number;
  badgeColor: string;
  status: 'active' | 'inactive' | 'archived';
}

@Component({
  selector: 'app-formations-list',
  standalone: true,
  imports: [NgFor, NgIf, IconButton],
  template: `
    <div class="space-y-4">
      <!-- Empty State -->
      <div *ngIf="formations().length === 0" class="rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-12 text-center">
        <div class="flex justify-center mb-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface">
            <i class="fa-solid fa-book-bookmark text-2xl text-secondaryText"></i>
          </div>
        </div>
        <p class="text-lg font-semibold text-principalText">Aucune formation trouvée</p>
        <p class="mt-1 text-sm text-secondaryText">Essayez de modifier vos filtres ou créez une nouvelle formation.</p>
      </div>

      <!-- Formations Grid -->
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article
          *ngFor="let formation of formations(); trackBy: trackByFormationId"
          class="group overflow-hidden rounded-2xl border border-line bg-surface shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-line-strong"
        >
          <!-- Header with Year Badge -->
          <div class="flex items-start justify-between gap-3 border-b border-line bg-gradient-to-r from-surface-subtle to-surface px-5 py-4">
            <span class="rounded-xl px-3 py-1.5 text-xs font-semibold" [class]="formation.badgeColor">
              {{ formation.year }}
            </span>
            <div class="flex items-center gap-1.5 opacity-0 transition group-hover:opacity-100">
              <app-icon-button
                icon="fa-regular fa-pen-to-square"
                label="Modifier la formation"
                tone="primary"
                size="sm"
                (click)="manageClicked.emit(formation)"
              ></app-icon-button>
              <app-icon-button
                icon="fa-regular fa-trash-can"
                label="Supprimer la formation"
                tone="danger"
                size="sm"
                (click)="deleteClicked.emit(formation)"
              ></app-icon-button>
            </div>
          </div>

          <!-- Formation Code -->
          <div class="px-5 py-3 pb-2">
            <h3 class="text-2xl font-bold text-principalText group-hover:text-primary transition">{{ formation.code }}</h3>
          </div>

          <!-- Formation Details -->
          <div class="space-y-2.5 px-5 pb-3">
            <!-- Cycle -->
            <div class="flex items-center gap-2.5 text-sm">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-soft text-primary flex-shrink-0">
                <i class="fa-solid fa-circle-play text-xs"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText font-medium">Cycle</p>
                <p class="font-medium text-principalText text-sm">{{ formation.cycleName }}</p>
              </div>
            </div>

            <!-- Field -->
            <div class="flex items-center gap-2.5 text-sm">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-soft text-secondary flex-shrink-0">
                <i class="fa-solid fa-bookmark text-xs"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText font-medium">Filière</p>
                <p class="font-medium text-principalText text-sm">{{ formation.fieldName }}</p>
              </div>
            </div>

            <!-- Semester -->
            <div class="flex items-center gap-2.5 text-sm">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-soft text-warning flex-shrink-0">
                <i class="fa-solid fa-calendar text-xs"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText font-medium">Semestre</p>
                <p class="font-medium text-principalText text-sm">{{ formation.semester }}</p>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3 border-t border-line bg-surface-subtle/50 px-5 py-4">
            <div class="rounded-lg border border-line bg-surface px-3 py-2.5 hover:border-primary/30 transition">
              <p class="text-xs uppercase tracking-wide text-secondaryText font-medium">Groupes</p>
              <p class="mt-1.5 text-xl font-bold text-primary">{{ formation.groups }}</p>
            </div>
            <div class="rounded-lg border border-line bg-surface px-3 py-2.5 hover:border-secondary/30 transition">
              <p class="text-xs uppercase tracking-wide text-secondaryText font-medium">Modules</p>
              <p class="mt-1.5 text-xl font-bold text-secondary">{{ formation.modules }}</p>
            </div>
          </div>
        </article>

        <!-- Add New Formation Card -->
        <button
          type="button"
          (click)="createClicked.emit()"
          class="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-5 text-center transition text-secondaryText hover:border-primary hover:bg-surface-subtle/80 hover:text-primary"
        >
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface group-hover:border-primary group-hover:text-primary hover:text-primary hover:border-primary transition">
            <i class="fa-solid fa-plus text-lg "></i>
          </div>
          <div>
            <p class="text-base font-semibold">Ajouter une nouvelle formation</p>
          </div>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormationsList {
  readonly formations = input.required<FormationItem[]>();
  readonly totalFormations = input.required<number>();
  readonly createClicked = output<void>();
  readonly manageClicked = output<FormationItem>();
  readonly deleteClicked = output<FormationItem>();

  trackByFormationId(index: number, formation: FormationItem): string {
    return formation.id;
  }
}
