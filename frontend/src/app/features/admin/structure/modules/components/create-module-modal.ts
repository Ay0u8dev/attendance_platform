import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';

@Component({
  selector: 'app-create-module-modal',
  imports: [Modal, Button, ModalFieldGroup],
  template: `
    <app-modal
      title="Ajouter un module"
      description="Créez un nouveau module pour une formation et un semestre."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-6">
        <app-modal-field-group
          label="Nom du module"
          iconClass="fa-solid fa-layer-group"
          iconBackgroundClass="bg-primary/10 text-primary"
          fieldId="module-name"
        >
          <input
            id="module-name"
            type="text"
            placeholder="Ex: Algorithmique et structures"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Code du module"
          iconClass="fa-solid fa-tag"
          iconBackgroundClass="bg-secondary/10 text-secondary"
          fieldId="module-code"
        >
          <input
            id="module-code"
            type="text"
            placeholder="Ex: ALG-101"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 shadow-sm"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Crédits et volume"
          iconClass="fa-solid fa-chart-column"
          iconBackgroundClass="bg-warning/10 text-warning"
          fieldId="module-credits"
        >
          <div class="grid gap-3 sm:grid-cols-2">
            <input
              id="module-credits"
              type="number"
              min="0"
              placeholder="Crédits"
              class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-warning focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning/30 shadow-sm"
            />
            <input
              id="module-hours"
              type="number"
              min="0"
              placeholder="Heures"
              class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-warning focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning/30 shadow-sm"
            />
          </div>
        </app-modal-field-group>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end border-t border-line pt-6">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Créer le module" icon="fa-solid fa-plus" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateModuleModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();
}
