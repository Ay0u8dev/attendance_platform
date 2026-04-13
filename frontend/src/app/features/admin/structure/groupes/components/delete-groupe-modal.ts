import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';
import { GroupeItem } from './groupes-list';

@Component({
  selector: 'app-delete-groupe-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer le groupe ?"
      [itemName]="groupe()?.code ?? ''"
      confirmMessage="Vous êtes sur le point de supprimer le groupe :"
      warningMessage="Les assignations d'étudiants et l'historique des modifications seront supprimés. Cette action ne peut pas être annulée."
      deleteButtonLabel="Supprimer le groupe"
      [open]="open()"
      (closeRequested)="closeRequested.emit()"
      (confirmDelete)="confirmDelete.emit()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteGroupeModal {
  readonly open = input(false);
  readonly groupe = input<GroupeItem | null>(null);
  readonly confirmDelete = output<void>();
  readonly closeRequested = output<void>();
}
