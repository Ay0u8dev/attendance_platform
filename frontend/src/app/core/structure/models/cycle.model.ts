export type CycleType = 'PREPA' | 'INGENIEUR';

export interface Cycle {
  id: number;
  code: string;
  name: string;
  type: CycleType;
}

export interface CycleRequest {
  code: string;
  name: string;
  type: CycleType;
}
