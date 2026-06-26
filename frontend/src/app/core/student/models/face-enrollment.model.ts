export interface FaceEnrollmentResponse {
  readonly studentId: number;
  readonly enrolled: boolean;
  readonly firstLogin: boolean;
  readonly faceEnrolledAt: string;
  readonly authenticationRefreshRequired: boolean;
}
