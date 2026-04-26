import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';

import { IconButton } from '../../../../../shared/components/button/icon-button';

export type ModuleStatus = 'Actif' | 'En validation' | 'Archivé';

export interface ModuleItem {
  id: string;
  code: string;
  name: string;
  formation: string;
  semester: string;
  credits: number;
  hours: number;
  status: ModuleStatus;
  badgeClass: string;
  barClass: string;
  lastUpdated: Date | string;
}

@Component({
  selector: 'app-modules-list',
  imports: [IconButton, DatePipe, NgClass],
  template: `
    <div class="space-y-4">
      @if (modules().length === 0) {
        <div class="rounded-2xl border border-dashed border-line/40 bg-surface-subtle p-12 text-center">
          <div class="flex justify-center mb-4">
            <div class="flex h-16 w-16 items-center justify-center rounded-xl border border-line/30 bg-surface">
              <i class="fa-solid fa-layer-group text-2xl text-secondaryText"></i>
            </div>
          </div>
          <p class="text-lg font-bold text-principalText">Aucun module trouvé</p>
          <p class="mt-1 text-sm text-secondaryText/70">Essayez de modifier vos filtres ou créez un module.</p>
        </div>
      }

      <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        @for (module of modules(); track module.id) {
          <article class="group overflow-hidden rounded-2xl border border-line/40 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-line/60">
            <div [class]="'h-1.5 w-full ' + module.barClass"></div>
            <div class="space-y-4 p-6">
              <div class="flex items-start justify-between gap-3">
                <span [class]="'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold tracking-wide bg-opacity-10 ' + module.badgeClass">
                  {{ module.code }}
                </span>
                <div class="flex items-center gap-1.5">
                  <app-icon-button
                    icon="fa-regular fa-pen-to-square"
                    label="Editer le module"
                    tone="primary"
                    size="sm"
                    (click)="editClicked.emit(module)"
                  ></app-icon-button>
                  <app-icon-button
                    icon="fa-regular fa-trash-can"
                    label="Supprimer le module"
                    tone="danger"
                    size="sm"
                    (click)="deleteClicked.emit(module)"
                  ></app-icon-button>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-lg font-bold text-principalText line-clamp-2">{{ module.name }}</p>
                <p class="text-sm text-secondaryText">{{ module.formation }}</p>
              </div>

              <div class="flex items-center justify-between rounded-xl border border-line/30 bg-linear-to-br from-surface-subtle/50 to-surface px-4 py-3 text-xs text-secondaryText/70 transition-colors duration-300 group-hover:border-line/50">
                <span class="font-medium">Semestre</span>
                <span class="font-semibold text-principalText">{{ module.semester }}</span>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-xl border border-line/30 bg-linear-to-br from-surface-subtle to-surface px-4 py-3 transition-colors duration-300 group-hover:border-line/50">
                  <p class="text-xs font-semibold uppercase tracking-wider text-secondaryText/70">Crédits</p>
                  <p class="mt-1.5 text-2xl font-bold text-principalText">{{ module.credits }}</p>
                </div>
                <div class="rounded-xl border border-line/30 bg-linear-to-br from-surface-subtle to-surface px-4 py-3 transition-colors duration-300 group-hover:border-line/50">
                  <p class="text-xs font-semibold uppercase tracking-wider text-secondaryText/70">Heures</p>
                  <p class="mt-1.5 text-2xl font-bold text-principalText">{{ module.hours }}</p>
                </div>
              </div>

              <div class="flex items-center justify-between rounded-xl border border-line/30 bg-linear-to-br from-surface-subtle/50 to-surface px-4 py-3 text-xs text-secondaryText/70 transition-colors duration-300 group-hover:border-line/50">
                <span class="font-medium">Statut</span>
                <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[0.7rem] font-semibold" [ngClass]="statusClass(module.status)">
                  <span class="h-2 w-2 rounded-full" [ngClass]="statusDotClass(module.status)"></span>
                  {{ module.status }}
                </span>
              </div>

              <div class="flex items-center justify-between rounded-xl border border-line/30 bg-linear-to-br from-surface-subtle/50 to-surface px-4 py-3 text-xs text-secondaryText/70 transition-colors duration-300 group-hover:border-line/50">
                <span class="font-medium">Dernière mise à jour</span>
                <span class="font-semibold text-principalText">{{ module.lastUpdated | date: 'dd MMM' }}</span>
              </div>
            </div>
          </article>
        }

        <button
          type="button"
          class="group flex min-h-70 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-line/40 bg-linear-to-br from-surface/50 to-surface-subtle p-6 text-center transition-all duration-300 hover:border-primary/50 hover:from-primary/5 hover:to-primary/5"
          (click)="createClicked.emit()"
        >
          <span class="flex h-14 w-14 items-center justify-center rounded-xl border border-line/30 bg-surface text-secondaryText transition-all duration-300 group-hover:border-primary group-hover:text-primary group-hover:bg-primary/5">
            <i class="fa-solid fa-plus text-base font-semibold" aria-hidden="true"></i>
          </span>
          <div>
            <p class="text-base font-bold text-principalText transition-colors duration-300 group-hover:text-primary">Ajouter un module</p>
            <p class="mt-1 text-xs text-secondaryText/60">Créer un nouveau module d'enseignement</p>
          </div>
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesList {
  readonly modules = input.required<ModuleItem[]>();
  readonly totalModules = input.required<number>();
  readonly createClicked = output<void>();
  readonly editClicked = output<ModuleItem>();
  readonly deleteClicked = output<ModuleItem>();

  statusClass(status: ModuleStatus): string {
    switch (status) {
      case 'Actif':
        return 'bg-success-soft text-success';
      case 'En validation':
        return 'bg-warning-soft text-warning';
      default:
        return 'bg-danger-soft text-danger';
    }
  }

  statusDotClass(status: ModuleStatus): string {
    switch (status) {
      case 'Actif':
        return 'bg-success';
      case 'En validation':
        return 'bg-warning';
      default:
        return 'bg-danger';
    }
  }
}
