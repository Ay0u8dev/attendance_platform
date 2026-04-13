import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { FormationsHeader } from './components/formations-header';
import { FormationsFilters } from './components/formations-filters';
import { FormationsList, type FormationItem } from './components/formations-list';
import { CreateFormationModal } from './components/create-formation-modal';
import { EditFormationModal } from './components/edit-formation-modal';
import { DeleteFormationModal } from './components/delete-formation-modal';

@Component({
  selector: 'app-formations-page',
  imports: [
    FormationsHeader,
    FormationsFilters,
    FormationsList,
    CreateFormationModal,
    EditFormationModal,
    DeleteFormationModal,
  ],
  templateUrl: './formations.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormationsPage {
  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedFormation: FormationItem | null = null;

  searchQuery = signal('');
  selectedCycle = signal<string | null>(null);
  selectedField = signal<string | null>(null);
  selectedSemester = signal<string | null>(null);

  readonly cycles = ['Cycle Préparatoire', 'Cycle Ingénieur'];
  readonly fields = ['Génie Informatique', 'IRSI', 'Intelligence Artificielle', 'Robotique et Objets Connectés'];
  readonly semesters = ['Semestre 1', 'Semestre 2', 'Semestre 3', 'Semestre 4', 'Semestre 5', 'Semestre 6'];

  readonly allFormations: FormationItem[] = [
    {
      id: 'ci1-gi-s1',
      code: 'CI1 GI - Sem 1',
      cycleName: 'Cycle Ingénieur',
      fieldName: 'Génie Informatique',
      semester: 'Semestre 1',
      year: '2024-2025',
      groups: 5,
      modules: 6,
      badgeColor: 'bg-primary-soft text-primary',
      status: 'active',
    },
    {
      id: 'cp2-s1',
      code: 'CP2 - Sem 1',
      cycleName: 'Cycle Préparatoire',
      fieldName: 'Tronc Commun Scientifique',
      semester: 'Semestre 1',
      year: '2024-2025',
      groups: 5,
      modules: 6,
      badgeColor: 'bg-secondary-soft text-secondary',
      status: 'active',
    },
    {
      id: 'ci2-irsi-s2',
      code: 'CI2 IRSI - Sem 2',
      cycleName: 'Cycle Ingénieur',
      fieldName: 'IRSI',
      semester: 'Semestre 2',
      year: '2024-2025',
      groups: 5,
      modules: 6,
      badgeColor: 'bg-warning-soft text-warning',
      status: 'active',
    },
    {
      id: 'ci1-ia-s1',
      code: 'CI1 IA - Sem 1',
      cycleName: 'Cycle Ingénieur',
      fieldName: 'Intelligence Artificielle',
      semester: 'Semestre 1',
      year: '2024-2025',
      groups: 4,
      modules: 5,
      badgeColor: 'bg-success-soft text-success',
      status: 'active',
    },
    {
      id: 'ci1-roc-s1',
      code: 'CI1 ROC - Sem 1',
      cycleName: 'Cycle Ingénieur',
      fieldName: 'Robotique et Objets Connectés',
      semester: 'Semestre 1',
      year: '2024-2025',
      groups: 3,
      modules: 5,
      badgeColor: 'bg-danger-soft text-danger',
      status: 'active',
    },
    {
      id: 'cp1-tcs-s1',
      code: 'CP1 TCS - Sem 1',
      cycleName: 'Cycle Préparatoire',
      fieldName: 'Tronc Commun Scientifique',
      semester: 'Semestre 1',
      year: '2024-2025',
      groups: 8,
      modules: 7,
      badgeColor: 'bg-info-soft text-info',
      status: 'active',
    },
  ];

  get filteredFormations(): FormationItem[] {
    return this.allFormations.filter(formation => {
      const matchesSearch =
        formation.code.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
        formation.cycleName.toLowerCase().includes(this.searchQuery().toLowerCase()) ||
        formation.fieldName.toLowerCase().includes(this.searchQuery().toLowerCase());

      const matchesCycle = !this.selectedCycle() || formation.cycleName === this.selectedCycle();
      const matchesField = !this.selectedField() || formation.fieldName === this.selectedField();
      const matchesSemester = !this.selectedSemester() || formation.semester === this.selectedSemester();

      return matchesSearch && matchesCycle && matchesField && matchesSemester;
    });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onCycleFilterChange(cycle: string | null): void {
    this.selectedCycle.set(cycle);
  }

  onFieldFilterChange(field: string | null): void {
    this.selectedField.set(field);
  }

  onSemesterFilterChange(semester: string | null): void {
    this.selectedSemester.set(semester);
  }

  openCreate(): void {
    this.selectedFormation = null;
    this.activeModal = 'create';
  }

  openEdit(formation: FormationItem): void {
    this.selectedFormation = formation;
    this.activeModal = 'edit';
  }

  openDelete(formation: FormationItem): void {
    this.selectedFormation = formation;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }
}
