import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { type AcademicYearItem } from './academic-year-list';

@Component({
  selector: 'app-delete-academic-year-modal',
  imports: [Modal, Button],
  template: `
    <app-modal
      title="Supprimer l'année académique"
      description="Cette action est définitive. Confirmez la suppression."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <div modal-body class="space-y-4">
        <div class="rounded-2xl border border-line bg-surface-subtle p-4">
          <p class="text-sm font-semibold text-principalText">Année concernée</p>
          <p class="mt-1 text-sm text-secondaryText">{{ year()?.label ?? 'Année non sélectionnée' }}</p>
        </div>
        <p class="text-sm text-secondaryText">
          Les formations associées resteront visibles, mais l'année ne pourra plus être activée.
        </p>
      </div>
      <div modal-footer class="flex w-full items-center gap-3 justify-end border-t border-line pt-6">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Supprimer" icon="fa-solid fa-trash-can" variant="danger" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAcademicYearModal {
  readonly open = input(false);
  readonly year = input<AcademicYearItem | null>(null);
  readonly closeRequested = output<void>();
}
