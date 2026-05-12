import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Button } from '../../../../../shared/components/button/button';
import { IconButton } from '../../../../../shared/components/button/icon-button';
import { ModulesFilters } from './modules-filters';

export interface ModuleItem {
  id: number;
  code: string;
  name: string;
  formationId: number;
  formationLabel: string;
  semester: number | null;
  hours: number | null;
}

@Component({
  selector: 'app-modules-list',
  standalone: true,
  imports: [CommonModule, Button, IconButton, ModulesFilters],
  template: `
    <!-- Header -->
    <div class="mt-4 flex flex-wrap items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-xl font-bold text-principalText tracking-tight">Modules d'enseignement</h2>
      </div>
      <app-button
        label="Ajouter un module"
        icon="fa-solid fa-plus"
        variant="primary"
        [fullWidth]="false"
        (clicked)="createClicked.emit()"
        class="shadow-lg shadow-primary/20"
      ></app-button>
    </div>

    <!-- Filtres -->
    <app-modules-filters
      [formations]="formationOptions()"
      [semesters]="semesterOptions()"
      [searchValue]="searchQuery()"
      [formationValue]="selectedFormation()"
      [semesterValue]="selectedSemester()"
      (searchChange)="searchQuery.set($event)"
      (formationFilterChange)="selectedFormation.set($event)"
      (semesterFilterChange)="selectedSemester.set($event)"
      (resetFilters)="resetFilters()"
    ></app-modules-filters>

    <div class="-mt-2 mb-4 flex items-center justify-end gap-2">
      <p
        class="inline-flex items-center gap-2 rounded-2xl border border-primary-soft bg-primary-soft px-4 py-2 text-sm font-medium text-primary"
      >
        <span class="h-2 w-2 rounded-full bg-secondary"></span>
        {{ filteredCount() }} module(s)
      </p>
    </div>

    @if (selectedCount() > 0) {
      <div class="-mt-2 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
        <p class="flex items-center gap-2 text-sm font-medium text-secondaryText">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
            {{ selectedCount() }}
          </span>
          module(s) sélectionné(s)
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-danger/20 bg-danger/5 px-4 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
          (click)="requestBulkDelete()"
        >
          <i class="fa-regular fa-trash-can"></i>
          Supprimer la sélection
        </button>
      </div>
    }

    <!-- Grouped Content -->
    <div *ngIf="groupedModules().length; else emptyState" class="space-y-6">
      <section
        *ngFor="let section of groupedModules()"
        class="rounded-xl border border-line bg-surface shadow-sm overflow-hidden"
      >
        <header class="flex items-center justify-between gap-4 bg-surface-subtle px-5 py-4 border-b border-line">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-line accent-primary"
              [checked]="isSectionSelected(section.modules)"
              [indeterminate]="isSectionPartiallySelected(section.modules)"
              (change)="toggleSectionSelection(section.modules, $event)"
              aria-label="Sélectionner les modules de la formation"
            />
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <i class="fa-solid fa-book-open text-xs"></i>
            </div>
            <h3 class="text-sm font-bold text-principalText">{{ section.label }}</h3>
          </div>
          <span class="rounded-full bg-white border border-line px-3 py-1 text-[11px] font-bold text-secondaryText uppercase tracking-wider">
            {{ section.modules.length }} module(s)
          </span>
        </header>

        <div class="divide-y divide-line">
          <div
            *ngFor="let module of section.modules"
            class="group flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-surface-subtle/50 transition-colors"
          >
            <div class="flex items-center gap-4">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-line accent-primary"
                [checked]="isSelected(module.id)"
                (change)="toggleSelected(module.id, $event)"
                [attr.aria-label]="'Sélectionner ' + module.name"
              />
              <span
                class="inline-flex min-w-14 items-center justify-center rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary border border-primary/10"
              >
                {{ module.code }}
              </span>
              <div>
                <p class="font-bold text-principalText leading-none mb-1">{{ module.name }}</p>
                <p class="text-[11px] font-semibold text-muted uppercase tracking-tight">
                  {{ module.semester ? 'Semestre ' + module.semester : 'Semestre non défini' }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <div class="text-right">
                <p class="text-xs font-semibold text-secondaryText uppercase tracking-wider">Volume</p>
                <p class="text-sm font-bold text-principalText">
                  {{ module.hours ?? '-' }}
                  <span class="text-[10px] text-muted uppercase">h</span>
                </p>
              </div>
              <div class="flex items-center gap-2">
                <app-icon-button
                  icon="fa-regular fa-pen-to-square"
                  label="Modifier"
                  tone="primary"
                  size="sm"
                  (click)="editClicked.emit(module)"
                ></app-icon-button>
                <app-icon-button
                  icon="fa-regular fa-trash-can"
                  label="Supprimer"
                  tone="danger"
                  size="sm"
                  (click)="deleteClicked.emit(module)"
                ></app-icon-button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Empty State -->
    <ng-template #emptyState>
      <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
        <h3 class="text-base font-bold text-principalText">Aucun module trouvé</h3>
        <p class="text-sm text-secondaryText max-w-xs mt-2">
          Ajustez les filtres ou créez un nouveau module.
        </p>
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesList {
  // --- Inputs & Outputs ---
  readonly modules = input.required<ModuleItem[]>();
  readonly totalModules = input.required<number>();
  readonly createClicked = output<void>();
  readonly editClicked = output<ModuleItem>();
  readonly deleteClicked = output<ModuleItem>();
  readonly bulkDeleteRequested = output<readonly ModuleItem[]>();

  // --- Filtres (Signals) ---
  readonly searchQuery = signal('');
  readonly selectedFormation = signal<string | null>(null);
  readonly selectedSemester = signal<string | null>(null);
  readonly selectedIds = signal<readonly number[]>([]);
  readonly selectedIdSet = computed(() => new Set(this.selectedIds()));

  // --- Logic (Computed) ---

  // Options uniques pour les dropdowns
  readonly formationOptions = computed(() => {
    const uniques = [...new Set(this.modules().map(m => m.formationLabel))];
    return uniques.sort().map(label => ({ label, value: label }));
  });

  readonly semesterOptions = computed(() => {
    const semestres = this.modules()
      .map(m => m.semester)
      .filter((s): s is number => s !== null);
    const uniques = [...new Set(semestres)].sort((a, b) => a - b);
    return uniques.map(s => ({ label: `Semestre ${s}`, value: String(s) }));
  });

  // Filtrage combine
  readonly filteredModules = computed(() => {
    let results = this.modules();
    const query = this.searchQuery().toLowerCase().trim();
    const formation = this.selectedFormation();
    const semester = this.selectedSemester();

    if (query) {
      results = results.filter(m => 
        m.name.toLowerCase().includes(query) || 
        m.code.toLowerCase().includes(query) ||
        m.formationLabel.toLowerCase().includes(query)
      );
    }

    if (formation) {
      results = results.filter(m => m.formationLabel === formation);
    }

    if (semester) {
      results = results.filter(m => String(m.semester) === semester);
    }

    return results;
  });

  readonly groupedModules = computed(() => {
    const groupedMap = new Map<string, ModuleItem[]>();

    this.filteredModules().forEach((module) => {
      const label = module.formationLabel || 'Formation non définie';
      const bucket = groupedMap.get(label) || [];
      bucket.push(module);
      groupedMap.set(label, bucket);
    });

    return [...groupedMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, list]) => ({
        label,
        modules: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  });

  readonly filteredCount = computed(() => this.filteredModules().length);
  readonly selectedCount = computed(() => this.selectedIds().length);

  // --- Méthodes ---
  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedFormation.set(null);
    this.selectedSemester.set(null);
  }

  toggleSelected(id: number, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const next = new Set(this.selectedIds());
    if (target.checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectedIds.set([...next]);
  }

  isSelected(id: number): boolean {
    return this.selectedIdSet().has(id);
  }

  isSectionSelected(modules: readonly ModuleItem[]): boolean {
    if (modules.length === 0) {
      return false;
    }
    const selected = this.selectedIdSet();
    return modules.every((module) => selected.has(module.id));
  }

  isSectionPartiallySelected(modules: readonly ModuleItem[]): boolean {
    const selected = this.selectedIdSet();
    const selectedCount = modules.filter((module) => selected.has(module.id)).length;
    return selectedCount > 0 && selectedCount < modules.length;
  }

  toggleSectionSelection(modules: readonly ModuleItem[], event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const next = new Set(this.selectedIds());
    modules.forEach((module) => {
      if (target.checked) {
        next.add(module.id);
      } else {
        next.delete(module.id);
      }
    });
    this.selectedIds.set([...next]);
  }

  requestBulkDelete(): void {
    const selected = this.modules().filter((module) => this.selectedIdSet().has(module.id));
    if (selected.length === 0) {
      return;
    }
    this.bulkDeleteRequested.emit(selected);
  }

}