import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';
import { Groupe } from '../../../../../core/structure/models/groupe.model';

@Component({
  selector: 'app-delete-groupe-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer le groupe ?"
      [itemName]="groupe()?.name ?? ''"
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
  readonly groupe = input<Groupe | null>(null);
  readonly confirmDelete = output<void>();
  readonly closeRequested = output<void>();
}
