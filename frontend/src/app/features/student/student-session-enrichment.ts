import {
  AttendanceStudentStatus,
  StudentSessionDetailViewModel,
  StudentSessionJustificationInfo,
  StudentSessionListItem,
} from '../../core/attendance/models/student-attendance.model';
import { STUDENT_JUSTIFICATIONS } from './student-demo.data';

const JUSTIFICATION_ROUTES_BY_SESSION_ID: Record<number, string> = {
  1: '/student/justifications/just-001',
  4: '/student/justifications/just-002',
  6: '/student/justifications/just-003',
};

const JUSTIFICATION_BY_SESSION_ID = new Map(
  STUDENT_JUSTIFICATIONS.filter(
    (item): item is typeof item & { readonly sessionId: number } => item.sessionId !== undefined,
  ).map((item) => [item.sessionId, item]),
);

function emptyJustification(): StudentSessionJustificationInfo {
  return {
    justificationStatus: 'Aucune',
    justificationVariant: 'neutral',
    justificationRoute: null,
  };
}

export function enrichSessionListItem(row: StudentSessionListItem): StudentSessionListItem {
  return {
    ...row,
    ...resolveJustification(row.id, row.attendanceStatus),
  };
}

export function enrichSessionDetail(
  detail: StudentSessionDetailViewModel,
): StudentSessionDetailViewModel {
  return {
    ...detail,
    ...resolveJustification(detail.sessionId, detail.raw.attendanceStatus),
  };
}

export function shouldShowJustificationCard(
  session: Pick<StudentSessionDetailViewModel, 'raw'>,
): boolean {
  return session.raw.attendanceStatus === 'ABSENT';
}

export function canOpenJustification(
  session: Pick<StudentSessionDetailViewModel, 'raw' | 'justificationRoute'>,
): boolean {
  return session.raw.attendanceStatus === 'ABSENT' && !!session.justificationRoute;
}

function resolveJustification(
  sessionId: number,
  attendanceStatus: AttendanceStudentStatus,
): StudentSessionJustificationInfo {
  if (attendanceStatus !== 'ABSENT') {
    return emptyJustification();
  }

  const justification = JUSTIFICATION_BY_SESSION_ID.get(sessionId);
  if (!justification) {
    return emptyJustification();
  }

  return {
    justificationStatus: justification.status,
    justificationVariant: justification.statusVariant,
    justificationRoute: JUSTIFICATION_ROUTES_BY_SESSION_ID[sessionId] ?? null,
  };
}
