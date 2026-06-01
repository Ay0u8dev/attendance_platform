export interface StudentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  pfpUrl?: string | null;
  numApogee: string;
  roles: string[];
  enabled: boolean;
  firstLogin: boolean;
  createdAt?: string;
  updatedAt?: string;
}
