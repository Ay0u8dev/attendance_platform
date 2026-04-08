import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';

export interface DeletableField {
  name: string;
}

@Component({
  selector: 'app-delete-field-modal',
  standalone: true,
  imports: [Modal, Button],
  template: `
    <app-modal
      title="Supprimer la filière ?"
      description="Cette action ne peut pas être annulée."
      [open]="open()"
      size="sm"
      (closed)="closeRequested.emit()"
    >
      <div modal-body class="space-y-4">
        <div class="rounded-lg border border-danger-soft bg-danger-soft bg-opacity-40 px-4 py-3">
          <p class="text-sm text-principalText">
            Vous êtes sur le point de supprimer la filière :
          </p>
          <p class="mt-2 text-base font-medium text-principalText">{{ field()?.name }}</p>
        </div>
        <p class="text-sm text-secondaryText">
          Assurez-vous que cet élément ne contient aucune donnée critique avant de continuer.
        </p>
      </div>
      <div modal-footer class="flex w-full items-center gap-3 justify-end">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Supprimer définitivement" variant="danger" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteFieldModal {
  readonly open = input(false);
  readonly field = input<DeletableField | null>(null);
  readonly closeRequested = output<void>();
}
