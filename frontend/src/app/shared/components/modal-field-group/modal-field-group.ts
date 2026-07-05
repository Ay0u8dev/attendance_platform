import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-modal-field-group',
  standalone: true,
  imports: [NgClass],
  template: `
    <fieldset class="group flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <label
          [for]="fieldId()"
          class="flex items-center gap-2.5 text-sm font-semibold text-principalText transition-colors group-focus-within:text-primary"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line transition-colors group-focus-within:border-primary/30"
            [ngClass]="iconBackgroundClass()"
          >
            <i class="text-[13px]" [ngClass]="iconClass()"></i>
          </div>

          <span class="relative">
            {{ label() }}
            @if (required()) {
              <span class="text-danger" aria-hidden="true">*</span>
            }
          </span>
        </label>

        @if (optional() && !required()) {
          <span class="text-[11px] font-medium uppercase tracking-wider text-muted/60">Optionnel</span>
        }
      </div>

      <div class="relative">
        <ng-content></ng-content>
      </div>

      <div class="min-h-[18px] px-1 mb-1">
        @if (error()) {
          <p class="flex items-center gap-1.5 text-xs font-semibold text-danger">
            <i class="fa-solid fa-circle-exclamation text-[10px]"></i>
            {{ error() }}
          </p>
        } @else if (helper()) {
          <p class="text-xs font-medium text-secondaryText/80 transition-opacity">
            {{ helper() }}
          </p>
        }
      </div>
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalFieldGroup {
  readonly label = input.required<string>();
  readonly iconClass = input.required<string>();
  readonly iconBackgroundClass = input.required<string>();
  readonly fieldId = input.required<string>();
  readonly helper = input('');
  readonly error = input('');
  readonly required = input(false);
  readonly optional = input(false); // Added an optional flag for UI flexibility
}
