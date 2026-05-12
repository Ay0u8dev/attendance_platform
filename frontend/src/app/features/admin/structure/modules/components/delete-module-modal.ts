import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { type Module } from '../../../../../core/structure/models/module.model';
import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';

@Component({
  selector: 'app-delete-module-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer le module ?"
      [itemName]="module()?.name ?? ''"
      confirmMessage="Module concerne"
      warningMessage="Le module ne sera plus disponible dans la structure pedagogique. Verifiez les affectations avant de continuer."
      deleteButtonLabel="Supprimer le module"
      [open]="open()"
      (closeRequested)="closeRequested.emit()"
      (confirmDelete)="confirmDelete.emit()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteModuleModal {
  readonly open = input(false);
  readonly module = input<Module | null>(null);
  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();
}
