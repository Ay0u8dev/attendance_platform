import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { DropdownFilter, type DropdownOption } from '../../../../../shared/components/dropdown-filter/dropdown-filter';

@Component({
  selector: 'app-create-groupe-modal',
  standalone: true,
  imports: [Modal, Button, FormsModule, DropdownFilter],
  template: `
    <app-modal
      title="Ajouter un groupe"
      description="Créez un nouveau groupe en renseignant les informations ci-dessous."
      [open]="open()"
      (closed)="closeRequested.emit()"
    >
      <form modal-body class="space-y-6">
        <!-- Code Field -->
        <fieldset class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
              <i class="fa-solid fa-hashtag text-sm"></i>
            </div>
            <label for="create-code" class="block text-sm font-bold text-principalText uppercase tracking-wide">Code du groupe</label>
          </div>
          <input
            id="create-code"
            type="text"
            placeholder="Ex: GI-A"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
          />
        </fieldset>

        <!-- Formation Dropdown -->
        <fieldset class="space-y-3">
          <app-dropdown-filter
            identifier="create-formation"
            label="Formation"
            allLabel="Sélectionnez une formation"
            [options]="formationOptions"
            iconClass="fa-solid fa-book-open"
            iconBackgroundClass="bg-primary-soft text-primary"
            iconColor="primary"
          ></app-dropdown-filter>
        </fieldset>

        <!-- Type/Filière Dropdown -->
        <fieldset class="space-y-3">
          <app-dropdown-filter
            identifier="create-type"
            label="Filière"
            allLabel="Sélectionnez une filière"
            [options]="typeOptions"
            iconClass="fa-solid fa-bookmark"
            iconBackgroundClass="bg-secondary-soft text-secondary"
            iconColor="secondary"
          ></app-dropdown-filter>
        </fieldset>

        <!-- Semester Dropdown -->
        <fieldset class="space-y-3">
          <app-dropdown-filter
            identifier="create-semester"
            label="Semestre"
            allLabel="Sélectionnez un semestre"
            [options]="semesterOptions"
            iconClass="fa-solid fa-calendar"
            iconBackgroundClass="bg-warning-soft text-warning"
            iconColor="warning"
          ></app-dropdown-filter>
        </fieldset>

        <!-- Students Field -->
        <fieldset class="space-y-3">
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary flex-shrink-0">
              <i class="fa-solid fa-users text-sm"></i>
            </div>
            <label for="create-students" class="block text-sm font-bold text-principalText uppercase tracking-wide">Nombre d'étudiants</label>
          </div>
          <input
            id="create-students"
            type="number"
            placeholder="Ex: 32"
            class="w-full rounded-xl border border-line bg-gradient-to-r from-surface to-surface-subtle px-4 py-3 text-sm text-principalText placeholder:text-muted transition focus:border-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-secondary/30 shadow-sm"
          />
        </fieldset>
      </form>
      <div modal-footer class="flex w-full items-center gap-3 justify-end border-t border-line pt-6">
        <app-button label="Annuler" variant="outline" [fullWidth]="false" (clicked)="closeRequested.emit()"></app-button>
        <app-button label="Créer le groupe" icon="fa-solid fa-plus" variant="primary" [fullWidth]="false"></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateGroupeModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();

  readonly formationOptions: DropdownOption[] = [
    { value: 'GI', label: 'Génie Informatique' },
    { value: 'MGT', label: 'Management & Économie' },
    { value: 'IA', label: 'Intelligence Artificielle' },
    { value: 'ROC', label: 'Robotique et Objets Connectés' }
  ];

  readonly typeOptions: DropdownOption[] = [
    { value: 'TC', label: 'Tronc Commun' },
    { value: 'SP', label: 'Spécialité' }
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
