import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/auth/services/auth.service';
import {
  SESSION_DURATION_OPTIONS,
  SessionDurationMinutes,
} from '../../../core/teacher/models/teacher-preferences.model';
import { TeacherPreferencesService } from '../../../core/teacher/services/teacher-preferences.service';
import { SettingsSectionCard } from '../../../shared/components/settings/settings-section-card';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ToastService } from '../../../shared/components/toast/toast.service';

@Component({
  selector: 'app-teacher-settings-page',
  imports: [PageHeader, SettingsSectionCard],
  templateUrl: './teacher-settings-page.html',
  styleUrls: [
    '../../../shared/components/settings/settings-page.css',
    '../teacher-page.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSettingsPage {
  private readonly authService = inject(AuthService);
  private readonly teacherPreferences = inject(TeacherPreferencesService);
  private readonly toastService = inject(ToastService);

  readonly emailNotifications = signal(true);
  readonly justificationAlerts = signal(true);
  readonly durationDropdownOpen = signal(false);
  readonly draftDurationMinutes = signal<SessionDurationMinutes>(
    this.teacherPreferences.sessionDurationMinutes(),
  );
  readonly savedMessage = signal<string | null>(null);

  readonly durationOptions = SESSION_DURATION_OPTIONS;

  readonly fullName = computed(() => {
    const user = this.authService.currentUser;
    const parts = [user?.firstName, user?.lastName]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());

    return parts.length > 0 ? parts.join(' ') : 'Enseignant';
  });

  readonly email = computed(() => this.authService.currentUser?.email ?? '-');

  readonly initials = computed(() =>
    this.fullName()
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'PR',
  );

  readonly selectedDurationLabel = computed(
    () =>
      this.durationOptions.find((option) => option.value === this.draftDurationMinutes())?.label ??
      `${this.draftDurationMinutes()} min`,
  );

  readonly schedulePreview = computed(() =>
    this.teacherPreferences.formatScheduleRange(new Date(), this.draftDurationMinutes()),
  );

  readonly hasUnsavedDuration = computed(
    () => this.draftDurationMinutes() !== this.teacherPreferences.sessionDurationMinutes(),
  );

  toggleEmailNotifications(): void {
    this.emailNotifications.update((value) => !value);
  }

  toggleJustificationAlerts(): void {
    this.justificationAlerts.update((value) => !value);
  }

  toggleDurationDropdown(): void {
    this.durationDropdownOpen.update((value) => !value);
  }

  closeDurationDropdown(): void {
    this.durationDropdownOpen.set(false);
  }

  selectDuration(minutes: SessionDurationMinutes): void {
    this.draftDurationMinutes.set(minutes);
    this.closeDurationDropdown();
  }

  saveClassPreferences(): void {
    this.teacherPreferences.setSessionDuration(this.draftDurationMinutes());
    this.savedMessage.set('Preferences de cours enregistrees.');
    this.toastService.success(
      'Preferences mises a jour',
      `Duree de seance fixee a ${this.teacherPreferences.sessionDurationLabel()}.`,
    );

    window.setTimeout(() => this.savedMessage.set(null), 3000);
  }
}
