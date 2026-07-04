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
  readonly studentProfileImageUrl?: string | null;
  readonly studentFormation: string | null;
  readonly studentClass: string | null;
  readonly studentGroup: string | null;
  readonly courseLabel: string;
  readonly roomLabel: string | null;
  readonly absenceStartedAt: string;
  readonly absenceEndedAt: string | null;
  readonly reason: string | null;
  readonly attachmentUrl: string | null;
  readonly status: JustificationStatus;
  readonly decisionComment: string | null;
  readonly decidedBy: string | null;
  readonly decidedByRole: 'ADMIN' | 'TEACHER' | string | null;
  readonly decidedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly module: string;
  readonly sessionDate: string;
  readonly submittedAt: string;
  readonly documentUrl: string | null;
  readonly documentName: string | null;
  readonly downloadUrl: string | null;
  readonly teacherComment: string | null;
  readonly reviewedBy: string | null;
  readonly reviewerRole: string | null;
  readonly reviewedAt: string | null;
}

export interface DecisionJustificationRequest {
  readonly status: Exclude<JustificationStatus, 'PENDING'>;
  readonly comment?: string | null;
}

export interface ReviewJustificationRequest {
  readonly reviewerId?: string;
  readonly reviewerName: string;
  readonly reviewerRole: 'TEACHER' | 'ADMIN';
  readonly comment?: string;
}

export interface SubmitJustificationRequest {
  readonly sessionId: number;
  readonly reason: string;
  readonly documentUrl?: string | null;
}
