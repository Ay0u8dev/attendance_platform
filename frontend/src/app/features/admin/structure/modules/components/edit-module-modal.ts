import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import { type ModuleItem } from './modules-list';

@Component({
  selector: 'app-edit-module-modal',
  imports: [Modal, Button, ModalFieldGroup],
  template: `
    <app-modal
      title="Modifier le module"
      description="Ajustez les informations du module sélectionné."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-6">
        <app-modal-field-group
          label="Module"
          iconClass="fa-solid fa-layer-group"
          iconBackgroundClass="bg-primary/10 text-primary"
          fieldId="edit-module-name"
        >
          <input
            id="edit-module-name"
            type="text"
            [value]="module()?.name ?? ''"
            placeholder="Nom du module"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Formation"
          iconClass="fa-solid fa-book-open"
          iconBackgroundClass="bg-secondary/10 text-secondary"
          fieldId="edit-module-formation"
        >
          <input
            id="edit-module-formation"
            type="text"
            [value]="module()?.formation ?? ''"
            placeholder="Formation"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 shadow-sm"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Semestre"
          iconClass="fa-solid fa-calendar"
          iconBackgroundClass="bg-warning/10 text-warning"
          fieldId="edit-module-semester"
        >
          <input
            id="edit-module-semester"
            type="text"
            [value]="module()?.semester ?? ''"
            placeholder="Semestre"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-warning focus:bg-surface focus:outline-none focus:ring-2 focus:ring-warning/30 shadow-sm"
          />
        </app-modal-field-group>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end border-t border-line pt-6">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Enregistrer" icon="fa-solid fa-check" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditModuleModal {
  readonly open = input(false);
  readonly module = input<ModuleItem | null>(null);
  readonly closeRequested = output<void>();
}
