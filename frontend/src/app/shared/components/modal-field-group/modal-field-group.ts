import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-modal-field-group',
  standalone: true,
  imports: [NgClass],
  template: `
    <fieldset class="space-y-3">
      <div class="flex items-center gap-2 mt-3">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" [ngClass]="iconBackgroundClass()">
          <i class="text-sm" [ngClass]="iconClass()"></i>
        </div>
        <label [for]="fieldId()" class="block text-sm font-bold text-principalText uppercase tracking-wide">
          {{ label() }}
        </label>
      </div>
      <ng-content></ng-content>
    </fieldset>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalFieldGroup {
  readonly label = input.required<string>();
  readonly iconClass = input.required<string>();
  readonly iconBackgroundClass = input.required<string>();
  readonly fieldId = input.required<string>();
}
