import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

import { IconButton } from '../../../../../shared/components/button/icon-button';

export interface GroupeItem {
  id: string;
  code: string;
  formationName: string;
  subtitle: string;
  students: number;
  semester: string;
  field: string;
  formation: string;
  badgeColor: string;
  status: 'active' | 'inactive' | 'archived';
}

@Component({
  selector: 'app-groupes-list',
  standalone: true,
  imports: [NgFor, NgIf, IconButton],
  template: `
    <div class="space-y-6">
      <!-- Empty State -->
      <div *ngIf="groupes().length === 0" class="rounded-2xl border border-dashed border-line/40 bg-surface-subtle p-12 text-center">
        <div class="flex justify-center mb-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-xl border border-line/30 bg-surface">
            <i class="fa-solid fa-people-group text-2xl text-secondaryText"></i>
          </div>
        </div>
        <p class="text-lg font-bold text-principalText">Aucun groupe trouvé</p>
        <p class="mt-1 text-sm text-secondaryText/70">Essayez de modifier vos filtres ou créez un nouveau groupe.</p>
      </div>

      <!-- Groups by Formation -->
      <div *ngFor="let formation of groupedByFormation(); trackBy: trackByFormation" class="space-y-4">
        <!-- Formation Header -->
        <div class="flex items-center gap-4 px-2 py-3 border-l-4 border-primary">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <i class="fa-solid fa-book-open text-primary text-lg"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-bold text-principalText">{{ formation.name }}</h3>
          </div>
          <span class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span class="flex h-2 w-2 rounded-full bg-primary"></span>
            <span class="text-sm font-bold text-primary">{{ formation.count }} actifs</span>
          </span>
        </div>

        <!-- Groups Grid -->
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pl-4">
          <article
            *ngFor="let groupe of formation.groupes; trackBy: trackByGroupeId"
            class="group overflow-hidden rounded-2xl border border-line/40 bg-surface shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:border-line/60"
          >
            <!-- Header with Code Badge and Actions -->
            <div class="flex items-start justify-between gap-4 bg-surface px-6 py-5 border-b border-line/30">
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs font-bold">
                  {{ groupe.code.split('-')[1] }}
                </span>
                <div>
                  <span class="text-xs font-bold text-secondaryText/70 uppercase tracking-wider">Code</span>
                  <p class="text-sm font-bold text-principalText">{{ groupe.code }}</p>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <app-icon-button
                  icon="fa-regular fa-pen-to-square"
                  label="Modifier le groupe"
                  tone="primary"
                  size="sm"
                  (click)="manageClicked.emit(groupe)"
                ></app-icon-button>
                <app-icon-button
                  icon="fa-regular fa-trash-can"
                  label="Supprimer le groupe"
                  tone="danger"
                  size="sm"
                  (click)="deleteClicked.emit(groupe)"
                ></app-icon-button>
              </div>
            </div>

            <!-- Groupe Info -->
            <div class="px-6 py-5 space-y-4">
              <!-- Formation Name -->
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-wider text-secondaryText/70 font-bold">Formation</p>
                <h4 class="text-lg font-bold text-principalText leading-tight">
                  {{ groupe.formationName }}
                </h4>
              </div>

              <!-- Students Row -->
              <div class="flex items-center gap-4 bg-surface-subtle/50 border border-line/30 rounded-xl px-4 py-3 transition-colors duration-300 group-hover:border-line/50">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary flex-shrink-0">
                  <i class="fa-solid fa-users text-base"></i>
                </div>
                <div class="flex-1">
                  <p class="text-xs text-secondaryText/70 uppercase tracking-wider font-semibold">Étudiants</p>
                  <p class="text-lg font-bold text-principalText mt-0.5">{{ groupe.students }}</p>
                </div>
              </div>

              <!-- Meta Info -->
              <div class="grid grid-cols-2 gap-3 pt-2 border-t border-line/30">
                <div class="bg-gradient-to-br from-surface-subtle to-surface border border-line/30 rounded-xl px-3 py-3 transition-colors duration-300 group-hover:border-line/50">
                  <p class="text-xs text-secondaryText/70 uppercase tracking-wider font-semibold">Filière</p>
                  <p class="text-sm font-bold text-principalText mt-1">{{ groupe.field }}</p>
                </div>
                <div class="bg-gradient-to-br from-surface-subtle to-surface border border-line/30 rounded-xl px-3 py-3 transition-colors duration-300 group-hover:border-line/50">
                  <p class="text-xs text-secondaryText/70 uppercase tracking-wider font-semibold">Semestre</p>
                  <p class="text-sm font-bold text-principalText mt-1">{{ groupe.semester }}</p>
                </div>
              </div>
            </div>
          </article>

          <!-- Add New Group Card -->
          <button
            type="button"
            class="group flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-line/40 bg-gradient-to-br from-surface/50 to-surface-subtle p-6 text-center transition-all duration-300 hover:border-primary/50 hover:from-primary/5 hover:to-primary/5"
            (click)="createClicked.emit()"
          >
            <span class="flex h-14 w-14 items-center justify-center rounded-xl border border-line/30 bg-surface text-secondaryText transition-all duration-300 group-hover:border-primary group-hover:text-primary group-hover:bg-primary/5">
              <i class="fa-solid fa-plus text-base font-semibold" aria-hidden="true"></i>
            </span>
            <div>
              <p class="text-base font-bold text-principalText transition-colors duration-300 group-hover:text-primary">Nouveau groupe</p>
              <p class="mt-1 text-xs text-secondaryText/60">Cliquez pour ajouter</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupesList {
  readonly groupes = input.required<GroupeItem[]>();
  readonly totalGroupes = input.required<number>();
  readonly createClicked = output<void>();
  readonly manageClicked = output<GroupeItem>();
  readonly deleteClicked = output<GroupeItem>();

  groupedByFormation() {
    const grouped = new Map<string, { name: string; groupes: GroupeItem[]; count: number }>();

    this.groupes().forEach((groupe) => {
      if (!grouped.has(groupe.formationName)) {
        grouped.set(groupe.formationName, {
          name: groupe.formationName,
          groupes: [],
          count: 0,
        });
      }

      const entry = grouped.get(groupe.formationName)!;
      entry.groupes.push(groupe);
      if (groupe.status === 'active') {
        entry.count++;
      }
    });

    return Array.from(grouped.values());
  }

  trackByFormation(index: number, formation: any): string {
    return formation.name;
  }

  trackByGroupeId(index: number, groupe: GroupeItem): string {
    return groupe.id;
  }
}
