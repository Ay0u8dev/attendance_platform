import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Button } from '../button/button';

@Component({
  selector: 'app-document-preview-panel',
  imports: [Button],
  host: {
    class: 'block',
  },
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

      @if (previewUrl()) {
        <div class="mt-5 overflow-hidden rounded-[1.5rem] border border-line bg-surface-subtle">
          @switch (getAttachmentType(previewUrl())) {
            @case ('pdf') {
              <iframe
                [src]="getSafeUrl(previewUrl()!)"
                class="w-full h-[500px] border-0 rounded-[1.5rem]"
                title="Aperçu du justificatif"
              ></iframe>
            }
            @case ('image') {
              <img
                [src]="previewUrl()!"
                [alt]="'Aperçu de ' + fileName()"
                class="w-full max-h-[500px] object-contain rounded-[1.5rem] mx-auto block"
              />
            }
            @default {
              <div class="p-8 text-center text-sm text-secondaryText">
                <i class="fa-regular fa-file text-3xl text-muted mb-2 block"></i>
                <p>{{ fileName() }}</p>
              </div>
            }
          }
        </div>
      } @else {
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
      }

      <div class="mt-5 flex flex-wrap gap-3">
        <app-button
          label="Télécharger"
          icon="fa-solid fa-download"
          variant="outline"
          size="sm"
          [fullWidth]="false"
          [disabled]="!previewUrl() && !downloadUrl()"
          (clicked)="download()"
        ></app-button>
        <app-button
          label="Ouvrir dans un nouvel onglet"
          icon="fa-solid fa-arrow-up-right-from-square"
          variant="primary"
          size="sm"
          [fullWidth]="false"
          [disabled]="!previewUrl()"
          (clicked)="openInNewTab()"
        ></app-button>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentPreviewPanel {
  private readonly sanitizer = inject(DomSanitizer);

  readonly fileName = input.required<string>();
  readonly previewUrl = input<string | null>(null);
  readonly downloadUrl = input<string | null>(null);
  readonly previewTitle = input('Prévisualisation du justificatif');
  readonly previewDescription = input(
    'La prévisualisation du document sera disponible prochainement. En attendant, vous pouvez télécharger le fichier.',
  );

  getAttachmentType(url: string | null): 'pdf' | 'image' | 'other' {
    if (!url) return 'other';
    const lower = url.toLowerCase();
    if (lower.startsWith('data:image')) return 'image';
    if (lower.includes('.pdf')) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(lower)) return 'image';
    return 'other';
  }

  getSafeUrl(url: string): SafeResourceUrl {
    const cleanUrl = `${url}#toolbar=0&navpanes=0&scrollbar=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(cleanUrl);
  }

  download(): void {
    const url = this.downloadUrl() || this.previewUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  openInNewTab(): void {
    const url = this.previewUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
