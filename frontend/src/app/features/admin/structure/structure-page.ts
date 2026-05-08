import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PageHeader } from '../../../shared/components/page-header/page-header';
import { AcademicYearPage } from './academic Year/academic-year-page';
import { CyclesPage } from './cycles/cycles-page';
import { FieldsPage } from './fields/fields-page';
import { FormationsPage } from './formations/formations-page';
import { GroupesPage } from './groupes/groupes-page';
import { ModulesPage } from './modules/modules-page';

type StructureUnitId = 'academic-year' | 'cycles' | 'fields' | 'formations' | 'groupes' | 'modules';

type StructureUnit = {
  readonly id: StructureUnitId;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
};

@Component({
  selector: 'app-structure-page',
  imports: [
    PageHeader,
    AcademicYearPage,
    CyclesPage,
    FieldsPage,
    FormationsPage,
    GroupesPage,
    ModulesPage,
  ],
  templateUrl: './structure.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructurePage {
  readonly units: readonly StructureUnit[] = [
    {
      id: 'academic-year',
      title: 'Années',
      description: 'Périodes officielles',
      icon: 'fa-solid fa-calendar-days',
    },
    {
      id: 'cycles',
      title: 'Cycles',
      description: 'Socles pédagogiques',
      icon: 'fa-solid fa-layer-group',
    },
    {
      id: 'fields',
      title: 'Filières',
      description: 'Parcours académiques',
      icon: 'fa-solid fa-bookmark',
    },
    {
      id: 'formations',
      title: 'Formations',
      description: 'Associations validées',
      icon: 'fa-solid fa-diagram-project',
    },
    {
      id: 'groupes',
      title: 'Groupes',
      description: 'Effectifs et sections',
      icon: 'fa-solid fa-users',
    },
    {
      id: 'modules',
      title: 'Modules',
      description: "Unités d'enseignement",
      icon: 'fa-solid fa-book-open',
    },
  ];

  activeUnitId: StructureUnitId = 'academic-year';

  setActiveUnit(unitId: StructureUnitId): void {
    this.activeUnitId = unitId;
  }
}
