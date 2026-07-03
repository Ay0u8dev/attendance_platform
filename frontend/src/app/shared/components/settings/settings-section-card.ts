import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-settings-section-card',
  template: `
    <article class="settings-section-card">
      <div class="settings-section-header">
        <div class="min-w-0">
          <h2 class="settings-section-title">{{ title() }}</h2>
          @if (description()) {
            <p class="settings-section-description">{{ description() }}</p>
          }
        </div>
        @if (icon()) {
          <span class="settings-section-icon" aria-hidden="true">
            <i [class]="icon()"></i>
          </span>
        }
      </div>

      <div class="settings-section-body">
        <ng-content />
      </div>
    </article>
  `,
  styleUrls: ['./settings-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSectionCard {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly icon = input('');
}
