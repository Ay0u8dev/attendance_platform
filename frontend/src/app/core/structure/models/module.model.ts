export interface Module {
  id: number;
  name: string;
  code: string;
  semester?: number | null;
  hours?: number | null;
  formationId: number;
}

export interface ModuleRequest {
  name: string;
  code: string;
  semester?: number | null;
  hours?: number | null;
  formationId: number;
}
