import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { CycleRequest } from '../../../../../core/structure/models/cycle.model';
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
  selector: 'app-create-cycle-modal',
  standalone: true,
  imports: [Modal, Button, ModalFieldGroup, FormsModule, CommonModule],
  template: `
    <app-modal
      title="Ajouter un cycle"
      description="Définissez le socle académique pour les futures filières et formations."
      [open]="open()"
      (closed)="close()"
    >
      <form modal-body class="space-y-6 py-2">
        <!-- Code du cycle -->
        <app-modal-field-group
          label="Code du cycle"
          iconClass="fa-solid fa-hashtag"
          iconBackgroundClass="bg-primary/10 text-primary"
          fieldId="create-code"
          helper="Exemple : CP, ING"
          [required]="true"
          [error]="codeError()"
        >
          <input
            id="create-code"
            type="text"
            placeholder="Ex: CP"
            [(ngModel)]="form.code"
            name="code"
            [class]="inputClass(!!codeError(), 'bold')"
          />
        </app-modal-field-group>

        <!-- Libellé du cycle -->
        <app-modal-field-group
          label="Libellé du cycle"
          iconClass="fa-solid fa-font"
          iconBackgroundClass="bg-secondary/10 text-secondary"
          fieldId="create-name"
          [required]="true"
          [error]="nameError()"
        >
          <input
            id="create-name"
            type="text"
            placeholder="Ex: Cycle préparatoire"
            [(ngModel)]="form.name"
            name="name"
            [class]="inputClass(!!nameError(), 'semibold')"
          />
        </app-modal-field-group>

        <!-- Sélecteur de Type -->
        <app-modal-field-group
          label="Type de cycle"
          iconClass="fa-solid fa-layer-group"
          iconBackgroundClass="bg-warning/10 text-warning"
          fieldId="create-type"
          [required]="true"
        >
          <div class="grid grid-cols-2 gap-3 mt-1">
            @for (type of types; track type.value) {
              <button
                type="button"
                (click)="form.type = type.value"
                class="flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-300 outline-none"
                [class]="form.type === type.value 
                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary' 
                  : 'border-line bg-surface hover:border-muted'"
              >
                <div 
                  class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  [ngClass]="form.type === type.value ? 'bg-primary text-white' : 'bg-muted/10 text-muted'"
                >
                  <i [class]="type.icon" class="text-xs"></i>
                </div>
                <div>
                  <p class="text-sm font-bold" [class.text-primary]="form.type === type.value">{{ type.label }}</p>
                  <p class="text-[10px] text-secondaryText leading-tight">{{ type.desc }}</p>
                </div>
              </button>
            }
          </div>
        </app-modal-field-group>
      </form>

      <div modal-footer class="flex w-full items-center justify-end gap-3 pt-4">
        <app-button label="Annuler" variant="outline" (clicked)="close()"></app-button>
        <app-button
          label="Créer le cycle"
          icon=""
          variant="primary"
          (clicked)="submit()"
          class="shadow-lg shadow-primary/20"
        ></app-button>
      </div>
    </app-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateCycleModal {
  readonly open = input(false);
  readonly closeRequested = output<void>();
  readonly createRequested = output<CycleRequest>();
  readonly submitted = signal(false);

  form: CycleRequest = { code: '', name: '', type: 'PREPA' };

  readonly types = [
    { value: 'PREPA' as const, label: 'Préparatoire', desc: '2 ans, accès post-bac', icon: 'fa-solid fa-graduation-cap' },
    { value: 'INGENIEUR' as const, label: 'Ingénieur', desc: '3 ans, accès après prépa', icon: 'fa-solid fa-gears' }
  ];

  close(): void {
    this.submitted.set(false);
    this.form = { code: '', name: '', type: 'PREPA' };
    this.closeRequested.emit();
  }

  // Centralisation du style pour éviter la répétition dans le HTML
  inputClass(invalid: boolean, weight: 'bold' | 'semibold'): string {
    const base = structureInputClass(invalid);
    const custom = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-4 placeholder:font-normal placeholder:text-muted/40`;
    const ring = invalid ? 'focus:ring-danger/10 border-danger' : 'focus:ring-primary/10 focus:border-primary';
    const textWeight = weight === 'bold' ? 'font-bold' : 'font-semibold';
    
    return `${base} ${custom} ${ring} ${textWeight}`;
  }

  codeError(): string {
    if (!this.submitted()) return '';
    const code = normalizeCode(this.form.code);
    if (!code) return 'Indiquez le code du cycle.';
    return /^[A-Z0-9-]{2,12}$/.test(code) ? '' : 'Format invalide (2-12 caractères).';
  }

  nameError(): string {
    if (!this.submitted()) return '';
    return hasMinimumLength(this.form.name, 3) ? '' : '3 caractères minimum requis.';
  }

  submit(): void {
    this.submitted.set(true);
    if (this.codeError() || this.nameError()) return;

    this.createRequested.emit({
      ...this.form,
      code: normalizeCode(this.form.code),
      name: normalizeLabel(this.form.name),
    });

    this.submitted.set(false);
    this.form = { code: '', name: '', type: 'PREPA' };
  }
}