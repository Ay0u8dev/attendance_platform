import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
})
export class Button {
  readonly baseButtonClasses =
    'w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-lg transition-all duration-200 text-sm sm:text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  readonly label = input('');
  readonly icon = input<string | undefined>(undefined);
  readonly variant = input<'primary' | 'google' | 'outline'>('primary');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly iconPosition = input<'left' | 'right'>('left');

  readonly clicked = output<void>();

  get buttonClasses(): string {
    const variantClasses =
      this.variant() === 'primary'
        ? 'bg-primary hover:bg-PRIM-700 text-white hover:shadow-blue-500/30 hover:-translate-y-0.5 focus-visible:ring-primary'
        : this.variant() === 'outline'
          ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400'
          : 'bg-white border border-gray-300 text-gray-700 hover:shadow-md hover:-translate-y-0.5 focus-visible:ring-gray-400';

    const disabledClasses = this.disabled() ? ' opacity-50 cursor-not-allowed' : '';
    return variantClasses + disabledClasses;
  }

  handleClick() {
    if (!this.disabled()) {
      this.clicked.emit();
    }
  }
}
