import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { GroupesList, GroupeItem } from './components/groupes-list';
import { CreateGroupeModal } from './components/create-groupe-modal';
import { EditGroupeModal } from './components/edit-groupe-modal';
import { DeleteGroupeModal } from './components/delete-groupe-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { GroupeService } from '../../../../core/structure/services/groupe.service';
import { FormationService } from '../../../../core/structure/services/formation.service';
import { CycleService } from '../../../../core/structure/services/cycle.service';
import { FiliereService } from '../../../../core/structure/services/filiere.service';
import { AnneeUniversitaireService } from '../../../../core/structure/services/annee-universitaire.service';
import { AcademicYearContextService } from '../../../../core/structure/services/academic-year-context.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Groupe, GroupeRequest } from '../../../../core/structure/models/groupe.model';
import { Formation } from '../../../../core/structure/models/formation.model';
import { Cycle } from '../../../../core/structure/models/cycle.model';
import { Filiere } from '../../../../core/structure/models/filiere.model';
import { AnneeUniversitaire } from '../../../../core/structure/models/annee-universitaire.model';
import { DropdownOption } from '../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-groupes-page',
  standalone: true,
  imports: [
    GroupesList,
    CreateGroupeModal,
    EditGroupeModal,
    DeleteGroupeModal,
    DeleteModal,
  ],
  templateUrl: './groupes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupesPage {
  private readonly groupeService = inject(GroupeService);
  private readonly formationService = inject(FormationService);
  private readonly cycleService = inject(CycleService);
  private readonly filiereService = inject(FiliereService);
  private readonly anneeService = inject(AnneeUniversitaireService);
  private readonly academicYearContext = inject(AcademicYearContextService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchQuery = signal('');
  readonly selectedFormation = signal<string | null>(null);

  readonly isCreateOpen = signal(false);
  readonly isEditOpen = signal(false);
  readonly isDeleteOpen = signal(false);
  readonly editingGroupe = signal<Groupe | null>(null);
  readonly deletingGroupe = signal<Groupe | null>(null);
  readonly bulkDeleteItems = signal<readonly GroupeItem[]>([]);
  readonly isBulkDeleteOpen = signal(false);

  readonly groupes = signal<Groupe[]>([]);
  readonly formations = signal<Formation[]>([]);
  readonly cycles = signal<Cycle[]>([]);
  readonly fields = signal<Filiere[]>([]);
  readonly academicYears = signal<AnneeUniversitaire[]>([]);
  readonly isLoading = signal(false);

  readonly formationLabels = computed(() => {
    const cycleMap = new Map(this.cycles().map((cycle) => [cycle.id, cycle]));
    const fieldMap = new Map(this.fields().map((field) => [field.id, field]));
    // const yearMap = new Map(this.academicYears().map((year) => [year.id, year]));

    const selectedYearId = this.academicYearContext.selectedAcademicYearId();

    return this.formations()
      .filter(
        (formation) =>
          !selectedYearId || String(formation.anneeUniversitaireId) === selectedYearId,
      )
      .map((formation) => ({
        formation,
        label: this.formatFormationLabel(formation, cycleMap, fieldMap),
      }));
  });

  readonly formationOptions = computed<DropdownOption[]>(() =>
    this.formationLabels().map(({ formation, label }) => ({
      value: String(formation.id),
      label,
    }))
  );

  readonly groupeViews = computed<GroupeItem[]>(() => {
    const labelMap = new Map(this.formationLabels().map(({ formation, label }) => [formation.id, label]));

    return this.groupes()
      .filter((groupe) => !this.academicYearContext.selectedAcademicYearId() || labelMap.has(groupe.formationId))
      .map((groupe) => ({
        id: groupe.id,
        name: groupe.name,
        formationId: groupe.formationId,
        formationLabel: labelMap.get(groupe.formationId) ?? `Formation #${groupe.formationId}`,
      }));
  });

  readonly filteredGroupes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const formationFilter = this.selectedFormation();

    return this.groupeViews().filter((groupe) => {
      const matchesSearch =
        !query ||
        groupe.name.toLowerCase().includes(query) ||
        groupe.formationLabel.toLowerCase().includes(query);

      const matchesFormation = !formationFilter || String(groupe.formationId) === String(formationFilter);

      return matchesSearch && matchesFormation;
    });
  });

  constructor() {
    this.loadReferenceData();
  }

  openCreate(): void {
    this.isCreateOpen.set(true);
  }

  openEdit(groupe: GroupeItem): void {
    const match = this.groupes().find((item) => item.id === groupe.id) ?? null;
    this.editingGroupe.set(match);
    this.isEditOpen.set(true);
  }

  openDelete(groupe: GroupeItem): void {
    const match = this.groupes().find((item) => item.id === groupe.id) ?? null;
    this.deletingGroupe.set(match);
    this.isDeleteOpen.set(true);
  }

  closeModal(): void {
    this.isCreateOpen.set(false);
    this.isEditOpen.set(false);
    this.isDeleteOpen.set(false);
    this.editingGroupe.set(null);
    this.deletingGroupe.set(null);
  }

  closeBulkDelete(): void {
    this.isBulkDeleteOpen.set(false);
  }

  onCreate(request: GroupeRequest): void {
    this.isLoading.set(true);
    this.groupeService
      .create(request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Groupe créé', 'Le groupe a été ajouté.');
          this.closeModal();
          this.loadGroupes();
        },
        error: () => this.toastService.error('Erreur', "Impossible d'ajouter le groupe."),
      });
  }

  onUpdate(request: GroupeRequest): void {
    const current = this.editingGroupe();
    if (!current) {
      return;
    }

    this.isLoading.set(true);
    this.groupeService
      .update(current.id, request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Groupe mis à jour', 'Le groupe a été mis à jour.');
          this.closeModal();
          this.loadGroupes();
        },
        error: () => this.toastService.error('Erreur', "Impossible de mettre à jour le groupe."),
      });
  }

  confirmDelete(): void {
    const groupe = this.deletingGroupe();
    if (!groupe) {
      return;
    }

    this.isLoading.set(true);
    this.groupeService
      .delete(groupe.id)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Groupe supprimé', 'Le groupe a été supprimé.');
          this.closeModal();
          this.loadGroupes();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer le groupe."),
      });
  }

  onBulkDeleteRequested(groupes: readonly GroupeItem[]): void {
    if (groupes.length === 0) {
      return;
    }

    this.bulkDeleteItems.set(groupes);
    this.isBulkDeleteOpen.set(true);
  }

  onBulkDeleteConfirmed(): void {
    const groupes = this.bulkDeleteItems();
    if (groupes.length === 0) {
      this.closeBulkDelete();
      return;
    }

    this.isLoading.set(true);
    forkJoin(groupes.map((groupe) => this.groupeService.delete(groupe.id)))
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Groupes supprimés',
            `${groupes.length} groupe(s) ont été supprimé(s).`,
          );
          this.closeBulkDelete();
          this.bulkDeleteItems.set([]);
          this.loadGroupes();
        },
        error: () => this.toastService.error('Erreur', 'Impossible de supprimer les groupes.'),
      });
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedFormation.set(null);
  }

  private loadReferenceData(): void {
    this.isLoading.set(true);
    forkJoin({
      cycles: this.cycleService.getAll(),
      fields: this.filiereService.getAll(),
      academicYears: this.anneeService.getAll(),
      formations: this.formationService.getAll(),
      groupes: this.groupeService.getAll(),
    })
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cycles, fields, academicYears, formations, groupes }) => {
          this.cycles.set(cycles);
          this.fields.set(fields);
          this.academicYears.set(academicYears);
          this.academicYearContext.setAcademicYears(academicYears);
          this.formations.set(formations);
          this.groupes.set(groupes);
        },
        error: () => this.toastService.error('Erreur', 'Impossible de charger les groupes.'),
      });
  }

  private loadGroupes(): void {
    this.groupeService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (groupes) => this.groupes.set(groupes),
        error: () => this.toastService.error('Erreur', 'Impossible de charger les groupes.'),
      });
  }

  private formatFormationLabel(
    formation: Formation,
    cycleMap: Map<number, Cycle>,
    fieldMap: Map<number, Filiere>,
    // yearMap: Map<number, AnneeUniversitaire>
  ): string {
    const cycle = cycleMap.get(formation.cycleId);
    const field = formation.filiereId != null ? fieldMap.get(formation.filiereId) : null;
    // const year = yearMap.get(formation.anneeUniversitaireId);

    const parts = [cycle ? `${cycle.code}` : `Cycle #${formation.cycleId}`];

    if (field) {
      parts.push(`${field.code}`);
    } else if (formation.filiereId != null) {
      parts.push(`Filière #${formation.filiereId}`);
    }

    return parts.join(' • ');
  }
}
