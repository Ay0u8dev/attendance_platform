import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../button/button';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-delete-modal',
  standalone: true,
  imports: [Modal, Button, FormsModule],
  template: `
    <app-modal
      [title]="title()"
      description="Cette action ne peut pas etre annulee."
      [open]="open()"
      size="sm"
      (closed)="closeRequested.emit()"
    >
      <div modal-body class="space-y-4">
        <div class="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/5 p-4">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger">
            <i class="fa-solid fa-triangle-exclamation text-base"></i>
          </div>
          <div>
            <p class="text-sm font-semibold text-danger">Suppression definitive</p>
            <p class="mt-1 text-sm leading-6 text-secondaryText">{{ warningMessage() }}</p>
          </div>
        </div>

        <div class="rounded-xl border border-line bg-surface-subtle px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-secondaryText">
            {{ confirmMessage() }}
          </p>
          <p class="mt-2 break-words text-base font-semibold text-principalText">
            {{ itemName() || 'Element non selectionne' }}
          </p>
        </div>

        @if (requireConfirmation()) {
          <label class="block">
            <span class="text-sm font-semibold text-principalText">
              Tapez <span class="font-bold text-danger">{{ confirmationText() }}</span> pour confirmer.
            </span>
            <input
              type="text"
              [ngModel]="typedConfirmation()"
              (ngModelChange)="typedConfirmation.set($event)"
              class="mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm font-medium text-principalText shadow-sm outline-none transition placeholder:text-muted focus:border-danger focus:ring-2 focus:ring-danger/20"
              autocomplete="off"
            />
          </label>
        }
      </div>

      <div modal-footer class="flex w-full items-center justify-end gap-3">
        <app-button
          label="Annuler"
          variant="outline"
          [fullWidth]="false"
          (clicked)="closeRequested.emit()"
        ></app-button>
        <app-button
          [label]="deleteButtonLabel()"
          icon="fa-solid fa-trash"
          variant="danger"
          [fullWidth]="false"
          [disabled]="!canConfirm()"
          (clicked)="confirm()"
        ></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteModal {
  readonly open = input(false);
  readonly title = input('Supprimer cet element ?');
  readonly itemName = input.required<string>();
  readonly confirmMessage = input('Vous etes sur le point de supprimer :');
  readonly warningMessage = input(
    'Assurez-vous que cet element ne contient aucune donnee critique avant de continuer.',
  );
  readonly deleteButtonLabel = input('Supprimer definitivement');
  readonly requireConfirmation = input(true);
  readonly confirmationText = input('SUPPRIMER');

  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();

  readonly typedConfirmation = signal('');
  readonly canConfirm = computed(
    () =>
      !!this.itemName() &&
      (!this.requireConfirmation() ||
        this.typedConfirmation().trim() === this.confirmationText()),
  );

  private readonly resetOnOpenChange = effect(() => {
    this.open();
    this.itemName();
    this.typedConfirmation.set('');
  });

  confirm(): void {
    if (this.canConfirm()) {
      this.confirmDelete.emit();
    }
  }
}
