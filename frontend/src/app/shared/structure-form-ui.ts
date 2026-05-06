export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function hasMinimumLength(value: string, minimumLength: number): boolean {
  return normalizeLabel(value).length >= minimumLength;
}

export function structureInputClass(invalid = false): string {
  const baseClasses =
    'w-full rounded-xl border bg-surface px-3.5 py-3 text-sm font-medium text-principalText shadow-sm outline-none transition placeholder:text-muted disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-muted focus:ring-2 focus:ring-offset-0';
  const stateClasses = invalid
    ? 'border-danger bg-danger/5 focus:border-danger focus:ring-danger/20'
    : 'border-line hover:border-line-strong focus:border-primary focus:ring-primary/15';

  return `${baseClasses} ${stateClasses}`;
}
