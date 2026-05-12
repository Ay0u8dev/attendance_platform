export interface Formation {
  id: number;
  anneeUniversitaireId: number;
  filiereId?: number | null;
  cycleId: number;
}

export interface FormationRequest {
  anneeUniversitaireId: number;
  filiereId?: number | null;
  cycleId: number;
}
