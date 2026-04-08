import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type IconButtonTone = 'primary' | 'secondary' | 'danger' | 'neutral';
type IconButtonSize = 'sm' | 'md';

@Component({
  selector: 'app-icon-button',
  template: `
    <button
      type="button"
      [class]="buttonClasses()"
      [attr.aria-label]="label()"
      [disabled]="disabled()"
    >
      <i [class]="icon()" aria-hidden="true"></i>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButton {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly tone = input<IconButtonTone>('neutral');
  readonly size = input<IconButtonSize>('md');
  readonly disabled = input(false);

  readonly toneClasses = computed(() => {
    switch (this.tone()) {
      case 'primary':
        return 'border-primary bg-primary text-white hover:bg-primary-strong hover:border-primary-strong focus-visible:ring-primary';
      case 'secondary':
        return 'border-secondary bg-secondary text-white hover:bg-secondary-strong hover:border-secondary-strong focus-visible:ring-secondary';
      case 'danger':
        return 'border-danger bg-danger text-white hover:bg-danger-strong hover:border-danger-strong focus-visible:ring-danger';
      default:
        return 'border-line bg-surface-subtle text-secondaryText hover:border-primary-soft hover:bg-primary-soft hover:text-primary focus-visible:ring-primary';
    }
  });

  readonly sizeClasses = computed(() => {
    return this.size() === 'sm' ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';
  });

  readonly disabledClasses = computed(() => {
    return this.disabled() ? 'opacity-50 cursor-not-allowed' : '';
  });

  readonly buttonClasses = computed(() => {
    const baseClasses = 'flex items-center justify-center rounded-2xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
    return `${baseClasses} ${this.toneClasses()} ${this.sizeClasses()} ${this.disabledClasses()}`.trim();
  });
}
