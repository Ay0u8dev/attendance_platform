import { ChangeDetectionStrategy, Component, input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { Button } from '../button/button';

@Component({
  selector: 'app-document-preview-panel',
  imports: [Button],
  host: {
    class: 'block min-w-0',
  },
  template: `
    <section class="min-w-0 rounded-[1.5rem] border border-line bg-surface p-4 shadow-card sm:rounded-[1.75rem] sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
            Pièce jointe
          </p>
          <h3 class="mt-1 break-all text-base font-semibold text-principalText sm:text-lg">{{ fileName() }}</h3>
        </div>

        <i class="fa-regular fa-file-lines shrink-0 text-lg text-primary" aria-hidden="true"></i>
      </div>

      @if (previewUrl()) {
        <div class="mt-5 overflow-hidden rounded-[1.5rem] border border-line bg-surface-subtle">
          @switch (getAttachmentType(previewUrl())) {
            @case ('pdf') {
              <iframe
                [src]="getSafeUrl(previewUrl()!)"
                class="h-[55dvh] min-h-80 w-full max-h-[500px] rounded-[1.5rem] border-0"
                title="Aperçu du justificatif"
              ></iframe>
            }
            @case ('image') {
              <img
                [src]="previewUrl()!"
                [alt]="'Aperçu de ' + fileName()"
                class="mx-auto block max-h-[55dvh] w-full rounded-[1.5rem] object-contain sm:max-h-[500px]"
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

      <div class="mt-5 grid gap-3 sm:flex sm:flex-wrap">
        <div class="w-full sm:w-auto">
          <app-button
            label="Télécharger"
            icon="fa-solid fa-download"
            variant="outline"
            size="sm"
            [fullWidth]="true"
            [disabled]="!previewUrl() && !downloadUrl()"
            (clicked)="download()"
          ></app-button>
        </div>
        <div class="w-full sm:w-auto">
          <app-button
            label="Ouvrir dans un nouvel onglet"
            icon="fa-solid fa-arrow-up-right-from-square"
            variant="primary"
            size="sm"
            [fullWidth]="true"
            [disabled]="!previewUrl()"
            (clicked)="openInNewTab()"
          ></app-button>
        </div>
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
