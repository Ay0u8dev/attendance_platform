import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { AcademicYearPage } from './academic Year/academic-year-page';
import { CyclesPage } from './cycles/cycles-page';
import { FieldsPage } from './fields/fields-page';
import { FormationsPage } from './formations/formations-page';
import { GroupesPage } from './groupes/groupes-page';
import { ModulesPage } from './modules/modules-page';

@Component({
  selector: 'app-structure-page',
  imports: [PageHeader, AcademicYearPage, CyclesPage, FieldsPage, FormationsPage, GroupesPage, ModulesPage],
  templateUrl: './structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructurePage {
  readonly units = [
    {
      id: 'academic-year',
      title: 'Annee Academique',
      description: 'Definissez la periode officielle et ses parametres globaux.',
      count: 3,
      highlights: ['Calendriers', 'Semestres', 'Parametres generaux'],
    },
    {
      id: 'cycles',
      title: 'Cycles',
      description: 'Organisez les cycles et leurs niveaux.',
      count: 5,
      highlights: ['Niveaux', 'Durees', 'Regles'],
    },
    {
      id: 'fields',
      title: 'Filieres',
      description: 'Structurez les filieres et leurs parcours.',
      count: 6,
      highlights: ['Responsables', 'Axes', 'Statuts'],
    },
    {
      id: 'formations',
      title: 'Formations',
      description: 'Gerez les formations et leurs volumes horaires.',
      count: 4,
      highlights: ['Credits', 'Volumes', 'Modalites'],
    },
    {
      id: 'groupes',
      title: 'Groupes',
      description: 'Definissez les groupes et effectifs.',
      count: 3,
      highlights: ['Effectifs', 'Regroupements', 'Encadrement'],
    },
    {
      id: 'modules',
      title: 'Modules',
      description: 'Repartissez les modules et leurs unites.',
      count: 3,
      highlights: ['Unites', 'Evaluations', 'Validation'],
    },
  ];

  readonly checkpoints = [
    {
      title: 'Validation des references',
      description: 'Verifiez les codes et libelles officiels.',
    },
    {
      title: 'Alignement des volumes',
      description: 'Controlez les volumes horaires et credits.',
    },
    {
      title: 'Statuts a confirmer',
      description: 'Elements en attente de validation.',
    },
  ];

  activeUnitId = this.units[0]?.id ?? 'academic-year';

  get activeUnit() {
    return this.units.find((unit) => unit.id === this.activeUnitId) ?? this.units[0];
  }

  setActiveUnit(unitId: string) {
    this.activeUnitId = unitId;
  }
}
