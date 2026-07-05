import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconButton } from '../button/icon-button';

type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconButton],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly title = input.required<string>();
  readonly description = input('');
  readonly open = input(false);
  readonly size = input<ModalSize>('md');
  readonly closeLabel = input('Fermer');
  readonly showClose = input(true);
  readonly showFooter = input(true);
  readonly closeOnBackdrop = input(true);
  readonly closeOnEscape = input(true);

  readonly closed = output<void>();

  private readonly uid = `modal-${Math.random().toString(36).slice(2)}`;

  get titleId() {
    return `${this.uid}-title`;
  }

  get descriptionId() {
    return `${this.uid}-description`;
  }

  sizeClass(): string {
    switch (this.size()) {
      case 'sm':
        return 'modal-sm';
      case 'lg':
        return 'modal-lg';
      default:
        return 'modal-md';
    }
  }

  onBackdrop(): void {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }

  onEscape(): void {
    if (this.closeOnEscape()) {
      this.closed.emit();
    }
  }
}
