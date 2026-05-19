import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Button } from '../button/button';

@Component({
  selector: 'app-document-preview-panel',
  imports: [Button],
  template: `
    <section class="rounded-[1.75rem] border border-line bg-surface p-5 shadow-card">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
            Pièce jointe
          </p>
          <h3 class="mt-1 text-lg font-semibold text-principalText">{{ fileName() }}</h3>
        </div>

        <i class="fa-regular fa-file-lines text-lg text-primary" aria-hidden="true"></i>
      </div>

      <div
        class="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-surface-subtle px-6 text-center"
      >
        <div class="space-y-3">
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"
          >
            <i class="fa-regular fa-image text-lg" aria-hidden="true"></i>
          </div>
          <p class="text-base font-semibold text-principalText">{{ previewTitle() }}</p>
          <p class="max-w-md text-sm leading-6 text-secondaryText">{{ previewDescription() }}</p>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <app-button
          label="Télécharger"
          icon="fa-solid fa-download"
          variant="outline"
          size="sm"
          [fullWidth]="false"
        ></app-button>
        <app-button
          label="Ouvrir dans un nouvel onglet"
          icon="fa-solid fa-arrow-up-right-from-square"
          variant="primary"
          size="sm"
          [fullWidth]="false"
        ></app-button>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPreviewPanel {
  readonly fileName = input.required<string>();
  readonly previewTitle = input('Prévisualisation du justificatif');
  readonly previewDescription = input(
    "La maquette Figma montre une zone de prévisualisation riche. Tant que l'intégration document réelle n'existe pas, gardez une surface cohérente plutôt qu'un faux viewer cassé.",
  );
}
