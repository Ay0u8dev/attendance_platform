export type AttendanceSessionMethod = 'QR_CODE' | 'FACE_ID' | 'MANUAL';
export type AttendanceSessionStatus = 'ACTIVE' | 'FINALIZED';
export type AttendanceStudentStatus = 'UNKNOWN' | 'PRESENT' | 'ABSENT' | 'JUSTIFIED';

export interface CreateAttendanceSessionRequest {
  groupIds: number[];
  courseLabel: string;
  roomLabel: string;
  gpsLat: string;
  gpsLon: string;
  method?: AttendanceSessionMethod;
}

export interface AttendanceStudentView {
  studentId: number;
  groupId: number;
  firstName: string;
  lastName: string;
  email: string;
  pfpUrl?: string | null;
  numApogee: string;
  status: AttendanceStudentStatus;
  markMethod?: AttendanceSessionMethod | 'MANUAL' | null;
  deviceId?: string | null;
  markedGpsLat?: string | null;
  markedGpsLon?: string | null;
  markedAt?: string | null;
}

export interface AttendanceSessionResponse {
  id?: number;
  sessionId: number;
  teacherId: number;
  groupIds: number[];
  courseLabel: string;
  roomLabel?: string | null;
  gpsLat?: string | null;
  gpsLon?: string | null;
  startedAt: string;
  endsAt?: string | null;
  endedAt?: string | null;
  method: AttendanceSessionMethod;
  status: AttendanceSessionStatus;
  studentCount?: number;
  presentCount?: number;
  absentCount?: number;
  unknownCount?: number;
  students?: AttendanceStudentView[];
}

export interface AttendanceSessionSummary {
  sessionId: number;
  courseLabel: string;
  roomLabel?: string | null;
  groupIds: number[];
  method: AttendanceSessionMethod;
  status: AttendanceSessionStatus;
  startedAt: string;
  endedAt?: string | null;
  presentCount: number;
  absentCount: number;
  unknownCount: number;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface TeacherSessionsQuery {
  status?: AttendanceSessionStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface ManualAttendanceUpdateRequest {
  studentId: number;
  status: Exclude<AttendanceStudentStatus, 'UNKNOWN' | 'JUSTIFIED'>;
}

export interface AttendanceUpdateResponse {
  sessionId: number;
  studentId: number;
  status: AttendanceStudentStatus;
  markMethod: 'MANUAL' | AttendanceSessionMethod;
  deviceId?: string | null;
  markedGpsLat?: string | null;
  markedGpsLon?: string | null;
  markedAt: string;
  presentCount: number;
  absentCount: number;
  unknownCount: number;
}

export interface TeacherAttendanceReportDto {
  generatedAt: string;
  filieres: TeacherAttendanceReportFiliereDto[];
}

export interface TeacherAttendanceReportFiliereDto {
  filiere: string;
  sessions: TeacherAttendanceReportSessionDto[];
  students: TeacherAttendanceReportStudentDto[];
}

export interface TeacherAttendanceReportSessionDto {
  sessionId: number;
  courseLabel: string;
  roomLabel?: string | null;
  startedAt: string;
  endedAt?: string | null;
}

export interface TeacherAttendanceReportStudentDto {
  studentId: number;
  numApogee: string;
  firstName: string;
  lastName: string;
  email: string;
  groupId: number;
  groupeName?: string | null;
  statusesBySessionId: Record<string, AttendanceStudentStatus>;
}
