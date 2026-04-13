import { ChangeDetectionStrategy, Component } from '@angular/core';

import { FieldsHeader } from './components/fields-header';
import { FieldsList, type FieldItem } from './components/fields-list';
import { CreateFieldModal } from './components/create-field-modal';
import { EditFieldModal } from './components/edit-field-modal';
import { DeleteFieldModal } from './components/delete-field-modal';

@Component({
  selector: 'app-fields-page',
  imports: [
    FieldsHeader,
    FieldsList,
    CreateFieldModal,
    EditFieldModal,
    DeleteFieldModal,
  ],
  templateUrl: './fields.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsPage {
  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedField: FieldItem | null = null;

  readonly fields: FieldItem[] = [
    {
      id: 'gi',
      code: 'GI',
      name: 'Génie Informatique',
      description: 'Parcours spécialisé en développement et ingénierie logicielle.',
      students: 124,
      cycles: 3,
      badgeClass: 'bg-primary-soft text-primary',
      barClass: 'bg-primary',
      lastUpdated: new Date('2026-04-05'),
    },
    {
      id: 'IRSI',
      code: 'IRSI',
      name: 'Ingénierie des Réseaux et sécurité Informatiques',
      description: 'Spécialisation en ingénierie des réseaux et en sécurité informatique.',
      students: 88,
      cycles: 3,
      badgeClass: 'bg-secondary-soft text-secondary',
      barClass: 'bg-secondary',
      lastUpdated: new Date('2026-04-05'),
    },
    {
      id: 'IA',
      code: 'IA',
      name: 'Intelligence Artificielle',
      description: 'Spécialisation en intelligence artificielle.',
      students: 62,
      cycles: 2,
      badgeClass: 'bg-warning-soft text-warning',
      barClass: 'bg-warning',
      lastUpdated: new Date('2026-04-05'),
    },
    {
      id: 'ROC',
      code: 'ROC',
      name: 'Robotique et Objets Connectés',
      description: 'Spécialisation en robotique et en objets connectés.',
      students: 45,
      cycles: 2,
      badgeClass: 'bg-success-soft text-success',
      barClass: 'bg-success',
      lastUpdated: new Date('2026-04-05'),
    }
  ];

  openCreate(): void {
    this.selectedField = null;
    this.activeModal = 'create';
  }

  openEdit(field: FieldItem): void {
    this.selectedField = field;
    this.activeModal = 'edit';
  }

  openDelete(field: FieldItem): void {
    this.selectedField = field;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }
}
