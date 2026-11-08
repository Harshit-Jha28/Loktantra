export type ReservationCategory =
  | "general"
  | "sc"
  | "st"
  | "sangha";

export interface AssemblyConstituency {
  id: string;
  name: string;
  stateId: string;
  constituencyNumber: number;
  districtNames: string[];
  reservation: ReservationCategory;
  lokSabhaConstituencyId: string | null;
}

export interface LokSabhaConstituency {
  id: string;
  name: string;
  stateId: string;
  constituencyNumber: number;
  districtNames: string[];
  reservation: ReservationCategory;
}

export interface ConstituencySegment {
  id: string;
  lokSabhaConstituencyId: string;
  assemblyConstituencyId: string;
}

export interface ConstituencyDataset {
  version: string;
  snapshotDate: string;
  assemblyConstituencies: AssemblyConstituency[];
  lokSabhaConstituencies: LokSabhaConstituency[];
  segments: ConstituencySegment[];
}

export interface ConstituencyValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  totals: {
    assembly: number;
    lokSabha: number;
    segments: number;
  };
}
