export type AdminDirectoryStatus = 'Active' | 'Pending' | 'Suspended';
export type StatusVariant = 'success' | 'warning' | 'error' | 'neutral';

export interface AdminStudentDto {
  readonly id: number;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly pfpUrl: string | null;
  readonly numApogee: string;
  readonly roles: readonly string[];
  readonly enabled: boolean;
  readonly firstLogin: boolean;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface AdminStudentRequest {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly pfpUrl?: string | null;
  readonly numApogee: string;
  readonly enabled: boolean;
  readonly firstLogin: boolean;
}

export interface AdminTeacherDto {
  readonly id: number;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly pfpUrl: string | null;
  readonly roles: readonly string[];
  readonly enabled: boolean;
  readonly firstLogin: boolean;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface AdminTeacherRequest {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly pfpUrl?: string | null;
  readonly enabled: boolean;
  readonly firstLogin: boolean;
}

export interface AdminImportResult {
  readonly fileName?: string;
  readonly status?: string;
  readonly totalRows?: number;
  readonly successfulRows?: number;
  readonly failedRows?: number;
  readonly createdStudents?: number;
  readonly updatedStudents?: number;
  readonly createdInscriptions?: number;
  readonly duplicateInscriptions?: number;
  readonly studentsCreated?: number;
  readonly studentsUpdated?: number;
  readonly inscriptionsCreated?: number;
  readonly createdTeachers?: number;
  readonly updatedTeachers?: number;
  readonly createdAssignments?: number;
  readonly duplicateAssignments?: number;
  readonly duplicateAssignmentsInsideFile?: number;
  readonly teachersCreated?: number;
  readonly teachersUpdated?: number;
  readonly assignmentsCreated?: number;
  readonly rowsRejected?: number;
  readonly duplicatesSkipped?: number;
  readonly warningsCount?: number;
  readonly errorsCount?: number;
  readonly missingAcademicYears?: number;
  readonly missingFormations?: number;
  readonly missingGroups?: number;
  readonly missingModules?: number;
  readonly errors?: readonly AdminImportRowError[];
  readonly warnings?: readonly string[];
}

export interface AdminImportRowError {
  readonly rowNumber?: number;
  readonly field?: string;
  readonly message?: string;
}

export function accountStatus(enabled: boolean, firstLogin: boolean): AdminDirectoryStatus {
  if (!enabled) {
    return 'Suspended';
  }

  return firstLogin ? 'Pending' : 'Active';
}

export function accountState(status: AdminDirectoryStatus): { enabled: boolean; firstLogin: boolean } {
  switch (status) {
    case 'Active':
      return { enabled: true, firstLogin: false };
    case 'Pending':
      return { enabled: true, firstLogin: true };
    case 'Suspended':
      return { enabled: false, firstLogin: false };
  }
}

export function statusVariant(status: AdminDirectoryStatus): StatusVariant {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Pending':
      return 'warning';
    case 'Suspended':
      return 'error';
  }
}

export function fullName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  return [firstName, lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .trim();
}

export function initials(name: string): string {
  const computed = name
    .split(' ')
    .filter((part) => !['dr.', 'prof.'].includes(part.toLowerCase()))
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return computed || '??';
}
