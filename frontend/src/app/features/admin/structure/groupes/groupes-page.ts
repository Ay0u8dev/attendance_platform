import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';

import { GroupesHeader } from './components/groupes-header';
import { GroupesFilters } from './components/groupes-filters';
import { GroupesList, GroupeItem } from './components/groupes-list';
import { CreateGroupeModal } from './components/create-groupe-modal';
import { EditGroupeModal, EditableGroupe } from './components/edit-groupe-modal';
import { DeleteGroupeModal } from './components/delete-groupe-modal';

@Component({
  selector: 'app-groupes-page',
  standalone: true,
  imports: [
    GroupesHeader,
    GroupesFilters,
    GroupesList,
    CreateGroupeModal,
    EditGroupeModal,
    DeleteGroupeModal,
  ],
  templateUrl: './groupes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupesPage {
  // State signals
  readonly searchQuery = signal('');
  readonly selectedFormation = signal<string | null>(null);
  readonly selectedField = signal<string | null>(null);
  readonly selectedSemester = signal<string | null>(null);

  readonly isCreateOpen = signal(false);
  readonly isEditOpen = signal(false);
  readonly isDeleteOpen = signal(false);
  readonly editingGroupe = signal<EditableGroupe | null>(null);
  readonly deletingGroupe = signal<GroupeItem | null>(null);

  // Sample data
  readonly formations = ['GI', 'MGT', 'IA', 'ROC'];
  readonly fields = ['Tronc Commun', 'Spécialité'];
  readonly semesters = ['Semestre 1', 'Semestre 2', 'Semestre 3', 'Semestre 4', 'Semestre 5', 'Semestre 6'];

  readonly allGroupes: GroupeItem[] = [
    {
      id: '1',
      code: 'GI-A',
      formationName: 'Génie Informatique (GI)',
      subtitle: 'Tronc Commun • Semestre 1',
      students: 32,
      semester: 'Semestre 1',
      field: 'Tronc Commun',
      formation: 'GI',
      badgeColor: 'bg-blue-100 text-blue-700',
      status: 'active',
    },
    {
      id: '2',
      code: 'GI-B',
      formationName: 'Génie Informatique (GI)',
      subtitle: 'Tronc Commun • Semestre 1',
      students: 32,
      semester: 'Semestre 1',
      field: 'Tronc Commun',
      formation: 'GI',
      badgeColor: 'bg-blue-100 text-blue-700',
      status: 'active',
    },
    {
      id: '3',
      code: 'ROC-A',
      formationName: 'Robotique et Objets Connectés (ROC)',
      subtitle: 'Tronc Commun • Semestre 1',
      students: 32,
      semester: 'Semestre 1',
      field: 'Tronc Commun',
      formation: 'ROC',
      badgeColor: 'bg-blue-100 text-blue-700',
      status: 'active',
    },    {
      id: '4',
      code: 'IRSI-A',
      formationName: 'Ingenierie des Réseaux et sécurité Informatiques (IRSI)',
      subtitle: 'Tronc Commun • Semestre 1',
      students: 32,
      semester: 'Semestre 1',
      field: 'Tronc Commun',
      formation: 'MGT',
      badgeColor: 'bg-orange-100 text-orange-700',
      status: 'active',
    },
    {
      id: '5',
      code: 'IA-A',
      formationName: 'Intelligence Artificielle (IA)',
      subtitle: 'Tronc Commun • Semestre 1',
      students: 32,
      semester: 'Semestre 1',
      field: 'Tronc Commun',
      formation: 'MGT',
      badgeColor: 'bg-orange-100 text-orange-700',
      status: 'active',
    },
  ];

  // Computed values
  readonly filteredGroupes = computed(() => {
    let result = this.allGroupes;

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      result = result.filter(
        (g) =>
          g.code.toLowerCase().includes(query) ||
          g.formationName.toLowerCase().includes(query)
      );
    }

    if (this.selectedFormation()) {
      result = result.filter((g) => g.formation === this.selectedFormation());
    }

    if (this.selectedField()) {
      result = result.filter((g) => g.field === this.selectedField());
    }

    if (this.selectedSemester()) {
      result = result.filter((g) => g.semester === this.selectedSemester());
    }

    return result;
  });

  // Modal actions
  openCreate(): void {
    this.isCreateOpen.set(true);
  }

  openEdit(groupe: GroupeItem): void {
    this.editingGroupe.set({
      code: groupe.code,
      formationName: groupe.formationName,
      students: groupe.students,
      semester: groupe.semester,
      field: groupe.field,
    });
    this.isEditOpen.set(true);
  }

  openDelete(groupe: GroupeItem): void {
    this.deletingGroupe.set(groupe);
    this.isDeleteOpen.set(true);
  }

  closeModal(): void {
    this.isCreateOpen.set(false);
    this.isEditOpen.set(false);
    this.isDeleteOpen.set(false);
    this.editingGroupe.set(null);
    this.deletingGroupe.set(null);
  }

  confirmDelete(): void {
    const groupe = this.deletingGroupe();
    if (groupe) {
      // In a real app, call API to delete
      console.log('Deleting groupe:', groupe);
      this.closeModal();
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedFormation.set(null);
    this.selectedField.set(null);
    this.selectedSemester.set(null);
  }
}
