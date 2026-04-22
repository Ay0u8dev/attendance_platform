import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

import { ModulesHeader } from './components/modules-header';
import { ModulesFilters } from './components/modules-filters';
import { ModulesList, type ModuleItem } from './components/modules-list';
import { CreateModuleModal } from './components/create-module-modal';
import { EditModuleModal } from './components/edit-module-modal';
import { DeleteModuleModal } from './components/delete-module-modal';

@Component({
  selector: 'app-modules-page',
  imports: [
    ModulesHeader,
    ModulesFilters,
    ModulesList,
    CreateModuleModal,
    EditModuleModal,
    DeleteModuleModal,
  ],
  templateUrl: './modules.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulesPage {
  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedModule: ModuleItem | null = null;

  readonly searchQuery = signal('');
  readonly selectedFormation = signal<string | null>(null);
  readonly selectedSemester = signal<string | null>(null);
  readonly selectedStatus = signal<string | null>(null);

  readonly formations = [
    'Génie Informatique',
    'IRSI',
    'Intelligence Artificielle',
    'Robotique et Objets Connectés',
  ];
  readonly semesters = ['Semestre 1', 'Semestre 2', 'Semestre 3', 'Semestre 4', 'Semestre 5', 'Semestre 6'];
  readonly statuses = ['Actif', 'En validation', 'Archivé'];

  readonly allModules: ModuleItem[] = [
    {
      id: 'alg-101',
      code: 'ALG-101',
      name: 'Algorithmique et structures',
      formation: 'Génie Informatique',
      semester: 'Semestre 1',
      credits: 6,
      hours: 48,
      status: 'Actif',
      badgeClass: 'bg-primary-soft text-primary',
      barClass: 'bg-primary',
      lastUpdated: new Date('2026-04-10'),
    },
    {
      id: 'sec-204',
      code: 'SEC-204',
      name: 'Sécurité des réseaux',
      formation: 'IRSI',
      semester: 'Semestre 3',
      credits: 5,
      hours: 42,
      status: 'En validation',
      badgeClass: 'bg-warning-soft text-warning',
      barClass: 'bg-warning',
      lastUpdated: new Date('2026-04-07'),
    },
    {
      id: 'ai-312',
      code: 'IA-312',
      name: 'Apprentissage automatique',
      formation: 'Intelligence Artificielle',
      semester: 'Semestre 4',
      credits: 5,
      hours: 40,
      status: 'Actif',
      badgeClass: 'bg-secondary-soft text-secondary',
      barClass: 'bg-secondary',
      lastUpdated: new Date('2026-04-03'),
    },
    {
      id: 'emb-220',
      code: 'ROC-220',
      name: 'Systèmes embarqués',
      formation: 'Robotique et Objets Connectés',
      semester: 'Semestre 2',
      credits: 4,
      hours: 36,
      status: 'Archivé',
      badgeClass: 'bg-danger-soft text-danger',
      barClass: 'bg-danger',
      lastUpdated: new Date('2026-03-25'),
    },
  ];

  readonly filteredModules = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();

    return this.allModules.filter((module) => {
      const matchesSearch =
        !query ||
        module.code.toLowerCase().includes(query) ||
        module.name.toLowerCase().includes(query) ||
        module.formation.toLowerCase().includes(query);

      const matchesFormation = !this.selectedFormation() || module.formation === this.selectedFormation();
      const matchesSemester = !this.selectedSemester() || module.semester === this.selectedSemester();
      const matchesStatus = !this.selectedStatus() || module.status === this.selectedStatus();

      return matchesSearch && matchesFormation && matchesSemester && matchesStatus;
    });
  });

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  onFormationFilterChange(formation: string | null): void {
    this.selectedFormation.set(formation);
  }

  onSemesterFilterChange(semester: string | null): void {
    this.selectedSemester.set(semester);
  }

  onStatusFilterChange(status: string | null): void {
    this.selectedStatus.set(status);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedFormation.set(null);
    this.selectedSemester.set(null);
    this.selectedStatus.set(null);
  }

  openCreate(): void {
    this.selectedModule = null;
    this.activeModal = 'create';
  }

  openEdit(module: ModuleItem): void {
    this.selectedModule = module;
    this.activeModal = 'edit';
  }

  openDelete(module: ModuleItem): void {
    this.selectedModule = module;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }
}
