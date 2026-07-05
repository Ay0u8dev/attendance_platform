import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { AcademicYearList } from './components/academic-year-list';
import { CreateAcademicYearModal } from './components/create-academic-year-modal';
import { EditAcademicYearModal } from './components/edit-academic-year-modal';
import { DeleteAcademicYearModal } from './components/delete-academic-year-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { AnneeUniversitaireService } from '../../../../core/structure/services/annee-universitaire.service';
import { AcademicYearContextService } from '../../../../core/structure/services/academic-year-context.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AnneeUniversitaire, AnneeUniversitaireRequest } from '../../../../core/structure/models/annee-universitaire.model';

@Component({
  selector: 'app-academic-year-page',
  imports: [
    AcademicYearList,
    CreateAcademicYearModal,
    EditAcademicYearModal,
    DeleteAcademicYearModal,
    DeleteModal,
  ],
  templateUrl: './academic-year.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicYearPage {
  private readonly service = inject(AnneeUniversitaireService);
  private readonly academicYearContext = inject(AcademicYearContextService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedYear: AnneeUniversitaire | null = null;
  readonly searchQuery = signal('');
  readonly selectedStatus = signal<string | null>(null);
  readonly academicYears = signal<AnneeUniversitaire[]>([]);
  readonly isLoading = signal(false);
  readonly bulkDeleteItems = signal<readonly AnneeUniversitaire[]>([]);
  readonly isBulkDeleteOpen = signal(false);

  readonly filteredAcademicYears = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.selectedStatus();

    return this.academicYears().filter((year) => {
      const statusLabel = year.active ? 'active' : 'inactive';
      const matchesSearch =
        !query ||
        year.name.toLowerCase().includes(query) ||
        statusLabel.includes(query);
      const matchesStatus = !status || statusLabel === status;

      return matchesSearch && matchesStatus;
    });
  });

  constructor() {
    this.loadAcademicYears();
  }

  openCreate(): void {
    this.selectedYear = null;
    this.activeModal = 'create';
  }

  openEdit(year: AnneeUniversitaire): void {
    this.selectedYear = year;
    this.activeModal = 'edit';
  }

  openDelete(year: AnneeUniversitaire): void {
    this.selectedYear = year;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }

  closeBulkDelete(): void {
    this.isBulkDeleteOpen.set(false);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedStatus.set(null);
  }

  onCreate(request: AnneeUniversitaireRequest): void {
    this.isLoading.set(true);
    this.service
      .create(request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Année créée', "L'année académique a été ajoutée.");
          this.closeModal();
          this.loadAcademicYears();
        },
        error: () => this.toastService.error('Erreur', "Impossible d'ajouter l'année."),
      });
  }

  onUpdate(request: AnneeUniversitaireRequest): void {
    if (!this.selectedYear) {
      return;
    }

    this.isLoading.set(true);
    this.service
      .update(this.selectedYear.id, request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Année mise à jour', "Les informations ont été enregistrées.");
          this.closeModal();
          this.loadAcademicYears();
        },
        error: () => this.toastService.error('Erreur', "Impossible de mettre à jour l'année."),
      });
  }

  onDelete(): void {
    if (!this.selectedYear) {
      return;
    }

    this.isLoading.set(true);
    this.service
      .delete(this.selectedYear.id)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Année supprimée', "L'année académique a été supprimée.");
          this.closeModal();
          this.loadAcademicYears();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer l'année."),
      });
  }

  onBulkDeleteRequested(years: readonly AnneeUniversitaire[]): void {
    if (years.length === 0) {
      return;
    }

    this.bulkDeleteItems.set(years);
    this.isBulkDeleteOpen.set(true);
  }

  onBulkDeleteConfirmed(): void {
    const years = this.bulkDeleteItems();
    if (years.length === 0) {
      this.closeBulkDelete();
      return;
    }

    this.isLoading.set(true);
    forkJoin(years.map((year) => this.service.delete(year.id)))
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Années supprimées',
            `${years.length} année(s) ont été supprimée(s).`,
          );
          this.closeBulkDelete();
          this.bulkDeleteItems.set([]);
          this.loadAcademicYears();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer les années."),
      });
  }

  private loadAcademicYears(): void {
    this.isLoading.set(true);
    this.service
      .getAll()
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (years) => {
          this.academicYears.set(years);
          this.academicYearContext.setAcademicYears(years);
        },
        error: () => this.toastService.error('Erreur', "Impossible de charger les années académiques."),
      });
  }
}
