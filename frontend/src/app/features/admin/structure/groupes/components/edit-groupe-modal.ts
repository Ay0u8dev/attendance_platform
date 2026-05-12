import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { Groupe, GroupeRequest } from '../../../../../core/structure/models/groupe.model';
import { normalizeLabel, structureInputClass } from '../../../../../shared/structure-form-ui';

@Component({
  selector: 'app-edit-groupe-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup, FormsModule, DropdownFilter],
  template: `
    <app-modal
      title="Modifier le groupe"
      description="Mettez à jour le libellé et la formation de rattachement."
      [open]="open()"
      size="md"
      (closed)="close()"
    >
      <form modal-body class="space-y-5">
        <app-modal-field-group
          label="Nom du groupe"
          iconClass="fa-solid fa-users"
          iconBackgroundClass="bg-primary-soft text-primary"
          fieldId="edit-groupe-name"
          [required]="true"
          [error]="nameError()"
        >
          <input
            id="edit-groupe-name"
            type="text"
            [(ngModel)]="groupName"
            name="name"
            [class]="inputClass(!!nameError())"
          />
        </app-modal-field-group>

        <app-dropdown-filter
          identifier="edit-groupe-formation"
          label="Formation"
          allLabel="Sélectionnez une formation"
          [options]="formationOptions()"
          [value]="selectedFormation()"
          [required]="true"
          [error]="submitted() && !selectedFormation() ? 'Sélectionnez une formation.' : ''"
          iconClass="fa-solid fa-book-open"
          iconBackgroundClass="bg-secondary-soft text-secondary"
          iconColor="secondary"
          (filterChange)="selectedFormation.set($event)"
        ></app-dropdown-filter>
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
export class EditGroupeModal {
  readonly open = input(false);
  readonly groupe = input<Groupe | null>(null);
  readonly closeRequested = output<void>();
  readonly updateRequested = output<GroupeRequest>();
  readonly formationOptions = input.required<DropdownOption[]>();

  groupName = '';
  readonly selectedFormation = signal<string | null>(null);
  readonly submitted = signal(false);

  private readonly syncForm = effect(() => {
    const value = this.groupe();
    this.submitted.set(false);
    if (!value) {
      this.groupName = '';
      this.selectedFormation.set(null);
      return;
    }
    this.groupName = value.name;
    this.selectedFormation.set(String(value.formationId));
  });

  close(): void {
    this.submitted.set(false);
    this.resetForm();
    this.closeRequested.emit();
  }

  inputClass(invalid: boolean): string {
    return structureInputClass(invalid);
  }

  nameError(): string {
    if (!this.submitted()) {
      return '';
    }

    return normalizeLabel(this.groupName).length >= 2
      ? ''
      : 'Indiquez un nom de groupe de 2 caractères minimum.';
  }

  submit(): void {
    this.submitted.set(true);
    if (this.nameError() || !this.selectedFormation()) {
      return;
    }

    this.updateRequested.emit({
      name: normalizeLabel(this.groupName),
      formationId: Number(this.selectedFormation()),
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.groupName = '';
    this.selectedFormation.set(null);
  }
}
