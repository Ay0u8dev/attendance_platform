import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { Cycle } from '../../../../../core/structure/models/cycle.model';
import { FormationRequest } from '../../../../../core/structure/models/formation.model';
import { normalizeLabel, structureInputClass } from '../../../../../shared/structure-form-ui';

@Component({
  selector: 'app-create-formation-modal',
  standalone: true,
  imports: [Modal, Button, DropdownFilter, ModalFieldGroup, FormsModule, CommonModule],
  template: `
    <app-modal
      title="Créer une formation"
      description="Établissez le point de raccordement pour les groupes et les modules académiques."
      [open]="open()"
      size="lg"
      (closed)="close()"
    >
      <form modal-body class="space-y-6 py-2">
        <div class="grid gap-6 md:grid-cols-2">
          <div class="md:col-span-2">
            <app-modal-field-group
              label="Nom de la formation"
              iconClass="fa-solid fa-book-open"
              iconBackgroundClass="bg-primary-soft text-primary"
              fieldId="create-formation-name"
              [required]="true"
              [error]="nameError()"
            >
              <input
                id="create-formation-name"
                type="text"
                maxlength="60"
                placeholder="Ex: GI 1ere annee"
                [(ngModel)]="formationName"
                name="name"
                [class]="inputClass(!!nameError())"
              />
            </app-modal-field-group>
          </div>

          <!-- Année Académique (Lecture seule) -->
          <app-dropdown-filter
            identifier="create-academic-year"
            label="Année académique"
            allLabel="Année par défaut"
            [options]="academicYearOptions()"
            [value]="selectedAcademicYear()"
            [disabled]="true"
            [searchable]="false"
            iconClass="fa-solid fa-calendar-check"
            iconBackgroundClass="bg-warning/10 text-warning"
          ></app-dropdown-filter>

          <!-- Sélection du Cycle -->
          <app-dropdown-filter
            identifier="create-cycle"
            label="Cycle d'étude"
            allLabel="Choisir un cycle"
            [options]="cycleOptions()"
            [value]="selectedCycle()"
            [required]="true"
            [searchable]="false"
            [error]="submitted() && !selectedCycle() ? 'Le cycle est requis.' : ''"
            iconClass="fa-solid fa-layer-group"
            iconBackgroundClass="bg-primary/10 text-primary"
            (filterChange)="onCycleChange($event)"
          ></app-dropdown-filter>

          <!-- Sélection de la Filière (Désactivée dynamiquement) -->
          <div class="md:col-span-2">
            <app-dropdown-filter
              identifier="create-field"
              label="Filière associée"
              allLabel="Choisir une filière"
              [helper]="fieldHelper()"
              [options]="fieldOptions()"
              [value]="selectedField()"
              [required]="fieldRequired()"
              [disabled]="fieldDisabled()"
              [searchable]="true"
              [error]="submitted() && fieldRequired() && !selectedField() ? 'La filière est obligatoire pour ce cycle.' : ''"
              iconClass="fa-solid fa-graduation-cap"
              iconBackgroundClass="bg-secondary/10 text-secondary"
              (filterChange)="selectedField.set($event)"
            ></app-dropdown-filter>
          </div>
        </div>
      </form>

      <div modal-footer class="flex w-full items-center justify-end gap-3 pt-2">
        <app-button
          label="Annuler"
          variant="outline"
          (clicked)="close()"
        ></app-button>
        <app-button
          label="Confirmer la création"
          variant="primary"
          [disabled]="submitted() && !isFormValid()"
          (clicked)="submit()"
          class="shadow-lg shadow-primary/20"
        ></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateFormationModal {
  // Inputs
  readonly open = input(false);
  readonly closeRequested = output<void>();
  readonly createRequested = output<FormationRequest>();
  readonly cycles = input.required<Cycle[]>();
  readonly defaultAcademicYearId = input<string | null>(null);
  readonly cycleOptions = input.required<DropdownOption[]>();
  readonly fieldOptions = input.required<DropdownOption[]>();
  readonly academicYearOptions = input.required<DropdownOption[]>();

  // State Signals
  readonly selectedAcademicYear = signal<string | null>(null);
  readonly selectedCycle = signal<string | null>(null);
  readonly selectedField = signal<string | null>(null);
  readonly submitted = signal(false);
  formationName = '';

  // Logic Signals
  readonly fieldRequired = computed(() => this.isIngenieurCycle(this.selectedCycle()));

  readonly fieldDisabled = computed(() => {
    const cycleId = this.selectedCycle();
    return !cycleId || !this.isIngenieurCycle(cycleId);
  });

  readonly fieldHelper = computed(() => {
    const cycleId = this.selectedCycle();
    if (!cycleId) return 'Veuillez d\'abord choisir un cycle.';
    return this.isIngenieurCycle(cycleId)
      ? 'Sélection obligatoire pour les cycles Ingénieurs.'
      : 'Non applicable pour les cycles Préparatoires (CP).';
  });

  private readonly syncAcademicYear = effect(
    () => {
      if (this.open()) {
        this.selectedAcademicYear.set(this.defaultAcademicYearId());
      }
    },
    { allowSignalWrites: true }
  );

  isFormValid(): boolean {
    const nameLength = normalizeLabel(this.formationName).length;
    const hasValidName = nameLength > 0 && nameLength <= 60;
    const hasYear = !!this.selectedAcademicYear();
    const hasCycle = !!this.selectedCycle();
    const hasFieldIfRequired = !this.fieldRequired() || !!this.selectedField();
    return hasValidName && hasYear && hasCycle && hasFieldIfRequired;
  }

  inputClass(invalid: boolean): string {
    return structureInputClass(invalid);
  }

  nameError(): string {
    if (!this.submitted()) {
      return '';
    }

    const name = normalizeLabel(this.formationName);
    if (!name) {
      return 'Indiquez le nom de la formation.';
    }

    return name.length <= 60 ? '' : 'Le nom ne doit pas dépasser 60 caractères.';
  }

  close(): void {
    this.submitted.set(false);
    this.resetForm();
    this.closeRequested.emit();
  }

  onCycleChange(cycleId: string | null): void {
    this.selectedCycle.set(cycleId);
    // Réinitialise la filière si le cycle change pour un type non-ingénieur
    if (!cycleId || !this.isIngenieurCycle(cycleId)) {
      this.selectedField.set(null);
    }
  }

  submit(): void {
    this.submitted.set(true);
    if (!this.isFormValid()) return;

    this.createRequested.emit({
      name: normalizeLabel(this.formationName),
      anneeUniversitaireId: Number(this.selectedAcademicYear()),
      cycleId: Number(this.selectedCycle()),
      filiereId: this.fieldRequired() ? Number(this.selectedField()) : null,
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.formationName = '';
    this.selectedAcademicYear.set(null);
    this.selectedCycle.set(null);
    this.selectedField.set(null);
  }

  private isIngenieurCycle(cycleId: string | null): boolean {
    if (!cycleId) return false;
    return this.cycles().find((cycle) => String(cycle.id) === cycleId)?.type === 'INGENIEUR';
  }
}
