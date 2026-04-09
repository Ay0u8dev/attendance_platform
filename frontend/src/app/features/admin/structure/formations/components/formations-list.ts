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
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <article
          *ngFor="let formation of formations(); trackBy: trackByFormationId"
          class="group overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-surface-subtle shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-primary/30"
        >
          <!-- Header with Year Badge -->
          <div class="flex items-start justify-between gap-4 border-b border-line/50 bg-gradient-to-r from-primary/5 via-surface to-surface px-6 py-5">
            <span class="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 shadow-sm">
              {{ formation.year }}
            </span>
            <div class="flex items-center gap-2.5">
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
          <div class="px-6 py-5 border-b border-line/30 bg-gradient-to-r from-primary/2 to-transparent">
            <p class="text-xs uppercase tracking-widest text-secondaryText font-bold mb-2">Formation</p>
            <h3 class="text-3xl font-bold text-principalText group-hover:text-primary transition leading-tight">{{ formation.code }}</h3>
          </div>

          <!-- Formation Details -->
          <div class="space-y-3 px-6 py-5">
            <!-- Cycle -->
            <div class="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10 hover:border-primary/30 transition">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary flex-shrink-0 shadow-sm">
                <i class="fa-solid fa-circle-play text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText font-bold">Cycle</p>
                <p class="font-bold text-principalText text-sm mt-0.5">{{ formation.cycleName }}</p>
              </div>
            </div>

            <!-- Field -->
            <div class="flex items-center gap-3 p-3 rounded-xl bg-secondary/5 border border-secondary/10 hover:border-secondary/30 transition">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 text-secondary flex-shrink-0 shadow-sm">
                <i class="fa-solid fa-bookmark text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText font-bold">Filière</p>
                <p class="font-bold text-principalText text-sm mt-0.5">{{ formation.fieldName }}</p>
              </div>
            </div>

            <!-- Semester -->
            <div class="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/10 hover:border-warning/30 transition">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-warning/20 to-warning/10 text-warning flex-shrink-0 shadow-sm">
                <i class="fa-solid fa-calendar text-sm"></i>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs uppercase tracking-wide text-secondaryText font-bold">Semestre</p>
                <p class="font-bold text-principalText text-sm mt-0.5">{{ formation.semester }}</p>
              </div>
            </div>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-2 gap-3 border-t border-line/30 bg-gradient-to-t from-surface-subtle to-transparent px-6 py-5">
            <div class="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 px-3 py-3 hover:border-primary/40 hover:shadow-md transition">
              <p class="text-xs uppercase tracking-wide text-secondaryText font-bold">Groupes</p>
              <p class="mt-2 text-2xl font-bold text-primary">{{ formation.groups }}</p>
            </div>
            <div class="rounded-xl border border-secondary/20 bg-gradient-to-br from-secondary/10 to-secondary/5 px-3 py-3 hover:border-secondary/40 hover:shadow-md transition">
              <p class="text-xs uppercase tracking-wide text-secondaryText font-bold">Modules</p>
              <p class="mt-2 text-2xl font-bold text-secondary">{{ formation.modules }}</p>
            </div>
          </div>
        </article>

        <!-- Add New Formation Card -->
        <button
          type="button"
          (click)="createClicked.emit()"
          class="flex min-h-[470px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-line-strong bg-gradient-to-br from-surface to-surface-subtle p-6 text-center transition hover:border-primary hover:bg-primary/5 group"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary transition shadow-sm">
            <i class="fa-solid fa-plus text-xl text-secondaryText group-hover:text-primary transition"></i>
          </div>
          <div>
            <p class="text-lg font-bold text-principalText group-hover:text-primary transition">Ajouter une formation</p>
            <p class="text-xs text-secondaryText mt-1 group-hover:text-secondaryText transition">Cliquez pour créer</p>
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
