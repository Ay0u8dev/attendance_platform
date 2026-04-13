import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';

@Component({
  selector: 'app-create-cycle-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup],
  template: `
    <app-modal
      title="Ajouter un cycle"
      description="Créez un nouveau cycle en renseignant les informations ci-dessous."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-6">
        <!-- Name Field -->
        <app-modal-field-group
          label="Libellé du cycle"
          iconClass="fa-solid fa-circle-play"
          iconBackgroundClass="bg-primary/10 text-primary"
          fieldId="create-name"
        >
          <input
            id="create-name"
            #nameInput
            type="text"
            placeholder="Ex: Cycle Préparatoire"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </app-modal-field-group>

        <!-- Description Field -->
        <app-modal-field-group
          label="Description"
          iconClass="fa-solid fa-file-lines"
          iconBackgroundClass="bg-secondary/10 text-secondary"
          fieldId="create-desc"
        >
          <textarea
            id="create-desc"
            #descInput
            rows="4"
            placeholder="Résumé du cycle et ses caractéristiques"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 shadow-sm"
          ></textarea>
        </app-modal-field-group>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end border-t border-line pt-6">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Créer le cycle" icon="fa-solid fa-plus" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCycleModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();
}
