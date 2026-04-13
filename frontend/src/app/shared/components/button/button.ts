import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
})
export class Button {
  readonly baseButtonClasses =
    'flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:py-3 sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  readonly label = input('');
  readonly icon = input<string | undefined>(undefined);
  readonly variant = input<'primary' | 'google' | 'outline' | 'danger'>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly iconPosition = input<'left' | 'right'>('left');
  readonly fullWidth = input(true);

  readonly clicked = output<void>();

  get buttonClasses(): string {
    const variantClasses =
      this.variant() === 'primary'
        ? 'bg-primary text-white shadow-card hover:-translate-y-0.5 hover:bg-primary-strong hover:shadow-card-strong focus-visible:ring-primary'
        : this.variant() === 'danger'
          ? 'bg-danger text-white shadow-card hover:-translate-y-0.5 hover:bg-danger-strong hover:shadow-card-strong focus-visible:ring-danger'        : this.variant() === 'outline'
          ? 'border border-line bg-surface text-principalText hover:border-primary-soft hover:bg-primary-soft focus-visible:ring-primary'
          : 'border border-line bg-surface text-principalText shadow-card hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-subtle hover:shadow-card focus-visible:ring-primary';

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
