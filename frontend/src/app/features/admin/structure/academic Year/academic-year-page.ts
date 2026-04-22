import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AcademicYearHeader } from './components/academic-year-header';
import { AcademicYearList, type AcademicYearItem } from './components/academic-year-list';
import { CreateAcademicYearModal } from './components/create-academic-year-modal';
import { EditAcademicYearModal } from './components/edit-academic-year-modal';
import { DeleteAcademicYearModal } from './components/delete-academic-year-modal';

@Component({
  selector: 'app-academic-year-page',
  imports: [
    AcademicYearHeader,
    AcademicYearList,
    CreateAcademicYearModal,
    EditAcademicYearModal,
    DeleteAcademicYearModal,
  ],
  templateUrl: './academic-year.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcademicYearPage {
  activeModal: 'create' | 'edit' | 'delete' | null = null;
  selectedYear: AcademicYearItem | null = null;

  readonly academicYears: AcademicYearItem[] = [
    {
      id: '2024-2025',
      label: '2024-2025',
      period: '01 Sep 2024 - 31 Jul 2025',
      terms: 2,
      formations: 12,
      status: 'En cours',
      badgeClass: 'bg-secondary-soft text-secondary',
      barClass: 'bg-secondary',
      lastUpdated: new Date('2026-04-04'),
    },
    {
      id: '2025-2026',
      label: '2025-2026',
      period: '01 Sep 2025 - 31 Jul 2026',
      terms: 2,
      formations: 10,
      status: 'Préparation',
      badgeClass: 'bg-warning-soft text-warning',
      barClass: 'bg-warning',
      lastUpdated: new Date('2026-03-18'),
    },
    {
      id: '2023-2024',
      label: '2023-2024',
      period: '01 Sep 2023 - 31 Jul 2024',
      terms: 2,
      formations: 11,
      status: 'Archivée',
      badgeClass: 'bg-danger-soft text-danger',
      barClass: 'bg-danger',
      lastUpdated: new Date('2026-02-12'),
    },
  ];

  openCreate(): void {
    this.selectedYear = null;
    this.activeModal = 'create';
  }

  openEdit(year: AcademicYearItem): void {
    this.selectedYear = year;
    this.activeModal = 'edit';
  }

  openDelete(year: AcademicYearItem): void {
    this.selectedYear = year;
    this.activeModal = 'delete';
  }

  closeModal(): void {
    this.activeModal = null;
  }
}
