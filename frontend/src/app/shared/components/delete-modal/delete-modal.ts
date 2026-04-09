import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Button } from '../button/button';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [Modal, Button],
  template: `
    <app-modal
      [title]="title()"
      description="Cette action ne peut pas être annulée."
      [open]="open()"
      size="sm"
      (closed)="closeRequested.emit()"
    >
      <div modal-body class="space-y-4">
        <!-- Warning Icon -->
        <div class="flex justify-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
            <i class="fa-solid fa-triangle-exclamation text-2xl text-danger"></i>
          </div>
        </div>

        <!-- Item to Delete -->
        <div class="rounded-xl border border-danger/30 bg-gradient-to-r from-danger/5 to-danger/0 px-4 py-3">
          <p class="text-xs uppercase tracking-wide text-secondaryText font-semibold">
            {{ confirmMessage() }}
          </p>
          <p class="mt-2 text-base font-bold text-principalText">{{ itemName() }}</p>
        </div>

        <!-- Warning Message -->
        <div class="rounded-lg bg-warning/5 border border-warning/20 px-4 py-3">
          <p class="text-sm text-secondaryText">
            {{ warningMessage() }}
          </p>
        </div>
      </div>
      <div modal-footer class="flex w-full items-center gap-3 justify-end border-t border-line pt-6">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button [label]="deleteButtonLabel()" icon="fa-solid fa-trash" variant="danger" [fullWidth]="false" (clicked)="confirmDelete.emit()"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteModal {
  readonly open = input(false);
  readonly title = input('Supprimer cet élément ?');
  readonly itemName = input.required<string>();
  readonly confirmMessage = input('Vous êtes sur le point de supprimer :');
  readonly warningMessage = input('Assurez-vous que cet élément ne contient aucune donnée critique avant de continuer.');
  readonly deleteButtonLabel = input('Supprimer définitivement');
  
  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();
}
