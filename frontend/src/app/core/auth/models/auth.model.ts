export interface User {
  id: string;
  prenom?: string;
  nom?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: Role;
}

export enum Role {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
}

export interface BackendAuthResponse {
  accessToken: string;
}
