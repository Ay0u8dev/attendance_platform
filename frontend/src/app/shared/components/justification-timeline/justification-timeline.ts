import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type TimelineItem = {
  readonly title: string;
  readonly description: string;
  readonly meta: string;
  readonly state: 'done' | 'current' | 'upcoming' | 'approved' | 'rejected';
};

@Component({
  selector: 'app-justification-timeline',
  host: {
    class: 'block',
  },
  template: `
    <section class="rounded-[1.75rem] border border-line bg-surface p-5 shadow-card">
      <p class="text-xs font-semibold uppercase tracking-[0.16em] text-secondaryText">
        Historique du traitement
      </p>

      <div class="mt-5 space-y-5">
        @for (item of items(); track $index) {
          <div class="flex gap-4">
            <div class="flex flex-col items-center">
              <span
                class="flex h-10 w-10 items-center justify-center rounded-full border"
                [class]="dotClasses(item.state)"
              >
                <i
                  class="fa-solid text-xs"
                  [class.fa-check]="item.state === 'done' || item.state === 'approved'"
                  [class.fa-xmark]="item.state === 'rejected'"
                  [class.fa-clock]="item.state === 'current'"
                  [class.fa-ellipsis]="item.state === 'upcoming'"
                  aria-hidden="true"
                ></i>
              </span>

              @if (!$last) {
                <span class="mt-2 h-10 w-px bg-line"></span>
              }
            </div>

            <div class="min-w-0 flex-1 pb-2">
              <div class="flex flex-wrap items-center gap-2">
                <p class="text-sm font-semibold text-principalText">{{ item.title }}</p>
                <span class="text-xs text-secondaryText">{{ item.meta }}</span>
              </div>
              <p class="mt-1 text-sm leading-6 text-secondaryText">{{ item.description }}</p>
            </div>
          </div>
        }
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JustificationTimeline {
  readonly items = input.required<readonly TimelineItem[]>();

  dotClasses(state: TimelineItem['state']): string {
    switch (state) {
      case 'done':
        return 'border-secondary-soft bg-secondary-soft text-secondary-strong';
      case 'approved':
        return 'border-secondary-soft bg-secondary-soft text-secondary-strong';
      case 'rejected':
        return 'border-danger-soft bg-danger-soft text-danger';
      case 'current':
        return 'border-primary-soft bg-primary-soft text-primary';
      default:
        return 'border-line bg-surface-subtle text-secondaryText';
    }
  }
}
