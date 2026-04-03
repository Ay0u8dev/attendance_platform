import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-quick-action-tile',
  imports: [RouterLink],
  template: `
    <a
      class="group flex min-h-28 flex-col items-start justify-between rounded-3xl border border-line bg-surface p-5 shadow-card transition-colors duration-200 hover:bg-surface-subtle"
      [routerLink]="route()"
    >
      <span
        class="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-subtle text-primary transition-colors duration-200 group-hover:bg-surface"
      >
        <i [class]="icon()" aria-hidden="true"></i>
      </span>

      <div class="space-y-1.5">
        <h3 class="text-sm font-semibold text-principalText sm:text-base">{{ label() }}</h3>
        <p class="text-xs leading-5 text-secondaryText sm:text-sm">{{ description() }}</p>
        <p
          class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-primary"
        >
          Open
          <i class="fa-solid fa-arrow-right text-[0.6rem]" aria-hidden="true"></i>
        </p>
      </div>
    </a>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionTile {
  readonly label = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input.required<string>();
  readonly route = input.required<string>();
}
