export type JustificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JustificationDto {
  readonly id: number;
  readonly sessionId: number | null;
  readonly studentId: number;
  readonly studentName: string;
  readonly studentEmail: string | null;
  readonly studentCode: string | null;
  readonly studentFormation: string | null;
  readonly studentClass: string | null;
  readonly studentGroup: string | null;
  readonly module: string;
  readonly sessionDate: string;
  readonly status: JustificationStatus;
  readonly reason: string | null;
  readonly submittedAt: string;
  readonly documentUrl: string | null;
  readonly documentName: string | null;
  readonly downloadUrl: string | null;
  readonly teacherComment: string | null;
  readonly reviewedBy: string | null;
  readonly reviewerRole: string | null;
  readonly reviewedAt: string | null;
}

export interface ReviewJustificationRequest {
  readonly reviewerId?: string;
  readonly reviewerName: string;
  readonly reviewerRole: 'TEACHER' | 'ADMIN';
  readonly comment?: string;
}
