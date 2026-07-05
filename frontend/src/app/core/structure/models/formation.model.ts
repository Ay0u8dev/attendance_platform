export interface Formation {
  id: number;
  name: string;
  anneeUniversitaireId: number;
  filiereId?: number | null;
  cycleId: number;
}

export interface FormationRequest {
  name: string;
  anneeUniversitaireId: number;
  filiereId?: number | null;
  cycleId: number;
}
