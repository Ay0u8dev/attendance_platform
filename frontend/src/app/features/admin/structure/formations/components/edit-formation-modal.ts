import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { DropdownFilter, type DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

export interface EditableFormation {
  code: string;
  cycleName: string;
  fieldName: string;
  semester: string;
  groups: number;
  modules: number;
}

@Component({
  selector: 'app-edit-formation-modal',
  standalone: true,
  imports: [Modal, Button, FormsModule, DropdownFilter],
  template: `
    <app-modal
      title="Éditer la formation"
      description="Modifiez les informations de la formation sélectionnée."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-5">
        <fieldset class="space-y-2">
          <label for="edit-code" class="block text-sm font-medium text-principalText">Code de la formation</label>
          <input
            id="edit-code"
            type="text"
            [value]="formation()?.code ?? ''"
            class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
          />
        </fieldset>

        <fieldset class="space-y-2">
          <app-dropdown-filter
            identifier="edit-cycle"
            label="Cycle"
            allLabel="Sélectionnez un cycle"
            [options]="cycleOptions"
            iconClass="fa-solid fa-circle-play"
            iconBackgroundClass="bg-primary-soft text-primary"
            iconColor="primary"
          ></app-dropdown-filter>
        </fieldset>

        <fieldset class="space-y-2">
          <app-dropdown-filter
            identifier="edit-field"
            label="Filière"
            allLabel="Sélectionnez une filière"
            [options]="fieldOptions"
            iconClass="fa-solid fa-bookmark"
            iconBackgroundClass="bg-secondary-soft text-secondary"
            iconColor="secondary"
          ></app-dropdown-filter>
        </fieldset>

        <fieldset class="space-y-2">
          <app-dropdown-filter
            identifier="edit-semester"
            label="Semestre"
            allLabel="Sélectionnez un semestre"
            [options]="semesterOptions"
            iconClass="fa-solid fa-calendar"
            iconBackgroundClass="bg-warning-soft text-warning"
            iconColor="warning"
          ></app-dropdown-filter>
        </fieldset>

        <div class="grid grid-cols-2 gap-4">
          <fieldset class="space-y-2">
            <label for="edit-groups" class="block text-sm font-medium text-principalText">Nombre de groupes</label>
            <input
              id="edit-groups"
              type="number"
              [value]="formation()?.groups ?? ''"
              class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
            />
          </fieldset>

          <fieldset class="space-y-2">
            <label for="edit-modules" class="block text-sm font-medium text-principalText">Nombre de modules</label>
            <input
              id="edit-modules"
              type="number"
              [value]="formation()?.modules ?? ''"
              class="w-full rounded-lg border border-line bg-surface-subtle px-3.5 py-2.5 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-1 focus:ring-primary-soft"
            />
          </fieldset>
        </div>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Enregistrer les modifications" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditFormationModal {
  readonly open = input(false);
  readonly formation = input<EditableFormation | null>(null);
  readonly closeRequested = output<void>();

  readonly cycleOptions: DropdownOption[] = [
    { value: 'CP', label: 'Cycle Préparatoire' },
    { value: 'CI', label: 'Cycle Ingénieur' }
  ];

  readonly fieldOptions: DropdownOption[] = [
    { value: 'GI', label: 'Génie Informatique' },
    { value: 'IRSI', label: 'IRSI' },
    { value: 'IA', label: 'Intelligence Artificielle' },
    { value: 'ROC', label: 'Robotique et Objets Connectés' }
  ];

  readonly semesterOptions: DropdownOption[] = [
    { value: 'S1', label: 'Semestre 1' },
    { value: 'S2', label: 'Semestre 2' },
    { value: 'S3', label: 'Semestre 3' },
    { value: 'S4', label: 'Semestre 4' },
    { value: 'S5', label: 'Semestre 5' },
    { value: 'S6', label: 'Semestre 6' }
  ];
}
