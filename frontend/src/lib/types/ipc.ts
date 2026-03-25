export interface Patient {
  id: string;
  mrn?: string;
  name?: string; // Calculated in backend for list view
  first_name?: string;
  last_name?: string;
  dob?: string;
  age?: number; // Calculated in backend for list view
  gender?: string;
  created_at?: string;
  condition?: string;
  encounters?: Encounter[];
}

export interface Encounter {
  id: string;
  patient_id: string;
  admission_date: string;
  discharge_date?: string;
  notes?: string;
  diagnosis?: string;
}

export interface RiskAssessment {
  riskScore: number;
  explanation: string;
  fragments: any[];
}
