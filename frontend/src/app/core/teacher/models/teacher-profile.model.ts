export interface TeacherProfile {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  pfpUrl?: string | null;
  enabled: boolean;
  firstLogin: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  moduleCount: number;
  groupCount: number;
  formationCount: number;
  modules: string[];
  groupes: string[];
  formations: string[];
  filieres: string[];
}
