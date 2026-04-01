export interface User {
  id: string;
  prenom: string;
  nom: string;
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
