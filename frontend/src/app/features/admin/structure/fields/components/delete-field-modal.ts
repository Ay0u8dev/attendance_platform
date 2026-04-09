import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';

export interface DeletableField {
  name: string;
}

@Component({
  selector: 'app-delete-field-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer la filière ?"
      [itemName]="field()?.name ?? ''"
      confirmMessage="Vous êtes sur le point de supprimer la filière :"
      warningMessage="Assurez-vous que cette filière ne contient aucune donnée critique avant de continuer."
      deleteButtonLabel="Supprimer la filière"
      [open]="open()"
      (closeRequested)="closeRequested.emit()"
      (confirmDelete)="confirmDelete.emit()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteFieldModal {
  readonly open = input(false);
  readonly field = input<DeletableField | null>(null);
  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();
}
