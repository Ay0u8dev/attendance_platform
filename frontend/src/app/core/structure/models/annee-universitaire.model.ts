export interface AnneeUniversitaire {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface AnneeUniversitaireRequest {
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}
