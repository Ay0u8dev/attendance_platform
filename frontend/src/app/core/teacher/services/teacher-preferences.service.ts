import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import {
  DEFAULT_SESSION_DURATION_MINUTES,
  SESSION_DURATION_OPTIONS,
  SessionDurationMinutes,
  TeacherPreferencesState,
} from '../models/teacher-preferences.model';

const STORAGE_KEY = 'teacher-preferences';

@Injectable({ providedIn: 'root' })
export class TeacherPreferencesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly sessionDurationMinutes = signal<SessionDurationMinutes>(
    this.loadPreferences().sessionDurationMinutes,
  );

  readonly sessionDurationOptions = SESSION_DURATION_OPTIONS;

  readonly sessionDurationLabel = computed(
    () =>
      this.sessionDurationOptions.find(
        (option) => option.value === this.sessionDurationMinutes(),
      )?.label ?? `${this.sessionDurationMinutes()} min`,
  );

  readonly sessionDurationHoursLabel = computed(() => {
    const minutes = this.sessionDurationMinutes();
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (remainder === 0) {
      return `${hours}h`;
    }
    return `${hours}h${remainder.toString().padStart(2, '0')}`;
  });

  setSessionDuration(minutes: SessionDurationMinutes): void {
    this.sessionDurationMinutes.set(minutes);
    this.persistPreferences({ sessionDurationMinutes: minutes });
  }

  formatEndTime(startDate: Date = new Date()): string {
    const endDate = new Date(startDate.getTime() + this.sessionDurationMinutes() * 60_000);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(endDate);
  }

  formatScheduleRange(startDate: Date = new Date(), durationMinutes = this.sessionDurationMinutes()): string {
    const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
    const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${dateFormatter.format(startDate)}, ${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  }

  private loadPreferences(): TeacherPreferencesState {
    if (!this.isBrowser) {
      return { sessionDurationMinutes: DEFAULT_SESSION_DURATION_MINUTES };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { sessionDurationMinutes: DEFAULT_SESSION_DURATION_MINUTES };
      }

      const parsed = JSON.parse(raw) as Partial<TeacherPreferencesState>;
      const isValidDuration = SESSION_DURATION_OPTIONS.some(
        (option) => option.value === parsed.sessionDurationMinutes,
      );

      return {
        sessionDurationMinutes: isValidDuration
          ? (parsed.sessionDurationMinutes as SessionDurationMinutes)
          : DEFAULT_SESSION_DURATION_MINUTES,
      };
    } catch {
      return { sessionDurationMinutes: DEFAULT_SESSION_DURATION_MINUTES };
    }
  }

  private persistPreferences(state: TeacherPreferencesState): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
