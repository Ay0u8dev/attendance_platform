import { Injectable, computed, inject, signal } from '@angular/core';
import { tap } from 'rxjs/operators';

import { AnneeUniversitaire } from '../models/annee-universitaire.model';
import { AnneeUniversitaireService } from './annee-universitaire.service';

@Injectable({ providedIn: 'root' })
export class AcademicYearContextService {
  private readonly anneeService = inject(AnneeUniversitaireService);

  readonly academicYears = signal<AnneeUniversitaire[]>([]);
  readonly selectedAcademicYearId = signal<string | null>(null);
  readonly activeAcademicYears = computed(() =>
    this.academicYears().filter((year) => year.active),
  );
  readonly selectedAcademicYear = computed(() => {
    const selectedId = this.selectedAcademicYearId();
    return (
      this.activeAcademicYears().find((year) => String(year.id) === selectedId) ??
      this.activeAcademicYears()[0] ??
      null
    );
  });

  loadYears() {
    return this.anneeService.getAll().pipe(
      tap((years) => {
        this.setAcademicYears(years);
      }),
    );
  }

  setAcademicYears(years: AnneeUniversitaire[]): void {
    this.academicYears.set(years);
    this.ensureSelectedYearIsActive(years);
  }

  setSelectedAcademicYear(yearId: string | number | null): void {
    if (yearId == null) {
      this.selectedAcademicYearId.set(
        this.activeAcademicYears()[0] ? String(this.activeAcademicYears()[0].id) : null,
      );
      return;
    }

    this.selectedAcademicYearId.set(String(yearId));
  }

  private ensureSelectedYearIsActive(years: AnneeUniversitaire[]): void {
    const activeYears = years.filter((year) => year.active);
    const selectedId = this.selectedAcademicYearId();

    if (activeYears.some((year) => String(year.id) === selectedId)) {
      return;
    }

    this.selectedAcademicYearId.set(activeYears[0] ? String(activeYears[0].id) : null);
  }
}
