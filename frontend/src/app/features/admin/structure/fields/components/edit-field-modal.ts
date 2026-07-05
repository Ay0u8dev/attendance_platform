import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Filiere, FiliereRequest } from '../../../../../core/structure/models/filiere.model';
import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import {
  hasMinimumLength,
  normalizeCode,
  normalizeLabel,
  structureInputClass,
} from '../../../../../shared/structure-form-ui';

@Component({
  selector: 'app-edit-field-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup, FormsModule],
  template: `
    <app-modal
      title="Modifier la filière"
      description="Mettez à jour le code et le libellé de la filière sélectionnée."
      [open]="open()"
      (closed)="close()"
    >
      <form modal-body class="space-y-5">
        <app-modal-field-group
          label="Code de la filière"
          iconClass="fa-solid fa-hashtag"
          iconBackgroundClass="bg-primary-soft text-primary"
          fieldId="edit-field-code"
          helper="Court, sans espace. Exemple : GI"
          [required]="true"
          [error]="codeError()"
        >
          <input
            id="edit-field-code"
            type="text"
            [(ngModel)]="form.code"
            name="code"
            [class]="inputClass(!!codeError())"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Libellé de la filière"
          iconClass="fa-solid fa-bookmark"
          iconBackgroundClass="bg-secondary-soft text-secondary"
          fieldId="edit-field-name"
          [required]="true"
          [error]="nameError()"
        >
          <input
            id="edit-field-name"
            type="text"
            [(ngModel)]="form.name"
            name="name"
            [class]="inputClass(!!nameError())"
          />
        </app-modal-field-group>
      </form>

      <div modal-footer class="flex w-full items-center justify-end gap-3">
        <app-button
          label="Annuler"
          variant="outline"
          [fullWidth]="false"
          (clicked)="close()"
        ></app-button>
        <app-button
          label="Enregistrer"
          icon=""
          variant="primary"
          [fullWidth]="false"
          (clicked)="submit()"
        ></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFieldModal {
  readonly open = input(false);
  readonly field = input<Filiere | null>(null);
  readonly closeRequested = output<void>();
  readonly updateRequested = output<FiliereRequest>();
  readonly submitted = signal(false);

  form: FiliereRequest = { code: '', name: '' };

  private readonly syncForm = effect(() => {
    const value = this.field();
    this.submitted.set(false);
    this.form = value ? { code: value.code, name: value.name } : { code: '', name: '' };
  });

  close(): void {
    this.submitted.set(false);
    this.resetForm();
    this.closeRequested.emit();
  }

  inputClass(invalid: boolean): string {
    return structureInputClass(invalid);
  }

  codeError(): string {
    if (!this.submitted()) {
      return '';
    }

    const code = normalizeCode(this.form.code);
    if (!code) {
      return 'Indiquez le code de la filière.';
    }

    return /^[A-Z0-9-]{2,12}$/.test(code)
      ? ''
      : 'Utilisez 2 à 12 caractères : lettres, chiffres ou tirets.';
  }

  nameError(): string {
    if (!this.submitted()) {
      return '';
    }

    return hasMinimumLength(this.form.name, 3) ? '' : 'Indiquez un libellé de 3 caractères minimum.';
  }

  submit(): void {
    this.submitted.set(true);
    if (this.codeError() || this.nameError()) {
      return;
    }

    this.updateRequested.emit({
      code: normalizeCode(this.form.code),
      name: normalizeLabel(this.form.name),
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.form = { code: '', name: '' };
  }
}
