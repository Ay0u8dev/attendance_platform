import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AnneeUniversitaire,
  AnneeUniversitaireRequest,
} from '../../../../../core/structure/models/annee-universitaire.model';
import { Button } from '../../../../../shared/components/button/button';
import { Modal } from '../../../../../shared/components/modal/modal';
import { ModalFieldGroup } from '../../../../../shared/components/modal-field-group/modal-field-group';
import { normalizeLabel, structureInputClass } from '../../../../../shared/structure-form-ui';

@Component({
  selector: 'app-edit-academic-year-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup, FormsModule],
  template: `
    <app-modal
      title="Modifier l'annee academique"
      description="Mettez a jour une periode officielle claire et exploitable par les formations."
      [open]="open()"
      (closed)="close()"
    >
      <form modal-body class="grid gap-5 md:grid-cols-2">
        <div class="md:col-span-2">
          <app-modal-field-group
            label="Libelle de l'annee"
            iconClass="fa-solid fa-signature"
            iconBackgroundClass="bg-primary-soft text-primary"
            fieldId="edit-year-label"
            helper="Exemple : 2026-2027"
            [required]="true"
            [error]="nameError()"
          >
            <input
              id="edit-year-label"
              type="text"
              [(ngModel)]="form.name"
              name="name"
              placeholder="Ex: 2026-2027"
              [class]="inputClass(!!nameError())"
            />
          </app-modal-field-group>
        </div>

        <app-modal-field-group
          label="Date de debut"
          iconClass="fa-solid fa-calendar-day"
          iconBackgroundClass="bg-secondary-soft text-secondary"
          fieldId="edit-year-start"
          [required]="true"
          [error]="startDateError()"
        >
          <input
            id="edit-year-start"
            type="date"
            [(ngModel)]="form.startDate"
            name="startDate"
            [class]="inputClass(!!startDateError())"
          />
        </app-modal-field-group>

        <app-modal-field-group
          label="Date de fin"
          iconClass="fa-solid fa-calendar-check"
          iconBackgroundClass="bg-warning-soft text-warning"
          fieldId="edit-year-end"
          [required]="true"
          [error]="endDateError()"
        >
          <input
            id="edit-year-end"
            type="date"
            [(ngModel)]="form.endDate"
            name="endDate"
            [class]="inputClass(!!endDateError())"
          />
        </app-modal-field-group>

        <label
          class="md:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-subtle px-4 py-3"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 items-center justify-center rounded-lg bg-success-soft text-success"
            >
              <i class="fa-solid fa-power-off text-xs"></i>
            </div>
            <div>
              <p class="text-sm font-semibold text-principalText">Annee active</p>
              <p class="text-xs text-secondaryText">
                Elle sera proposee par defaut dans la structure.
              </p>
            </div>
          </div>
          <div class="relative flex items-center">
            <input type="checkbox" [(ngModel)]="form.active" name="active" class="peer sr-only" />
            <!-- Background du switch -->
            <div
              class="h-6 w-11 rounded-full transition-colors duration-300 ease-in-out peer-focus:ring-4 peer-focus:ring-success/10"
              [class]="form.active ? 'bg-success' : 'bg-muted/30'"
            ></div>
            <!-- Curseur du switch (Dot) -->
            <div
              class="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm"
              [style.transform]="form.active ? 'translateX(20px)' : 'translateX(0px)'"
            ></div>
          </div>
        </label>
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
export class EditAcademicYearModal {
  readonly open = input(false);
  readonly year = input<AnneeUniversitaire | null>(null);
  readonly closeRequested = output<void>();
  readonly updateRequested = output<AnneeUniversitaireRequest>();
  readonly submitted = signal(false);

  form: AnneeUniversitaireRequest = {
    name: '',
    startDate: '',
    endDate: '',
    active: false,
  };

  private readonly syncForm = effect(() => {
    const value = this.year();
    this.submitted.set(false);

    this.form = value
      ? {
          name: value.name,
          startDate: value.startDate,
          endDate: value.endDate,
          active: value.active,
        }
      : { name: '', startDate: '', endDate: '', active: false };
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
    return this.submitted() && normalizeLabel(this.form.name).length < 4
      ? 'Indiquez un libelle de 4 caracteres minimum.'
      : '';
  }

  startDateError(): string {
    return this.submitted() && !this.form.startDate ? 'Selectionnez une date de debut.' : '';
  }

  endDateError(): string {
    if (!this.submitted()) {
      return '';
    }

    if (!this.form.endDate) {
      return 'Selectionnez une date de fin.';
    }

    return this.form.startDate && this.form.endDate <= this.form.startDate
      ? 'La date de fin doit etre apres la date de debut.'
      : '';
  }

  submit(): void {
    this.submitted.set(true);
    if (this.nameError() || this.startDateError() || this.endDateError()) {
      return;
    }

    this.updateRequested.emit({
      ...this.form,
      name: normalizeLabel(this.form.name),
    });

    this.submitted.set(false);
    this.resetForm();
  }

  private resetForm(): void {
    this.form = { name: '', startDate: '', endDate: '', active: false };
  }
}
