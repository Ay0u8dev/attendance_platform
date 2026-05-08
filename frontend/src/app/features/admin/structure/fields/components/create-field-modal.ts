import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { FiliereRequest } from '../../../../../core/structure/models/filiere.model';
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
  selector: 'app-create-field-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup, FormsModule],
  template: `
    <app-modal
      title="Ajouter une filière"
      description="Créez une nouvelle filière avec un code court et un libellé officiel."
      [open]="open()"
      (closed)="close()"
    >
      <form modal-body class="space-y-5">
        <app-modal-field-group
          label="Code de la filière"
          iconClass="fa-solid fa-hashtag"
          iconBackgroundClass="bg-primary-soft text-primary"
          fieldId="create-field-code"
          helper="Court, sans espace. Exemple : GI"
          [required]="true"
          [error]="codeError()"
        >
          <input
            id="create-field-code"
            type="text"
            placeholder="Ex: GI"
            [(ngModel)]="form.code"
            name="code"
            [class]="inputClass(!!codeError())"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Libellé de la filière"
          iconClass="fa-solid fa-bookmark"
          iconBackgroundClass="bg-secondary-soft text-secondary"
          fieldId="create-field-name"
          [required]="true"
          [error]="nameError()"
        >
          <input
            id="create-field-name"
            type="text"
            placeholder="Ex: Génie informatique"
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
          label="Créer la filière"
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
export class CreateFieldModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();
  readonly createRequested = output<FiliereRequest>();
  readonly submitted = signal(false);

  form: FiliereRequest = {
    code: '',
    name: '',
  };

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

    this.createRequested.emit({
      code: normalizeCode(this.form.code),
      name: normalizeLabel(this.form.name),
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.form = {
      code: '',
      name: '',
    };
  }
}
