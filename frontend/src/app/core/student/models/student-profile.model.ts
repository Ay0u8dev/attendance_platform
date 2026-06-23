export interface StudentProfile {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  pfpUrl?: string;
  numApogee?: string;
  academicYear?: string;
  cycle?: string;
  filiere?: string;
  groupe?: string;
  faceEnrolled?: boolean;
  faceEnrolledAt?: string;
}
