import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ModulesList, type ModuleItem } from './components/modules-list';
import { CreateModuleModal } from './components/create-module-modal';
import { EditModuleModal } from './components/edit-module-modal';
import { DeleteModuleModal } from './components/delete-module-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { ModuleService } from '../../../../core/structure/services/module.service';
import { FormationService } from '../../../../core/structure/services/formation.service';
import { CycleService } from '../../../../core/structure/services/cycle.service';
import { FiliereService } from '../../../../core/structure/services/filiere.service';
import { AnneeUniversitaireService } from '../../../../core/structure/services/annee-universitaire.service';
import { AcademicYearContextService } from '../../../../core/structure/services/academic-year-context.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Module, ModuleRequest } from '../../../../core/structure/models/module.model';
import { Formation } from '../../../../core/structure/models/formation.model';
import { Cycle } from '../../../../core/structure/models/cycle.model';
import { Filiere } from '../../../../core/structure/models/filiere.model';
import { AnneeUniversitaire } from '../../../../core/structure/models/annee-universitaire.model';
import { DropdownOption } from '../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-modules-page',
  imports: [
    ModulesList,
    CreateModuleModal,
    EditModuleModal,
    DeleteModuleModal,
    DeleteModal,
  ],
  templateUrl: './modules.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesPage {
  private readonly moduleService = inject(ModuleService);
  private readonly formationService = inject(FormationService);
  private readonly cycleService = inject(CycleService);
  private readonly filiereService = inject(FiliereService);
  private readonly anneeService = inject(AnneeUniversitaireService);
  private readonly academicYearContext = inject(AcademicYearContextService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedModule: Module | null = null;

  readonly searchQuery = signal('');
  readonly selectedFormation = signal<string | null>(null);
  readonly selectedSemester = signal<string | null>(null);

  readonly modules = signal<Module[]>([]);
  readonly formations = signal<Formation[]>([]);
  readonly cycles = signal<Cycle[]>([]);
  readonly fields = signal<Filiere[]>([]);
  readonly academicYears = signal<AnneeUniversitaire[]>([]);
  readonly isLoading = signal(false);
  readonly bulkDeleteItems = signal<readonly ModuleItem[]>([]);
  readonly isBulkDeleteOpen = signal(false);

  readonly formationLabels = computed(() => {
    const cycleMap = new Map(this.cycles().map((cycle) => [cycle.id, cycle]));
    const fieldMap = new Map(this.fields().map((field) => [field.id, field]));
    const yearMap = new Map(this.academicYears().map((year) => [year.id, year]));

    const selectedYearId = this.academicYearContext.selectedAcademicYearId();

    return this.formations()
      .filter(
        (formation) => !selectedYearId || String(formation.anneeUniversitaireId) === selectedYearId,
      )
      .map((formation) => ({
        formation,
        label: this.formatFormationLabel(formation, cycleMap, fieldMap, yearMap),
      }));
  });

  readonly formationOptions = computed<DropdownOption[]>(() =>
    this.formationLabels().map(({ formation, label }) => ({
      value: String(formation.id),
      label,
    })),
  );

  readonly semesterOptions = computed<DropdownOption[]>(() => {
    const semesters = Array.from(
      new Set(
        this.modules()
          .map((module) => module.semester)
          .filter(Boolean),
      ),
    )
      .map((value) => Number(value))
      .sort((a, b) => a - b);
    return semesters.map((semester) => ({
      value: String(semester),
      label: `Semestre ${semester}`,
    }));
  });

  readonly moduleViews = computed<ModuleItem[]>(() => {
    const labelMap = new Map(
      this.formationLabels().map(({ formation, label }) => [formation.id, label]),
    );

    return this.modules()
      .filter(
        (module) =>
          !this.academicYearContext.selectedAcademicYearId() || labelMap.has(module.formationId),
      )
      .map((module) => ({
        id: module.id,
        name: module.name,
        code: module.code,
        semester: module.semester ?? null,
        hours: module.hours ?? null,
        formationId: module.formationId,
        formationLabel: labelMap.get(module.formationId) ?? `Formation #${module.formationId}`,
      }));
  });

  readonly filteredModules = computed<ModuleItem[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const formationFilter = this.selectedFormation();
    const semesterFilter = this.selectedSemester();

    return this.moduleViews().filter((module) => {
      const matchesSearch =
        !query ||
        module.code.toLowerCase().includes(query) ||
        module.name.toLowerCase().includes(query) ||
        module.formationLabel.toLowerCase().includes(query);

      const matchesFormation =
        !formationFilter || String(module.formationId) === String(formationFilter);
      const matchesSemester =
        !semesterFilter || String(module.semester ?? '') === String(semesterFilter);

      return matchesSearch && matchesFormation && matchesSemester;
    });
  });

  constructor() {
    this.loadReferenceData();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onFormationFilterChange(formation: string | null): void {
    this.selectedFormation.set(formation);
  }

  onSemesterFilterChange(semester: string | null): void {
    this.selectedSemester.set(semester);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedFormation.set(null);
    this.selectedSemester.set(null);
  }

  openCreate(): void {
    this.selectedModule = null;
    this.activeModal = 'create';
  }

  openEdit(module: ModuleItem): void {
    const match = this.modules().find((item) => item.id === module.id) ?? null;
    this.selectedModule = match;
    this.activeModal = 'edit';
  }

  openDelete(module: ModuleItem): void {
    const match = this.modules().find((item) => item.id === module.id) ?? null;
    this.selectedModule = match;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }

  closeBulkDelete(): void {
    this.isBulkDeleteOpen.set(false);
  }

  onCreate(request: ModuleRequest): void {
    this.isLoading.set(true);
    this.moduleService
      .create(request)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Module créé', 'Le module a été ajouté.');
          this.closeModal();
          this.loadModules();
        },
        error: () => this.toastService.error('Erreur', "Impossible d'ajouter le module."),
      });
  }

  onUpdate(request: ModuleRequest): void {
    if (!this.selectedModule) {
      return;
    }

    this.isLoading.set(true);
    this.moduleService
      .update(this.selectedModule.id, request)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Module mis à jour', 'Le module a été mis à jour.');
          this.closeModal();
          this.loadModules();
        },
        error: () => this.toastService.error('Erreur', 'Impossible de mettre à jour le module.'),
      });
  }

  onDelete(): void {
    if (!this.selectedModule) {
      return;
    }

    this.isLoading.set(true);
    this.moduleService
      .delete(this.selectedModule.id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Module supprimé', 'Le module a été supprimé.');
          this.closeModal();
          this.loadModules();
        },
        error: () => this.toastService.error('Erreur', 'Impossible de supprimer le module.'),
      });
  }

  onBulkDeleteRequested(modules: readonly ModuleItem[]): void {
    if (modules.length === 0) {
      return;
    }

    this.bulkDeleteItems.set(modules);
    this.isBulkDeleteOpen.set(true);
  }

  onBulkDeleteConfirmed(): void {
    const modules = this.bulkDeleteItems();
    if (modules.length === 0) {
      this.closeBulkDelete();
      return;
    }

    this.isLoading.set(true);
    forkJoin(modules.map((module) => this.moduleService.delete(module.id)))
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Modules supprimés',
            `${modules.length} module(s) ont été supprimé(s).`,
          );
          this.closeBulkDelete();
          this.bulkDeleteItems.set([]);
          this.loadModules();
        },
        error: () => this.toastService.error('Erreur', 'Impossible de supprimer les modules.'),
      });
  }

  private loadReferenceData(): void {
    this.isLoading.set(true);
    forkJoin({
      cycles: this.cycleService.getAll(),
      fields: this.filiereService.getAll(),
      academicYears: this.anneeService.getAll(),
      formations: this.formationService.getAll(),
      modules: this.moduleService.getAll(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cycles, fields, academicYears, formations, modules }) => {
          this.cycles.set(cycles);
          this.fields.set(fields);
          this.academicYears.set(academicYears);
          this.academicYearContext.setAcademicYears(academicYears);
          this.formations.set(formations);
          this.modules.set(modules);
        },
        error: () => this.toastService.error('Erreur', 'Impossible de charger les modules.'),
      });
  }

  private loadModules(): void {
    this.moduleService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (modules) => this.modules.set(modules),
        error: () => this.toastService.error('Erreur', 'Impossible de charger les modules.'),
      });
  }

  private formatFormationLabel(
    formation: Formation,
    cycleMap: Map<number, Cycle>,
    fieldMap: Map<number, Filiere>,
    yearMap: Map<number, AnneeUniversitaire>,
  ): string {
    const cycle = cycleMap.get(formation.cycleId);
    const field = formation.filiereId != null ? (fieldMap.get(formation.filiereId) ?? null) : null;
    const year = yearMap.get(formation.anneeUniversitaireId);

    return [
      formation.name,
      cycle ? `${cycle.code}` : `Cycle #${formation.cycleId}`,
      field ? `${field.code}` : formation.filiereId ? `Filière #${formation.filiereId}` : 'Préparatoire',    ].join(' • ');
  }
}
