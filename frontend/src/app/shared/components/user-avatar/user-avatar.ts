import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export type UserAvatarSize = 'sm' | 'md' | 'lg';
export type UserAvatarShape = 'circle' | 'rounded';

@Component({
  selector: 'app-user-avatar',
  template: `
    @if (visibleImageUrl(); as imageUrl) {
      <img
        class="user-avatar__image"
        [src]="imageUrl"
        [alt]="resolvedAlt()"
        (error)="onImageError(imageUrl)"
      />
    } @else {
      <span class="user-avatar__fallback" aria-hidden="true">{{ initials() }}</span>
    }
  `,
  styleUrl: './user-avatar.css',
  host: {
    '[class]': 'hostClasses()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAvatar {
  readonly name = input('');
  readonly imageUrl = input<string | null | undefined>(null);
  readonly size = input<UserAvatarSize>('md');
  readonly shape = input<UserAvatarShape>('circle');
  readonly alt = input<string | null | undefined>(null);

  private readonly failedImageUrl = signal<string | null>(null);

  readonly normalizedImageUrl = computed(() => this.imageUrl()?.trim() || null);

  readonly visibleImageUrl = computed(() => {
    const imageUrl = this.normalizedImageUrl();
    return imageUrl && imageUrl !== this.failedImageUrl() ? imageUrl : null;
  });

  readonly resolvedAlt = computed(() => this.alt()?.trim() || this.name().trim() || 'Profile photo');

  readonly initials = computed(() => {
    const computedInitials = this.name()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return computedInitials || '??';
  });

  readonly hostClasses = computed(() =>
    ['user-avatar', `user-avatar--${this.size()}`, `user-avatar--${this.shape()}`].join(' '),
  );

  onImageError(imageUrl: string): void {
    this.failedImageUrl.set(imageUrl);
  }
}
