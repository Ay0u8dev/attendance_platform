export type JustificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JustificationDto {
  readonly id: number;
  readonly attendanceRecordId: number | null;
  readonly sessionId: number | null;
  readonly studentId: number;
  readonly groupId: number | null;
  readonly teacherId: number | null;
  readonly teacherName: string | null;
  readonly studentName: string;
  readonly studentEmail: string | null;
  readonly studentCode: string | null;
  readonly courseLabel: string;
  readonly roomLabel: string | null;
  readonly absenceStartedAt: string;
  readonly absenceEndedAt: string | null;
  readonly reason: string | null;
  readonly attachmentUrl: string | null;
  readonly status: JustificationStatus;
  readonly decisionComment: string | null;
  readonly decidedBy: string | null;
  readonly decidedByRole: 'ADMIN' | 'TEACHER' | null;
  readonly decidedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DecisionJustificationRequest {
  readonly status: Exclude<JustificationStatus, 'PENDING'>;
  readonly comment?: string | null;
}

export interface SubmitJustificationRequest {
  readonly sessionId: number;
  readonly reason: string;
  readonly documentUrl?: string | null;
}
