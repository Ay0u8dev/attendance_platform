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
      <div *ngIf="groupes().length === 0" class="rounded-3xl border border-dashed border-line-strong bg-surface-subtle p-12 text-center">
        <div class="flex justify-center mb-4">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface">
            <i class="fa-solid fa-people-group text-2xl text-secondaryText"></i>
          </div>
        </div>
        <p class="text-lg font-semibold text-principalText">Aucun groupe trouvé</p>
        <p class="mt-1 text-sm text-secondaryText">Essayez de modifier vos filtres ou créez un nouveau groupe.</p>
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
          <span class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <span class="flex h-2 w-2 rounded-full bg-primary"></span>
            <span class="text-sm font-bold text-primary">{{ formation.count }} actifs</span>
          </span>
        </div>

        <!-- Groups Grid -->
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 pl-4">
          <article
            *ngFor="let groupe of formation.groupes; trackBy: trackByGroupeId"
            class="group overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-surface-subtle shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-primary/50"
          >
            <!-- Header with Code Badge and Actions -->
            <div class="flex items-start justify-between gap-4 border-b border-line/50 bg-gradient-to-r from-primary/5 via-surface to-surface px-6 py-5">
              <div class="flex items-center gap-3">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-bold shadow-sm">
                  {{ groupe.code.split('-')[1] }}
                </span>
                <div>
                  <span class="text-xs font-bold text-secondaryText uppercase tracking-wider">Code</span>
                  <p class="text-sm font-bold text-principalText">{{ groupe.code }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
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
            <div class="px-6 py-6 space-y-6">
              <!-- Formation Name -->
              <div class="space-y-2">
                <p class="text-xs uppercase tracking-widest text-secondaryText font-bold">Formation</p>
                <h4 class="text-xl font-bold text-principalText group-hover:text-primary transition leading-tight">
                  {{ groupe.formationName }}
                </h4>
              </div>

              <!-- Details Row -->
              <div class="space-y-4">
                <div class="flex items-center gap-4 bg-gradient-to-r from-secondary/5 to-secondary/0 border border-secondary/10 rounded-2xl px-4 py-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/10 text-secondary flex-shrink-0 shadow-sm">
                    <i class="fa-solid fa-users text-base"></i>
                  </div>
                  <div class="flex-1">
                    <p class="text-xs text-secondaryText uppercase tracking-wider font-semibold">Étudiants</p>
                    <p class="text-lg font-bold text-principalText">{{ groupe.students }}</p>
                  </div>
                  <app-icon-button
                    icon="fa-regular fa-eye"
                    label="Voir les étudiants"
                    tone="secondary"
                    size="sm"
                    (click)="manageClicked.emit(groupe)"
                  ></app-icon-button>
                </div>
              </div>

              <!-- Meta Info -->
              <div class="grid grid-cols-2 gap-3 pt-2 border-t border-line/30">
                <div class="bg-primary/5 border border-primary/10 rounded-xl px-3 py-3">
                  <p class="text-xs text-secondaryText uppercase tracking-wider font-semibold">Filière</p>
                  <p class="text-sm font-bold text-principalText mt-1">{{ groupe.field }}</p>
                </div>
                <div class="bg-warning/5 border border-warning/10 rounded-xl px-3 py-3">
                  <p class="text-xs text-secondaryText uppercase tracking-wider font-semibold">Semestre</p>
                  <p class="text-sm font-bold text-principalText mt-1">{{ groupe.semester }}</p>
                </div>
              </div>
            </div>
          </article>

          <!-- Add New Group Card -->
          <button
            type="button"
            class="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-line-strong bg-gradient-to-br from-surface to-surface-subtle p-6 text-center transition hover:border-primary hover:bg-primary/5 group"
            (click)="createClicked.emit()"
          >
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary transition shadow-sm">
              <i class="fa-solid fa-plus text-xl text-secondaryText group-hover:text-primary transition"></i>
            </div>
            <div>
              <p class="text-lg font-bold text-principalText group-hover:text-primary transition">Nouveau groupe</p>
              <p class="text-xs text-secondaryText mt-1 group-hover:text-secondaryText transition">Cliquez pour ajouter</p>
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
