import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';
import { type Cycle } from '../../../../../core/structure/models/cycle.model';

@Component({
  selector: 'app-delete-cycle-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer le cycle ?"
      [itemName]="cycle()?.name ?? ''"
      confirmMessage="Vous êtes sur le point de supprimer le cycle :"
      warningMessage="Assurez-vous que ce cycle ne contient aucune donnée critique avant de continuer."
      deleteButtonLabel="Supprimer le cycle"
      [open]="open()"
      (closeRequested)="closeRequested.emit()"
      (confirmDelete)="confirmDelete.emit()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteCycleModal {
  readonly open = input(false);
  readonly cycle = input<Cycle | null>(null);
  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();
}
