import {
  AttendanceStudentStatus,
  StudentSessionDetailViewModel,
  StudentSessionJustificationInfo,
  StudentSessionListItem,
} from '../../core/attendance/models/student-attendance.model';
import { JustificationDto } from '../../core/justifications/justification.model';

function emptyJustification(): StudentSessionJustificationInfo {
  return {
    justificationStatus: 'Aucune',
    justificationVariant: 'neutral',
    justificationRoute: null,
  };
}

export function enrichSessionListItem(
  row: StudentSessionListItem,
  justifications: readonly JustificationDto[] = [],
): StudentSessionListItem {
  return {
    ...row,
    ...resolveJustification(row.id, row.attendanceStatus, justifications),
  };
}

export function enrichSessionDetail(
  detail: StudentSessionDetailViewModel,
  justifications: readonly JustificationDto[] = [],
): StudentSessionDetailViewModel {
  return {
    ...detail,
    ...resolveJustification(detail.sessionId, detail.raw.attendanceStatus, justifications),
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

export function isAbsenceJustified(
  sessionId: number,
  justifications: readonly JustificationDto[] = [],
): boolean {
  if (justifications && justifications.length > 0) {
    const justification = justifications.find((j) => j.sessionId === sessionId);
    return justification?.status === 'APPROVED';
  }
  return false;
}

function resolveJustification(
  sessionId: number,
  attendanceStatus: AttendanceStudentStatus,
  justifications: readonly JustificationDto[] = [],
): StudentSessionJustificationInfo {
  if (attendanceStatus !== 'ABSENT') {
    return emptyJustification();
  }

  if (justifications && justifications.length > 0) {
    const justification = justifications.find((j) => j.sessionId === sessionId);
    if (justification) {
      const statusMap: Record<string, 'En attente' | 'Acceptée' | 'Refusée'> = {
        PENDING: 'En attente',
        APPROVED: 'Acceptée',
        REJECTED: 'Refusée',
      };
      const variantMap: Record<string, 'neutral' | 'warning' | 'success' | 'error'> = {
        PENDING: 'warning',
        APPROVED: 'success',
        REJECTED: 'error',
      };

      return {
        justificationStatus: statusMap[justification.status] ?? 'En attente',
        justificationVariant: variantMap[justification.status] ?? 'neutral',
        justificationRoute: `/student/justifications/${justification.id}`,
      };
    }
  }

  return emptyJustification();
}
