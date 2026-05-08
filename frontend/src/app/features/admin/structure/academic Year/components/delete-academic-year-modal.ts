import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { type AnneeUniversitaire } from '../../../../../core/structure/models/annee-universitaire.model';
import { DeleteModal } from '../../../../../shared/components/delete-modal/delete-modal';

@Component({
  selector: 'app-delete-academic-year-modal',
  standalone: true,
  imports: [DeleteModal],
  template: `
    <app-delete-modal
      title="Supprimer l'annee academique ?"
      [itemName]="year()?.name ?? ''"
      confirmMessage="Annee concernee"
      warningMessage="Les formations rattachees a cette periode peuvent etre affectees. Verifiez les dependances avant de continuer."
      deleteButtonLabel="Supprimer l'annee"
      [open]="open()"
      (closeRequested)="closeRequested.emit()"
      (confirmDelete)="confirmDelete.emit()"
    ></app-delete-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteAcademicYearModal {
  readonly open = input(false);
  readonly year = input<AnneeUniversitaire | null>(null);
  readonly closeRequested = output<void>();
  readonly confirmDelete = output<void>();
}
