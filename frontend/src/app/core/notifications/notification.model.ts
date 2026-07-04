export type NotificationType =
  | 'ATTENDANCE_SESSION_STARTED'
  | 'ATTENDANCE_SESSION_FINALIZED'
  | 'ATTENDANCE_STATUS_CONFIRMED'
  | 'ATTENDANCE_STATUS_UPDATED'
  | 'ABSENCE_RECORDED'
  | 'JUSTIFICATION_SUBMITTED'
  | 'JUSTIFICATION_REVIEW_REQUESTED'
  | 'JUSTIFICATION_APPROVED'
  | 'JUSTIFICATION_REJECTED'
  | 'JUSTIFICATION_STATUS_CHANGED'
  | 'SYSTEM_ALERT';

export type RecipientRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER' | 'NEUTRAL';

export interface AppNotification {
  id: number;
  recipientUserId: number;
  recipientRole: RecipientRole;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  metadataJson: string | null;
  readAt: string | null;
  createdAt: string;
  read: boolean;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface ReadAllNotificationsResponse {
  updatedCount: number;
}

export interface DeleteNotificationsResponse {
  deletedCount: number;
}
