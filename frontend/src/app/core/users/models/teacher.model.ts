export interface TeacherUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  pfpUrl?: string | null;
  roles: string[];
  enabled: boolean;
  firstLogin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherRequest {
  email: string;
  firstName: string;
  lastName: string;
  pfpUrl?: string | null;
}
