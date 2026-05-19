import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-student-alert-banner',
  template: `
    <article
      class="flex flex-col gap-5 rounded-[1.4rem] border border-[#f9c995] bg-[#fff7ef] px-5 py-5 shadow-card md:flex-row md:items-center md:justify-between md:px-6"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffedd5] text-[1.35rem] text-[#f97316]"
        >
          <i [class]="icon()" aria-hidden="true"></i>
        </div>

        <div class="space-y-1">
          <h2 class="text-lg font-semibold tracking-tight text-[#8f3b18]">{{ title() }}</h2>
          @if (description()) {
            <p class="max-w-2xl text-sm leading-6 text-[#ea580c]">{{ description() }}</p>
          }
        </div>
      </div>

      @if (actionLabel()) {
        <div class="shrink-0">
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-[0.75rem] bg-[#f97316] px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(249,115,22,0.28)] transition-all duration-200 hover:bg-[#ea580c] hover:shadow-[0_14px_28px_rgba(249,115,22,0.34)]"
            (click)="actionClicked.emit()"
          >
            @if (actionIcon()) {
              <i [class]="actionIcon()" aria-hidden="true"></i>
            }
            <span>{{ actionLabel() }}</span>
          </button>
        </div>
      }
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentAlertBanner {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input('');
  readonly actionIcon = input<string | undefined>(undefined);
  readonly icon = input('fa-solid fa-triangle-exclamation');

  readonly actionClicked = output<void>();
}
