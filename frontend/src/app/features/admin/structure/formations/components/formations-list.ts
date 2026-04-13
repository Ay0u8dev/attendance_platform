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
      <div *ngIf="formations().length === 0" class="rounded-2xl border border-dashed border-line/40 bg-surface-subtle p-12 text-center">
        <div class="flex justify-center mb-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-xl border border-line/30 bg-surface">
            <i class="fa-solid fa-book-bookmark text-2xl text-secondaryText"></i>
          </div>
        </div>
        <p class="text-lg font-bold text-principalText">Aucune formation trouvée</p>
        <p class="mt-1 text-sm text-secondaryText/70">Essayez de modifier vos filtres ou créez une nouvelle formation.</p>
      </div>

      <!-- Formations Grid -->
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          *ngFor="let formation of formations(); trackBy: trackByFormationId"
          class="group overflow-hidden rounded-2xl border border-line/40 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-line/60"
        >
          <!-- Header with Year Badge -->
          <div class="flex items-start justify-between gap-4 bg-surface px-6 py-5 border-b border-line/30">
            <span class="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide bg-primary/10">
              {{ formation.year }}
            </span>
            <div class="flex items-center gap-1.5">
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
          <div class="px-6 py-4 border-b border-line/30">
            <p class="text-xs uppercase tracking-wider text-secondaryText/70 font-bold mb-2">Formation</p>
            <h3 class="text-2xl font-bold text-principalText leading-tight">{{ formation.code }}</h3>
          </div>

          <!-- Formation Details -->
          <div class="space-y-3 px-6 py-4 pt-3">
            <!-- Cycle -->
            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-subtle/50 border border-line/30 transition-colors duration-300 group-hover:border-line/50">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                <i class="fa-solid fa-circle-play text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText/70 font-semibold">Cycle</p>
                <p class="font-bold text-principalText text-sm mt-0.5">{{ formation.cycleName }}</p>
              </div>
            </div>

            <!-- Field -->
            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-subtle/50 border border-line/30 transition-colors duration-300 group-hover:border-line/50">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary flex-shrink-0">
                <i class="fa-solid fa-bookmark text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText/70 font-semibold">Filière</p>
                <p class="font-bold text-principalText text-sm mt-0.5">{{ formation.fieldName }}</p>
              </div>
            </div>

            <!-- Semester -->
            <div class="flex items-center gap-3 p-3 rounded-xl bg-surface-subtle/50 border border-line/30 transition-colors duration-300 group-hover:border-line/50">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning flex-shrink-0">
                <i class="fa-solid fa-calendar text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText/70 font-semibold">Semestre</p>
                <p class="font-bold text-principalText text-sm mt-0.5">{{ formation.semester }}</p>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3 border-t border-line/30 bg-gradient-to-br from-surface-subtle/30 to-surface px-6 py-4 mt-1">
            <div class="rounded-xl border border-line/30 bg-gradient-to-br from-surface-subtle to-surface px-3 py-3 transition-colors duration-300 group-hover:border-line/50">
              <p class="text-xs uppercase tracking-wider text-secondaryText/70 font-semibold">Groupes</p>
              <p class="mt-1.5 text-2xl font-bold text-principalText">{{ formation.groups }}</p>
            </div>
            <div class="rounded-xl border border-line/30 bg-gradient-to-br from-surface-subtle to-surface px-3 py-3 transition-colors duration-300 group-hover:border-line/50">
              <p class="text-xs uppercase tracking-wider text-secondaryText/70 font-semibold">Modules</p>
              <p class="mt-1.5 text-2xl font-bold text-principalText">{{ formation.modules }}</p>
            </div>
          </div>
        </article>

        <!-- Add New Formation Card -->
        <button
          type="button"
          (click)="createClicked.emit()"
          class="group flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-line/40 bg-gradient-to-br from-surface/50 to-surface-subtle p-6 text-center transition-all duration-300 hover:border-primary/50 hover:from-primary/5 hover:to-primary/5"
        >
          <span class="flex h-14 w-14 items-center justify-center rounded-xl border border-line/30 bg-surface text-secondaryText transition-all duration-300 group-hover:border-primary group-hover:text-primary group-hover:bg-primary/5">
            <i class="fa-solid fa-plus text-base font-semibold" aria-hidden="true"></i>
          </span>
          <div>
            <p class="text-base font-bold text-principalText transition-colors duration-300 group-hover:text-primary">Ajouter une formation</p>
            <p class="mt-1 text-xs text-secondaryText/60">Créer une nouvelle période académique</p>
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
