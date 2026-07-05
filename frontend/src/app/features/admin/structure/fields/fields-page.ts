import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { FieldsList } from './components/fields-list';
import { CreateFieldModal } from './components/create-field-modal';
import { EditFieldModal } from './components/edit-field-modal';
import { DeleteFieldModal } from './components/delete-field-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { FiliereService } from '../../../../core/structure/services/filiere.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Filiere, FiliereRequest } from '../../../../core/structure/models/filiere.model';

@Component({
  selector: 'app-fields-page',
  imports: [
    FieldsList,
    CreateFieldModal,
    EditFieldModal,
    DeleteFieldModal,
    DeleteModal,
  ],
  templateUrl: './fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsPage {
  private readonly service = inject(FiliereService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedField: Filiere | null = null;
  readonly searchQuery = signal('');
  readonly fields = signal<Filiere[]>([]);
  readonly isLoading = signal(false);
  readonly bulkDeleteItems = signal<readonly Filiere[]>([]);
  readonly isBulkDeleteOpen = signal(false);

  readonly filteredFields = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();

    return this.fields().filter(
      (field) =>
        !query ||
        field.code.toLowerCase().includes(query) ||
        field.name.toLowerCase().includes(query),
    );
  });

  constructor() {
    this.loadFields();
  }

  openCreate(): void {
    this.selectedField = null;
    this.activeModal = 'create';
  }

  openEdit(field: Filiere): void {
    this.selectedField = field;
    this.activeModal = 'edit';
  }

  openDelete(field: Filiere): void {
    this.selectedField = field;
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
  }

  onCreate(request: FiliereRequest): void {
    this.isLoading.set(true);
    this.service
      .create(request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Filière créée', 'La filière a été ajoutée.');
          this.closeModal();
          this.loadFields();
        },
        error: () => this.toastService.error('Erreur', "Impossible d'ajouter la filière."),
      });
  }

  onUpdate(request: FiliereRequest): void {
    if (!this.selectedField) {
      return;
    }

    this.isLoading.set(true);
    this.service
      .update(this.selectedField.id, request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Filière mise à jour', 'La filière a été mise à jour.');
          this.closeModal();
          this.loadFields();
        },
        error: () => this.toastService.error('Erreur', "Impossible de mettre à jour la filière."),
      });
  }

  onDelete(): void {
    if (!this.selectedField) {
      return;
    }

    this.isLoading.set(true);
    this.service
      .delete(this.selectedField.id)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Filière supprimée', 'La filière a été supprimée.');
          this.closeModal();
          this.loadFields();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer la filière."),
      });
  }

  onBulkDeleteRequested(fields: readonly Filiere[]): void {
    if (fields.length === 0) {
      return;
    }

    this.bulkDeleteItems.set(fields);
    this.isBulkDeleteOpen.set(true);
  }

  onBulkDeleteConfirmed(): void {
    const fields = this.bulkDeleteItems();
    if (fields.length === 0) {
      this.closeBulkDelete();
      return;
    }

    this.isLoading.set(true);
    forkJoin(fields.map((field) => this.service.delete(field.id)))
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Filières supprimées',
            `${fields.length} filière(s) ont été supprimée(s).`,
          );
          this.closeBulkDelete();
          this.bulkDeleteItems.set([]);
          this.loadFields();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer les filières."),
      });
  }

  private loadFields(): void {
    this.isLoading.set(true);
    this.service
      .getAll()
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fields) => this.fields.set(fields),
        error: () => this.toastService.error('Erreur', "Impossible de charger les filières."),
      });
  }
}
