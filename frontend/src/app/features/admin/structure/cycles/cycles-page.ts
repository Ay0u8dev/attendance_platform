import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { CyclesList } from './components/cycles-list';
import { CreateCycleModal } from './components/create-cycle-modal';
import { EditCycleModal } from './components/edit-cycle-modal';
import { DeleteCycleModal } from './components/delete-cycle-modal';
import { DeleteModal } from '../../../../shared/components/delete-modal/delete-modal';
import { CycleService } from '../../../../core/structure/services/cycle.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { Cycle, CycleRequest } from '../../../../core/structure/models/cycle.model';

@Component({
  selector: 'app-cycles-page',
  imports: [
    CyclesList,
    CreateCycleModal,
    EditCycleModal,
    DeleteCycleModal,
    DeleteModal,
  ],
  templateUrl: './cycles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CyclesPage {
  private readonly service = inject(CycleService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedCycle: Cycle | null = null;
  readonly searchQuery = signal('');
  readonly selectedType = signal<string | null>(null);
  readonly cycles = signal<Cycle[]>([]);
  readonly isLoading = signal(false);
  readonly bulkDeleteItems = signal<readonly Cycle[]>([]);
  readonly isBulkDeleteOpen = signal(false);

  readonly filteredCycles = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.selectedType();

    return this.cycles().filter((cycle) => {
      const typeLabel = this.typeLabel(cycle.type).toLowerCase();
      const matchesSearch =
        !query ||
        cycle.code.toLowerCase().includes(query) ||
        cycle.name.toLowerCase().includes(query) ||
        typeLabel.includes(query);
      const matchesType = !type || cycle.type === type;

      return matchesSearch && matchesType;
    });
  });

  constructor() {
    this.loadCycles();
  }

  openCreate(): void {
    this.selectedCycle = null;
    this.activeModal = 'create';
  }

  openEdit(cycle: Cycle): void {
    this.selectedCycle = cycle;
    this.activeModal = 'edit';
  }

  openDelete(cycle: Cycle): void {
    this.selectedCycle = cycle;
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
    this.selectedType.set(null);
  }

  typeLabel(type: Cycle['type']): string {
    return type === 'PREPA' ? 'Preparatoire' : 'Ingenieur';
  }

  onCreate(request: CycleRequest): void {
    this.isLoading.set(true);
    this.service
      .create(request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Cycle créé', 'Le cycle a été ajouté.');
          this.closeModal();
          this.loadCycles();
        },
        error: () => this.toastService.error('Erreur', "Impossible d'ajouter le cycle."),
      });
  }

  onUpdate(request: CycleRequest): void {
    if (!this.selectedCycle) {
      return;
    }

    this.isLoading.set(true);
    this.service
      .update(this.selectedCycle.id, request)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Cycle mis à jour', 'Le cycle a été mis à jour.');
          this.closeModal();
          this.loadCycles();
        },
        error: () => this.toastService.error('Erreur', "Impossible de mettre à jour le cycle."),
      });
  }

  onDelete(): void {
    if (!this.selectedCycle) {
      return;
    }

    this.isLoading.set(true);
    this.service
      .delete(this.selectedCycle.id)
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success('Cycle supprimé', 'Le cycle a été supprimé.');
          this.closeModal();
          this.loadCycles();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer le cycle."),
      });
  }

  onBulkDeleteRequested(cycles: readonly Cycle[]): void {
    if (cycles.length === 0) {
      return;
    }

    this.bulkDeleteItems.set(cycles);
    this.isBulkDeleteOpen.set(true);
  }

  onBulkDeleteConfirmed(): void {
    const cycles = this.bulkDeleteItems();
    if (cycles.length === 0) {
      this.closeBulkDelete();
      return;
    }

    this.isLoading.set(true);
    forkJoin(cycles.map((cycle) => this.service.delete(cycle.id)))
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toastService.success(
            'Cycles supprimés',
            `${cycles.length} cycle(s) ont été supprimé(s).`,
          );
          this.closeBulkDelete();
          this.bulkDeleteItems.set([]);
          this.loadCycles();
        },
        error: () => this.toastService.error('Erreur', "Impossible de supprimer les cycles."),
      });
  }

  private loadCycles(): void {
    this.isLoading.set(true);
    this.service
      .getAll()
      .pipe(finalize(() => this.isLoading.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cycles) => this.cycles.set(cycles),
        error: () => this.toastService.error('Erreur', "Impossible de charger les cycles."),
      });
  }
}
