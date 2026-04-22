import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import { type AcademicYearItem } from './academic-year-list';

@Component({
  selector: 'app-edit-academic-year-modal',
  imports: [Modal, Button, ModalFieldGroup],
  template: `
    <app-modal
      title="Modifier l'année académique"
      description="Mettez à jour la période et les paramètres associés."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-6">
        <app-modal-field-group
          label="Libellé"
          iconClass="fa-solid fa-calendar-check"
          iconBackgroundClass="bg-primary/10 text-primary"
          fieldId="edit-year-label"
        >
          <input
            id="edit-year-label"
            type="text"
            [value]="year()?.label ?? ''"
            placeholder="Libellé"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Période"
          iconClass="fa-solid fa-calendar"
          iconBackgroundClass="bg-secondary/10 text-secondary"
          fieldId="edit-year-period"
        >
          <input
            id="edit-year-period"
            type="text"
            [value]="year()?.period ?? ''"
            placeholder="Période"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 shadow-sm"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Semestres"
          iconClass="fa-solid fa-layer-group"
          iconBackgroundClass="bg-warning/10 text-warning"
          fieldId="edit-year-terms"
        >
          <input
            id="edit-year-terms"
            type="number"
            min="1"
            [value]="year()?.terms ?? ''"
            placeholder="Nombre de semestres"
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
export class EditAcademicYearModal {
  readonly open = input(false);
  readonly year = input<AcademicYearItem | null>(null);
  readonly closeRequested = output<void>();
}
