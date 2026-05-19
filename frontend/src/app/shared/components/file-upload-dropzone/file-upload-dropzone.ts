import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-file-upload-dropzone',
  template: `
    <section
      class="rounded-[1.75rem] border border-dashed border-line bg-surface-subtle px-6 py-8 text-center"
    >
      <div
        class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary"
      >
        <i class="fa-solid fa-cloud-arrow-up text-lg" aria-hidden="true"></i>
      </div>
      <p class="mt-4 text-base font-semibold text-principalText">{{ title() }}</p>
      <p class="mt-2 text-sm leading-6 text-secondaryText">{{ helper() }}</p>

      <label
        class="mt-5 inline-flex cursor-pointer items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-principalText transition-colors duration-200 hover:border-primary-soft hover:bg-primary-soft"
      >
        <input type="file" class="sr-only" [accept]="accept()" (change)="handleChange($event)" />
        Choisir un fichier
      </label>

      @if (selectedFileName()) {
        <p class="mt-4 text-sm font-medium text-primary">{{ selectedFileName() }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileUploadDropzone {
  readonly title = input('Déposez un justificatif');
  readonly helper = input(
    'Formats acceptés : PDF, PNG ou JPG. Une pièce jointe claire vous évite des allers-retours inutiles.',
  );
  readonly accept = input('.pdf,.png,.jpg,.jpeg');
  readonly selectedFileName = input('');

  readonly fileSelected = output<File | null>();

  handleChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.fileSelected.emit(target.files?.item(0) ?? null);
  }
}
