import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';

@Component({
  selector: 'app-create-cycle-modal',
  standalone: true,
  imports: [Modal, Button],
  template: `
    <app-modal
      title="Ajouter un cycle"
      description="Créez un nouveau cycle en renseignant les informations ci-dessous."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-5">
        <fieldset class="space-y-2">
          <label for="create-name" class="block text-sm font-medium text-principalText">Libelle du cycle</label>
          <input
            id="create-name"
            #nameInput
            type="text"
            placeholder="Ex: Cycle Préparatoire"
            class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
          />
        </fieldset>
        <fieldset class="space-y-2">
          <label for="create-desc" class="block text-sm font-medium text-principalText">Description</label>
          <textarea
            id="create-desc"
            #descInput
            rows="3"
            placeholder="Résumé du cycle et ses caractéristiques"
            class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
          ></textarea>
        </fieldset>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Créer le cycle" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCycleModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();
}
