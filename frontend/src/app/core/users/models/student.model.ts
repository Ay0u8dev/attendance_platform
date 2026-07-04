export interface StudentUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  academicYear?: string | null;
  cycle?: string | null;
  filiere?: string | null;
  groupeName?: string | null;
  pfpUrl?: string | null;
  numApogee: string;
  roles: string[];
  enabled: boolean;
  firstLogin: boolean;
  createdAt?: string;
  updatedAt?: string;
}
