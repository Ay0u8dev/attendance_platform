import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';

export interface DeletableFormation {
  code: string;
}

@Component({
  selector: 'app-delete-formation-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer la formation ?"
      [itemName]="formation()?.code ?? ''"
      confirmMessage="Vous êtes sur le point de supprimer la formation :"
      warningMessage="Tous les groupes et modules associés seront affectés. Assurez-vous que cette formation ne contient aucune donnée critique avant de continuer."
      deleteButtonLabel="Supprimer la formation"
      [open]="open()"
      (closeRequested)="closeRequested.emit()"
      (confirmDelete)="confirmDelete.emit()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteFormationModal {
  readonly open = input(false);
  readonly formation = input<DeletableFormation | null>(null);
  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();
}
