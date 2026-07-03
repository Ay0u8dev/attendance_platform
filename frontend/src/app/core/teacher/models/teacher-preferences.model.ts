export const SESSION_DURATION_OPTIONS = [
  { value: 60, label: '1h' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2h' },
  { value: 150, label: '2h30' },
  { value: 180, label: '3h' },
] as const;

export type SessionDurationMinutes = (typeof SESSION_DURATION_OPTIONS)[number]['value'];

export interface TeacherPreferencesState {
  readonly sessionDurationMinutes: SessionDurationMinutes;
}

export const DEFAULT_SESSION_DURATION_MINUTES: SessionDurationMinutes = 90;
