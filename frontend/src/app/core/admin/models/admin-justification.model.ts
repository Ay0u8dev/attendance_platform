export type AdminJustificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AdminJustificationDto {
  readonly id: number;
  readonly sessionId: number;
  readonly studentId: number;
  readonly groupId: number;
  readonly studentFirstName: string;
  readonly studentLastName: string;
  readonly studentEmail: string;
  readonly numApogee: string;
  readonly courseLabel: string;
  readonly roomLabel: string;
  readonly teacherFullName: string;
  readonly absenceStartedAt: string;
  readonly absenceEndedAt: string | null;
  readonly motive: string;
  readonly attachmentLabel: string | null;
  readonly status: AdminJustificationStatus;
  readonly adminComment: string | null;
  readonly reviewedBy: number | null;
  readonly reviewedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AdminJustificationReviewRequest {
  readonly status: Exclude<AdminJustificationStatus, 'PENDING'>;
  readonly adminComment?: string | null;
}
