import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
})
export class Button {
  readonly label = input('');
  readonly icon = input<string | undefined>(undefined);
  readonly variant = input<'primary' | 'google' | 'outline' | 'danger'>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly iconPosition = input<'left' | 'right'>('left');
  readonly fullWidth = input(true);
  readonly motion = input(true);

  readonly clicked = output<void>();

  get baseButtonClasses(): string {
    const motionClasses = this.motion() ? ' transition-all duration-200' : '';
    return (
      'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold' +
      motionClasses +
      ' sm:py-3 sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
    );
  }

  get buttonClasses(): string {
    const motion = this.motion();
    const primaryMotion = motion
      ? ' hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card-strong'
      : ' hover:bg-primary-strong';
    const dangerMotion = motion
      ? ' hover:-translate-y-0.5 hover:bg-danger-strong hover:shadow-card-strong'
      : ' hover:bg-danger-strong';
    const neutralMotion = motion
      ? ' hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-subtle hover:shadow-card'
      : ' hover:border-line-strong hover:bg-surface-subtle';

    const variantClasses =
      this.variant() === 'primary'
        ? 'bg-primary text-white shadow-card' + primaryMotion + ' focus-visible:ring-primary'
        : this.variant() === 'danger'
          ? 'bg-danger text-white shadow-card' + dangerMotion + ' focus-visible:ring-danger'
          : this.variant() === 'outline'
            ? 'border border-line bg-surface text-principalText hover:border-primary-soft hover:bg-primary-soft focus-visible:ring-primary'
            : 'border border-line bg-surface text-principalText shadow-card' +
              neutralMotion +
              ' focus-visible:ring-primary';

    const disabledClasses = this.disabled() ? ' opacity-50 cursor-not-allowed' : '';
    return variantClasses + disabledClasses;
  }

  get widthClasses(): string {
    return this.fullWidth() ? ' w-full' : '';
  }

  handleClick() {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
