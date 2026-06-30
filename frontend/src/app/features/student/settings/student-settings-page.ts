import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/auth/services/auth.service';
import { SettingsSectionCard } from '../../../shared/components/settings/settings-section-card';
import { PageHeader } from '../../../shared/components/page-header/page-header';

@Component({
  selector: 'app-student-settings-page',
  imports: [PageHeader, SettingsSectionCard],
  templateUrl: './student-settings-page.html',
  styleUrls: ['../../../shared/components/settings/settings-page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentSettingsPage {
  private readonly authService = inject(AuthService);

  readonly emailNotifications = signal(true);
  readonly sessionReminders = signal(true);

  readonly fullName = computed(() => {
    const user = this.authService.currentUser;
    const parts = [user?.firstName, user?.lastName]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());

    return parts.length > 0 ? parts.join(' ') : 'Etudiant';
  });

  readonly email = computed(() => this.authService.currentUser?.email ?? '-');

  readonly initials = computed(() =>
    this.fullName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'ET',
  );

  toggleEmailNotifications(): void {
    this.emailNotifications.update((value) => !value);
  }

  toggleSessionReminders(): void {
    this.sessionReminders.update((value) => !value);
  }
}
