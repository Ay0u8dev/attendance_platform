import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { FormationsList, type FormationItem } from './components/formations-list';
import { CreateFormationModal } from './components/create-formation-modal';
import { EditFormationModal } from './components/edit-formation-modal';
import { DeleteFormationModal } from './components/delete-formation-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { FormationService } from '../../../../core/structure/services/formation.service';
import { CycleService } from '../../../../core/structure/services/cycle.service';
import { FiliereService } from '../../../../core/structure/services/filiere.service';
import { AnneeUniversitaireService } from '../../../../core/structure/services/annee-universitaire.service';
import { AcademicYearContextService } from '../../../../core/structure/services/academic-year-context.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Formation, FormationRequest } from '../../../../core/structure/models/formation.model';
import { Cycle } from '../../../../core/structure/models/cycle.model';
import { Filiere } from '../../../../core/structure/models/filiere.model';
import { AnneeUniversitaire } from '../../../../core/structure/models/annee-universitaire.model';
import { DropdownOption } from '../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-formations-page',
  imports: [
    FormationsList,
    CreateFormationModal,
    EditFormationModal,
    DeleteFormationModal,
    DeleteModal,
  ],
  templateUrl: './formations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormationsPage {
  private readonly formationService = inject(FormationService);
  private readonly cycleService = inject(CycleService);
  private readonly filiereService = inject(FiliereService);
  private readonly anneeService = inject(AnneeUniversitaireService);
  private readonly academicYearContext = inject(AcademicYearContextService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedFormation: Formation | null = null;

  searchQuery = signal('');
  selectedCycle = signal<string | null>(null);
  selectedField = signal<string | null>(null);
  selectedAcademicYear = signal<string | null>(null);

  readonly formations = signal<Formation[]>([]);
  readonly cycles = signal<Cycle[]>([]);
  readonly fields = signal<Filiere[]>([]);
  readonly academicYears = signal<AnneeUniversitaire[]>([]);
  readonly isLoading = signal(false);
  readonly bulkDeleteItems = signal<readonly FormationItem[]>([]);
  readonly isBulkDeleteOpen = signal(false);
  private readonly selectedAcademicYearSync = effect(
    () => {
      this.selectedAcademicYear.set(this.academicYearContext.selectedAcademicYearId());
    },
    { allowSignalWrites: true },
  );

  readonly cycleOptions = computed<DropdownOption[]>(() =>
    this.cycles().map((cycle) => ({
      value: String(cycle.id),
      label: `${cycle.code} - ${cycle.name}`,
    })),
  );

  readonly fieldOptions = computed<DropdownOption[]>(() =>
    this.fields().map((field) => ({
      value: String(field.id),
      label: `${field.code} - ${field.name}`,
    })),
  );

  readonly academicYearOptions = computed<DropdownOption[]>(() =>
    this.academicYears()
      .filter((year) => year.active)
      .map((year) => ({
        value: String(year.id),
        label: year.name,
      })),
  );

  readonly formationViews = computed<FormationItem[]>(() => {
    const cycles = new Map(this.cycles().map((cycle) => [cycle.id, cycle]));
    const fields = new Map(this.fields().map((field) => [field.id, field]));
    const years = new Map(this.academicYears().map((year) => [year.id, year]));
    const selectedYear = this.selectedAcademicYear();

    return this.formations()
      .filter(
        (formation) => !selectedYear || String(formation.anneeUniversitaireId) === selectedYear,
      )
      .map((formation) => {
        const cycle = cycles.get(formation.cycleId);
        const field = formation.filiereId != null ? fields.get(formation.filiereId) : null;
        const year = years.get(formation.anneeUniversitaireId);

        return {
          id: formation.id,
          name: formation.name,
          cycleId: formation.cycleId,
          fieldId: formation.filiereId ?? null,
          yearId: formation.anneeUniversitaireId,
          cycleName: cycle ? `${cycle.code} - ${cycle.name}` : `Cycle #${formation.cycleId}`,
          fieldName: field ? `${field.code} - ${field.name}` : 'Préparatoire (CP)',
          academicYear: year ? year.name : `Année #${formation.anneeUniversitaireId}`,
        };
      });
  });

  readonly filteredFormations = computed<FormationItem[]>(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const selectedCycle = this.selectedCycle();
    const selectedField = this.selectedField();
    const selectedYear = this.selectedAcademicYear();

    return this.formationViews().filter((formation) => {
      const matchesSearch =
        !query ||
        formation.name.toLowerCase().includes(query) ||
        formation.cycleName.toLowerCase().includes(query) ||
        formation.fieldName.toLowerCase().includes(query) ||
        formation.academicYear.toLowerCase().includes(query);

      const matchesCycle = !selectedCycle || String(selectedCycle) === String(formation.cycleId);
      const matchesField =
        !selectedField ||
        (formation.fieldId != null && String(selectedField) === String(formation.fieldId));
      const matchesYear = !selectedYear || String(selectedYear) === String(formation.yearId);

      return matchesSearch && matchesCycle && matchesField && matchesYear;
    });
  });

  constructor() {
    this.loadReferenceData();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onCycleFilterChange(cycleId: string | null): void {
    this.selectedCycle.set(cycleId);
  }

  onFieldFilterChange(fieldId: string | null): void {
    this.selectedField.set(fieldId);
  }

  onAcademicYearFilterChange(yearId: string | null): void {
    this.academicYearContext.setSelectedAcademicYear(yearId);
  }

  openCreate(): void {
    this.selectedFormation = null;
    this.activeModal = 'create';
  }

  openEdit(formation: FormationItem): void {
    const match = this.formations().find((item) => item.id === formation.id) ?? null;
    this.selectedFormation = match;
    this.activeModal = 'edit';
  }

  openDelete(formation: FormationItem): void {
    const match = this.formations().find((item) => item.id === formation.id) ?? null;
    this.selectedFormation = match;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }

  closeBulkDelete(): void {
    this.isBulkDeleteOpen.set(false);
  }

  onCreate(request: FormationRequest): void {
    this.isLoading.set(true);
    this.formationService
      .create(request)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Formation créée', 'La formation a été ajoutée.');
          this.closeModal();
          this.loadFormations();
        },
        error: () => this.toastService.error('Erreur', "Impossible d'ajouter la formation."),
      });
  }

  onUpdate(request: FormationRequest): void {
    if (!this.selectedFormation) {
      return;
    }

    this.isLoading.set(true);
    this.formationService
      .update(this.selectedFormation.id, request)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Formation mise à jour', 'La formation a été mise à jour.');
          this.closeModal();
          this.loadFormations();
        },
        error: () => this.toastService.error('Erreur', 'Impossible de mettre à jour la formation.'),
      });
  }

  onDelete(): void {
    if (!this.selectedFormation) {
      return;
    }

    this.isLoading.set(true);
    this.formationService
      .delete(this.selectedFormation.id)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success('Formation supprimée', 'La formation a été supprimée.');
          this.closeModal();
          this.loadFormations();
        },
        error: () => this.toastService.error('Erreur', 'Impossible de supprimer la formation.'),
      });
  }

  onBulkDeleteRequested(formations: readonly FormationItem[]): void {
    if (formations.length === 0) {
      return;
    }

    this.bulkDeleteItems.set(formations);
    this.isBulkDeleteOpen.set(true);
  }

  onBulkDeleteConfirmed(): void {
    const formations = this.bulkDeleteItems();
    if (formations.length === 0) {
      this.closeBulkDelete();
      return;
    }

    this.isLoading.set(true);
    forkJoin(formations.map((formation) => this.formationService.delete(formation.id)))
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.toastService.success(
            'Formations supprimées',
            `${formations.length} formation(s) ont été supprimée(s).`,
          );
          this.closeBulkDelete();
          this.bulkDeleteItems.set([]);
          this.loadFormations();
        },
        error: () =>
          this.toastService.error('Erreur', 'Impossible de supprimer les formations.'),
      });
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedCycle.set(null);
    this.selectedField.set(null);
    this.selectedAcademicYear.set(this.academicYearContext.selectedAcademicYearId());
  }

  private loadReferenceData(): void {
    this.isLoading.set(true);
    forkJoin({
      cycles: this.cycleService.getAll(),
      fields: this.filiereService.getAll(),
      academicYears: this.anneeService.getAll(),
      formations: this.formationService.getAll(),
    })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ cycles, fields, academicYears, formations }) => {
          this.cycles.set(cycles);
          this.fields.set(fields);
          this.academicYears.set(academicYears);
          this.academicYearContext.setAcademicYears(academicYears);
          this.formations.set(formations);
        },
        error: () => this.toastService.error('Erreur', 'Impossible de charger les formations.'),
      });
  }

  private loadFormations(): void {
    this.formationService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (formations) => this.formations.set(formations),
        error: () => this.toastService.error('Erreur', 'Impossible de charger les formations.'),
      });
  }
}
