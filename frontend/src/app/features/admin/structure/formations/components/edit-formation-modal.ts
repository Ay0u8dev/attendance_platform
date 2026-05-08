import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import {
  DropdownFilter,
  type DropdownOption,
} from '../../../../../shared/components/dropdown-filter/dropdown-filter';
import { Cycle } from '../../../../../core/structure/models/cycle.model';
import { Formation, FormationRequest } from '../../../../../core/structure/models/formation.model';

@Component({
  selector: 'app-edit-formation-modal',
  standalone: true,
  imports: [Modal, Button, DropdownFilter, CommonModule],
  template: `
    <app-modal
      title="Modifier la formation"
      description="Mettez à jour les raccordements académiques de la formation sélectionnée."
      [open]="open()"
      size="lg"
      (closed)="close()"
    >
      <form modal-body class="space-y-6 py-2">

        <div class="grid gap-6 md:grid-cols-2">
          <!-- Année Académique (Lecture seule) -->
          <app-dropdown-filter
            identifier="edit-academic-year"
            label="Année académique"
            allLabel="Sélectionnez une année"
            [options]="academicYearOptions()"
            [value]="selectedAcademicYear()"
            [disabled]="true"
            [searchable]="false"
            iconClass="fa-solid fa-calendar-check"
            iconBackgroundClass="bg-warning/10 text-warning"
          ></app-dropdown-filter>

          <!-- Sélection du Cycle -->
          <app-dropdown-filter
            identifier="edit-cycle"
            label="Cycle d'étude"
            allLabel="Sélectionnez un cycle"
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
              identifier="edit-field"
              label="Filière associée"
              allLabel="Sélectionnez une filière"
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
          label="Enregistrer les modifications"
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
export class EditFormationModal {
  // Inputs
  readonly open = input(false);
  readonly formation = input<Formation | null>(null);
  readonly closeRequested = output<void>();
  readonly updateRequested = output<FormationRequest>();
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

  private readonly syncSelections = effect(() => {
    const value = this.formation();
    this.submitted.set(false);
    if (!value) {
      this.selectedAcademicYear.set(this.defaultAcademicYearId());
      this.selectedCycle.set(null);
      this.selectedField.set(null);
      return;
    }
    this.selectedAcademicYear.set(String(value.anneeUniversitaireId));
    this.selectedCycle.set(String(value.cycleId));
    this.selectedField.set(value.filiereId ? String(value.filiereId) : null);
  }, { allowSignalWrites: true });

  isFormValid(): boolean {
    const hasYear = !!this.selectedAcademicYear();
    const hasCycle = !!this.selectedCycle();
    const hasFieldIfRequired = !this.fieldRequired() || !!this.selectedField();
    return hasYear && hasCycle && hasFieldIfRequired;
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

    this.updateRequested.emit({
      anneeUniversitaireId: Number(this.selectedAcademicYear()),
      cycleId: Number(this.selectedCycle()),
      filiereId: this.fieldRequired() ? Number(this.selectedField()) : null,
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.selectedAcademicYear.set(this.defaultAcademicYearId());
    this.selectedCycle.set(null);
    this.selectedField.set(null);
  }

  private isIngenieurCycle(cycleId: string | null): boolean {
    if (!cycleId) return false;
    return this.cycles().find((cycle) => String(cycle.id) === cycleId)?.type === 'INGENIEUR';
  }
}