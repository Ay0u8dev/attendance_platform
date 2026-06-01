export interface Groupe {
  id: number;
  name: string;
  formationId: number;
}

export interface GroupeRequest {
  name: string;
  formationId: number;
}
