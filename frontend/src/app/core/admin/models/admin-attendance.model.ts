export type AttendanceSessionStatus = 'ACTIVE' | 'FINALIZED';
export type AttendanceStudentStatus = 'UNKNOWN' | 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
export type AttendanceMarkMethod = 'QR_CODE' | 'FACE_ID' | 'MANUAL' | null;

export interface PagedResponseDto<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

export interface AdminAttendanceOverviewDto {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly finalizedSessions: number;
  readonly totalPresentMarks: number;
  readonly totalAbsentMarks: number;
  readonly attendanceRate: number;
}

export interface AdminAttendanceSessionSummaryDto {
  readonly sessionId: number;
  readonly teacherFullName: string | null;
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly groupIds: readonly number[];
  readonly status: AttendanceSessionStatus;
  readonly startedAt: string;
  readonly endsAt: string;
  readonly endedAt: string | null;
  readonly presentCount: number;
  readonly absentCount: number;
  readonly unknownCount: number;
}

export interface AdminAttendanceStudentViewDto {
  readonly studentId: number;
  readonly groupId: number;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly pfpUrl: string | null;
  readonly numApogee: string;
  readonly status: AttendanceStudentStatus;
  readonly markMethod: AttendanceMarkMethod;
  readonly markedAt: string | null;
}

export interface AdminAttendanceSessionDetailsDto extends AdminAttendanceSessionSummaryDto {
  readonly teacherId: number;
  readonly gpsLat: string | null;
  readonly gpsLon: string | null;
  readonly students: readonly AdminAttendanceStudentViewDto[];
}

export interface AdminStudentAttendanceSummaryDto {
  readonly studentId: number;
  readonly totalSessions: number;
  readonly totalPresents: number;
  readonly totalAbsences: number;
  readonly justifiedAbsences: number;
  readonly unjustifiedAbsences: number;
  readonly totalAbsenceHours: number;
  readonly attendanceRate: number;
  readonly lastAbsenceAt: string | null;
}
