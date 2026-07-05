export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  email: string;
  role: Role;
  firstLogin: boolean;
}

export enum Role {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export interface BackendAuthResponse {
  accessToken: string;
}
