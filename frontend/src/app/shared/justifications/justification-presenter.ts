import { JustificationDto, JustificationStatus } from '../../core/justifications/justification.model';
import { StudentUser } from '../../core/users/models/student.model';

export type JustificationReviewerRole = 'ADMIN' | 'TEACHER' | 'UNKNOWN';

export interface JustificationStudentDirectory {
  readonly byId: ReadonlyMap<number, StudentUser>;
  readonly byCode: ReadonlyMap<string, StudentUser>;
  readonly byEmail: ReadonlyMap<string, StudentUser>;
}

export interface JustificationStudentPresentation {
  readonly name: string;
  readonly email: string | null;
  readonly code: string | null;
  readonly pfpUrl: string | null;
  readonly formation: string | null;
  readonly className: string | null;
  readonly group: string | null;
  readonly meta: readonly { readonly label: string; readonly value: string }[];
}

export interface JustificationReviewPresentation {
  readonly comment: string | null;
  readonly reviewer: string | null;
  readonly role: JustificationReviewerRole;
  readonly reviewedAt: string | null;
  readonly commentLabel:
    | 'Commentaire de décision'
    | 'Commentaire enseignant'
    | 'Commentaire administrateur'
    | 'Commentaire de révision';
  readonly reviewerRoleLabel: 'Enseignant' | 'Admin' | 'Réviseur';
}

export function normalizeOptional(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function normalizeLookupKey(value: string | number | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

export function buildJustificationStudentDirectory(
  students: readonly StudentUser[] = [],
): JustificationStudentDirectory {
  const byId = new Map<number, StudentUser>();
  const byCode = new Map<string, StudentUser>();
  const byEmail = new Map<string, StudentUser>();

  for (const student of students) {
    byId.set(student.id, student);

    const code = normalizeLookupKey(student.numApogee);
    if (code) {
      byCode.set(code, student);
    }

    const email = normalizeLookupKey(student.email);
    if (email) {
      byEmail.set(email, student);
    }
  }

  return { byId, byCode, byEmail };
}

export function resolveJustificationStudent(
  item: JustificationDto,
  directory: JustificationStudentDirectory,
): StudentUser | null {
  return (
    directory.byId.get(item.studentId) ??
    directory.byCode.get(normalizeLookupKey(item.studentCode)) ??
    directory.byEmail.get(normalizeLookupKey(item.studentEmail)) ??
    null
  );
}

export function presentJustificationStudent(
  item: JustificationDto,
  directory: JustificationStudentDirectory,
): JustificationStudentPresentation {
  const student = resolveJustificationStudent(item, directory);
  const directoryName = student ? [student.firstName, student.lastName].filter(Boolean).join(' ').trim() : null;
  const formation = normalizeOptional(item.studentFormation) ?? normalizeOptional(student?.filiere);
  const className =
    normalizeOptional(item.studentClass) ??
    normalizeOptional(student?.cycle) ??
    normalizeOptional(student?.academicYear);
  const group = normalizeOptional(item.studentGroup) ?? normalizeOptional(student?.groupeName);

  return {
    name:
      normalizeOptional(item.studentName) ??
      normalizeOptional(directoryName) ??
      normalizeOptional(item.studentEmail) ??
      normalizeOptional(student?.email) ??
      `Étudiant #${item.studentId}`,
    email: normalizeOptional(item.studentEmail) ?? normalizeOptional(student?.email),
    code: normalizeOptional(item.studentCode) ?? normalizeOptional(student?.numApogee),
    pfpUrl: normalizeOptional(item.studentProfileImageUrl) ?? normalizeOptional(student?.pfpUrl),
    formation,
    className,
    group,
    meta: [
      formation ? { label: 'Formation', value: formation } : null,
      group ? { label: 'Groupe', value: group } : null,
    ].filter((entry): entry is { readonly label: string; readonly value: string } => entry !== null),
  };
}

export function groupLabelForJustification(
  item: JustificationDto,
  directory: JustificationStudentDirectory,
): string {
  return presentJustificationStudent(item, directory).group ?? (item.groupId ? `Groupe #${item.groupId}` : 'Groupe non renseigné');
}

export function presentJustificationReview(item: JustificationDto): JustificationReviewPresentation {
  const role = normalizeReviewerRole(item.decidedByRole ?? item.reviewerRole);
  const comment = normalizeOptional(item.decisionComment) ?? normalizeOptional(item.teacherComment);

  return {
    comment,
    reviewer: normalizeOptional(item.decidedBy) ?? normalizeOptional(item.reviewedBy),
    role,
    reviewedAt: normalizeOptional(item.decidedAt) ?? normalizeOptional(item.reviewedAt),
    commentLabel: reviewCommentLabel(item.status, role),
    reviewerRoleLabel: role === 'TEACHER' ? 'Enseignant' : role === 'ADMIN' ? 'Admin' : 'Réviseur',
  };
}

export function formatJustificationDate(value: string | null | undefined, fallback = 'Non renseigné'): string {
  const normalized = normalizeOptional(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatJustificationDateTime(value: string | null | undefined, fallback = 'Non renseigné'): string {
  const normalized = normalizeOptional(value);
  if (!normalized) {
    return fallback;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return normalized;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function cleanJustificationAttachmentName(
  documentName: string | null | undefined,
  url: string | null | undefined,
  fallback = 'Aucune pièce jointe',
): string {
  const explicitName = normalizeOptional(documentName);
  if (explicitName) {
    return explicitName;
  }

  const normalizedUrl = normalizeOptional(url);
  if (!normalizedUrl) {
    return fallback;
  }

  const cleanUrl = normalizedUrl.split('?')[0].split('#')[0];
  let name = decodeURIComponent(cleanUrl.split('/').pop() || fallback);
  name = name.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[_-]/i, '');
  name = name.replace(
    /[_-][0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\.[a-zA-Z0-9]+$|$)/i,
    '',
  );
  return name;
}

function normalizeReviewerRole(role: string | null | undefined): JustificationReviewerRole {
  const normalized = normalizeOptional(role)?.toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'TEACHER') {
    return normalized;
  }
  return 'UNKNOWN';
}

function reviewCommentLabel(
  status: JustificationStatus,
  role: JustificationReviewerRole,
): JustificationReviewPresentation['commentLabel'] {
  if (status === 'PENDING') {
    return 'Commentaire de décision';
  }
  if (role === 'TEACHER') {
    return 'Commentaire enseignant';
  }
  if (role === 'ADMIN') {
    return 'Commentaire administrateur';
  }
  return 'Commentaire de révision';
}
