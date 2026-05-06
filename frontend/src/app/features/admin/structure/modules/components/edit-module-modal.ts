import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import {
  DropdownFilter,
  DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { Module, ModuleRequest } from '../../../../../core/structure/models/module.model';
import {
  normalizeCode,
  normalizeLabel,
  structureInputClass,
} from '../../../../../shared/structure-form-ui';

@Component({
  selector: 'app-edit-module-modal',
  imports: [Modal, Button, ModalFieldGroup, DropdownFilter, FormsModule],
  template: `
    <app-modal
      title="Modifier le module"
      description="Ajustez les informations pedagogiques et la formation de rattachement."
      [open]="open()"
      size="lg"
      (closed)="close()"
    >
      <form modal-body class="grid gap-5 md:grid-cols-2">
        <app-modal-field-group
          label="Nom du module"
          iconClass="fa-solid fa-layer-group"
          iconBackgroundClass="bg-primary-soft text-primary"
          fieldId="edit-module-name"
          [required]="true"
          [error]="nameError()"
        >
          <input
            id="edit-module-name"
            type="text"
            [(ngModel)]="form.name"
            name="name"
            [class]="inputClass(!!nameError())"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Code du module"
          iconClass="fa-solid fa-tag"
          iconBackgroundClass="bg-secondary-soft text-secondary"
          fieldId="edit-module-code"
          [required]="true"
          [error]="codeError()"
        >
          <input
            id="edit-module-code"
            type="text"
            [(ngModel)]="form.code"
            name="code"
            [class]="inputClass(!!codeError())"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Semestre"
          iconClass="fa-solid fa-calendar"
          iconBackgroundClass="bg-warning-soft text-warning"
          fieldId="edit-module-semester"
          [error]="semesterError()"
        >
          <input
            id="edit-module-semester"
            type="number"
            min="1"
            [(ngModel)]="form.semester"
            name="semester"
            [class]="inputClass(!!semesterError())"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Volume horaire"
          iconClass="fa-solid fa-clock"
          iconBackgroundClass="bg-surface-muted text-secondaryText"
          fieldId="edit-module-hours"
          [error]="hoursError()"
        >
          <input
            id="edit-module-hours"
            type="number"
            min="0"
            [(ngModel)]="form.hours"
            name="hours"
            [class]="inputClass(!!hoursError())"
          />
        </app-modal-field-group>

        <div class="md:col-span-2">
          <app-dropdown-filter
            identifier="edit-module-formation"
            label="Formation"
            allLabel="Sélectionnez une formation"
            [options]="formationOptions()"
            [value]="selectedFormation()"
            [required]="true"
            [error]="submitted() && !selectedFormation() ? 'Sélectionnez une formation.' : ''"
            iconClass="fa-solid fa-book-open"
            iconBackgroundClass="bg-primary-soft text-primary"
            iconColor="primary"
            (filterChange)="selectedFormation.set($event)"
          ></app-dropdown-filter>
        </div>
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
          variant="primary"
          [fullWidth]="false"
          (clicked)="submit()"
        ></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditModuleModal {
  readonly open = input(false);
  readonly module = input<Module | null>(null);
  readonly closeRequested = output<void>();
  readonly updateRequested = output<ModuleRequest>();
  readonly formationOptions = input.required<DropdownOption[]>();

  readonly selectedFormation = signal<string | null>(null);
  readonly submitted = signal(false);
  form: ModuleRequest = {
    name: '',
    code: '',
    semester: null,
    hours: null,
    formationId: 0,
  };

  private readonly syncForm = effect(() => {
    const value = this.module();
    this.submitted.set(false);
    if (!value) {
      this.form = { name: '', code: '', semester: null, hours: null, formationId: 0 };
      this.selectedFormation.set(null);
      return;
    }
    this.form = {
      name: value.name,
      code: value.code,
      semester: value.semester ?? null,
      hours: value.hours ?? null,
      formationId: value.formationId,
    };
    this.selectedFormation.set(String(value.formationId));
  });

  inputClass(invalid: boolean): string {
    return structureInputClass(invalid);
  }

  nameError(): string {
    return this.submitted() && !this.form.name.trim() ? 'Indiquez le nom du module.' : '';
  }

  codeError(): string {
    if (!this.submitted()) {
      return '';
    }

    const code = normalizeCode(this.form.code);
    if (!code) {
      return 'Indiquez le code du module.';
    }

    return /^[A-Z0-9-]{2,20}$/.test(code)
      ? ''
      : 'Utilisez 2 à 20 caractères : lettres, chiffres ou tirets.';
  }

  semesterError(): string {
    if (!this.submitted() || this.form.semester == null) {
      return '';
    }

    const semester = Number(this.form.semester);
    return Number.isInteger(semester) && semester >= 1 && semester <= 12
      ? ''
      : 'Le semestre doit être un entier entre 1 et 12.';
  }

  hoursError(): string {
    if (!this.submitted() || this.form.hours == null) {
      return '';
    }

    const hours = Number(this.form.hours);
    return Number.isInteger(hours) && hours >= 0 && hours <= 999
      ? ''
      : 'Le volume horaire doit être un entier entre 0 et 999.';
  }

  close(): void {
    this.submitted.set(false);
    this.resetForm();
    this.closeRequested.emit();
  }

  submit(): void {
    this.submitted.set(true);
    if (
      this.nameError() ||
      this.codeError() ||
      this.semesterError() ||
      this.hoursError() ||
      !this.selectedFormation()
    ) {
      return;
    }

    this.updateRequested.emit({
      ...this.form,
      name: normalizeLabel(this.form.name),
      code: normalizeCode(this.form.code),
      formationId: Number(this.selectedFormation()),
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.form = { name: '', code: '', semester: null, hours: null, formationId: 0 };
    this.selectedFormation.set(null);
  }
}
