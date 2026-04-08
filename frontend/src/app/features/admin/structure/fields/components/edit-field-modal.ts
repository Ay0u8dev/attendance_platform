import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';

export interface EditableField {
  name: string;
  description: string;
}

@Component({
  selector: 'app-edit-field-modal',
  standalone: true,
  imports: [Modal, Button],
  template: `
    <app-modal
      title="Éditer la filière"
      description="Modifiez les informations de la filière sélectionnée."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-5">
        <fieldset class="space-y-2">
          <label for="edit-name" class="block text-sm font-medium text-principalText">Libelle de la filière</label>
          <input
            id="edit-name"
            #nameInput
            type="text"
            [value]="field()?.name ?? ''"
            class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
          />
        </fieldset>
        <fieldset class="space-y-2">
          <label for="edit-desc" class="block text-sm font-medium text-principalText">Description</label>
          <textarea
            id="edit-desc"
            #descInput
            rows="3"
            [value]="field()?.description ?? ''"
            class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
          ></textarea>
        </fieldset>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Enregistrer les modifications" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFieldModal {
  readonly open = input(false);
  readonly field = input<EditableField | null>(null);
  readonly closeRequested = output<void>();
}
