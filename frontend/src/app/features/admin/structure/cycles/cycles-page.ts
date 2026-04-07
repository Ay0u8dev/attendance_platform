import { ChangeDetectionStrategy, Component } from '@angular/core';

import { CyclesHeader } from './components/cycles-header';
import { CyclesList, type CycleItem } from './components/cycles-list';
import { CreateCycleModal } from './components/create-cycle-modal';
import { EditCycleModal } from './components/edit-cycle-modal';
import { DeleteCycleModal } from './components/delete-cycle-modal';

@Component({
  selector: 'app-cycles-page',
  imports: [
    CyclesHeader,
    CyclesList,
    CreateCycleModal,
    EditCycleModal,
    DeleteCycleModal,
  ],
  templateUrl: './cycles.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CyclesPage {
  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedCycle: CycleItem | null = null;

  readonly cycles: CycleItem[] = [
    {
      id: 'cp',
      code: 'CP',
      name: 'Cycle Préparatoire',
      description: 'Parcours d\'entrée pour les fondamentaux.',
      tracks: 8,
      students: 450,
      badgeClass: 'bg-secondary-soft text-secondary',
      barClass: 'bg-secondary',
      lastUpdated: new Date('2026-04-05'),
    },
    {
      id: 'ing',
      code: 'ING',
      name: 'Cycle Ingénieur',
      description: 'Parcours long pour la spécialisation.',
      tracks: 12,
      students: 820,
      badgeClass: 'bg-primary-soft text-primary',
      barClass: 'bg-primary',
      lastUpdated: new Date('2026-04-05'),
    },
  ];

  openCreate(): void {
    this.selectedCycle = null;
    this.activeModal = 'create';
  }

  openEdit(cycle: CycleItem): void {
    this.selectedCycle = cycle;
    this.activeModal = 'edit';
  }

  openDelete(cycle: CycleItem): void {
    this.selectedCycle = cycle;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }
}
