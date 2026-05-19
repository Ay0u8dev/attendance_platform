export type AttendanceStudentStatus = 'UNKNOWN' | 'PRESENT' | 'ABSENT';
export type AttendanceSessionMethod = 'QR_CODE' | 'FACE_ID' | 'MANUAL';
export type AttendanceSessionStatus = 'ACTIVE' | 'FINALIZED';

export interface PagedResponseDto<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

export interface StudentAttendanceSessionSummaryDto {
  readonly sessionId: number;
  readonly teacherFullName: string | null;
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly groupIds: readonly number[];
  readonly sessionMethod: AttendanceSessionMethod;
  readonly sessionStatus: AttendanceSessionStatus;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly attendanceStatus: AttendanceStudentStatus;
  readonly markMethod: AttendanceSessionMethod;
  readonly markedAt: string | null;
}

export interface StudentAttendanceSessionDetailDto {
  readonly sessionId: number;
  readonly teacherFullName: string | null;
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly groupIds: readonly number[];
  readonly sessionMethod: AttendanceSessionMethod;
  readonly sessionStatus: AttendanceSessionStatus;
  readonly startedAt: string;
  readonly endsAt: string;
  readonly endedAt: string | null;
  readonly studentId: number;
  readonly groupId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly pfpUrl: string | null;
  readonly numApogee: string;
  readonly attendanceStatus: AttendanceStudentStatus;
  readonly markMethod: AttendanceSessionMethod;
  readonly deviceId: string | null;
  readonly markedGpsLat: string | null;
  readonly markedGpsLon: string | null;
  readonly markedAt: string | null;
}

export interface StudentAttendanceOverviewDto {
  readonly totalSessions: number;
  readonly presents: number;
  readonly absences: number;
  readonly attendanceRate: number;
}

export interface StudentAttendanceSessionQuery {
  readonly status?: AttendanceStudentStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
}

export type AttendanceBadgeVariant = 'success' | 'error' | 'neutral';
export type StudentJustificationStatus = 'Aucune' | 'En attente' | 'Acceptée' | 'Refusée';
export type StudentJustificationVariant = 'neutral' | 'warning' | 'success' | 'error';

export interface StudentSessionJustificationInfo {
  readonly justificationStatus: StudentJustificationStatus;
  readonly justificationVariant: StudentJustificationVariant;
  readonly justificationRoute: string | null;
}

export interface StudentSessionListItem {
  readonly id: number;
  readonly teacherFullName: string;
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly groupSummary: string;
  readonly dateLabel: string;
  readonly timeLabel: string;
  readonly attendanceLabel: string;
  readonly attendanceVariant: AttendanceBadgeVariant;
  readonly sessionMethodLabel: string;
  readonly markMethodLabel: string;
  readonly startedAt: string;
  readonly endedAt: string | null;
  readonly markedAt: string | null;
  readonly attendanceStatus: AttendanceStudentStatus;
  readonly sessionMethod: AttendanceSessionMethod;
  readonly markMethod: AttendanceSessionMethod;
  readonly justificationStatus?: StudentJustificationStatus;
  readonly justificationVariant?: StudentJustificationVariant;
  readonly justificationRoute?: string | null;
}

export interface StudentSessionDetailViewModel {
  readonly sessionId: number;
  readonly teacherFullName: string;
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly groupSummary: string;
  readonly attendanceLabel: string;
  readonly attendanceVariant: AttendanceBadgeVariant;
  readonly sessionMethodLabel: string;
  readonly markMethodLabel: string;
  readonly sessionScheduleLabel: string;
  readonly startedAtLabel: string;
  readonly endsAtLabel: string;
  readonly endedAtLabel: string | null;
  readonly markedAtLabel: string | null;
  readonly studentFullName: string;
  readonly studentEmail: string;
  readonly numApogee: string;
  readonly deviceId: string | null;
  readonly gpsLabel: string | null;
  readonly justificationStatus?: StudentJustificationStatus;
  readonly justificationVariant?: StudentJustificationVariant;
  readonly justificationRoute?: string | null;
  readonly raw: StudentAttendanceSessionDetailDto;
}

export interface StudentSessionsOverviewViewModel {
  readonly totalSessions: number;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly attendanceRateLabel: string;
}
