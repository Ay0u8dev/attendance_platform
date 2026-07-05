import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { GroupeRequest } from '../../../../../core/structure/models/groupe.model';
import { normalizeLabel, structureInputClass } from '../../../../../shared/structure-form-ui';

@Component({
  selector: 'app-create-groupe-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup, DropdownFilter, FormsModule],
  template: `
    <app-modal
      title="Ajouter un groupe"
      description="Créez un groupe et rattachez-le à une formation existante."
      [open]="open()"
      size="md"
      (closed)="close()"
    >
      <form modal-body class="space-y-5">
        <app-modal-field-group
          label="Nom du groupe"
          iconClass="fa-solid fa-users"
          iconBackgroundClass="bg-primary-soft text-primary"
          fieldId="create-groupe-name"
          [required]="true"
          [error]="nameError()"
        >
          <input
            id="create-groupe-name"
            type="text"
            placeholder="Ex: Groupe A"
            [(ngModel)]="groupName"
            name="name"
            [class]="inputClass(!!nameError())"
          />
        </app-modal-field-group>

        <app-dropdown-filter
          identifier="create-groupe-formation"
          label="Formation"
          allLabel="Sélectionnez une formation"
          helper="Le groupe hérite du cycle, de la filière et de l'année de la formation choisie."
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
          label="Créer le groupe"
          variant="primary"
          [fullWidth]="false"
          (clicked)="submit()"
        ></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateGroupeModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();
  readonly createRequested = output<GroupeRequest>();
  readonly formationOptions = input.required<DropdownOption[]>();

  groupName = '';
  readonly selectedFormation = signal<string | null>(null);
  readonly submitted = signal(false);

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

    this.createRequested.emit({
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
