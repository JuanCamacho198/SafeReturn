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
  riskScore?: number;
  demographics?: any;
  diagnoses?: any[];
  // For compatibility with synthetic data
  firstName?: string;
  lastName?: string;
  patient_id?: string;
  // Extended clinical data
  medications?: Medication[];
  lab_results?: LabResult[];
  outcomes?: Outcome;
}

export interface Encounter {
  id: string;
  patient_id: string;
  admission_date: string;
  discharge_date?: string;
  notes?: string;
  diagnosis?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  route: string;
}

export interface LabResult {
  name: string;
  value: number;
  unit: string;
  reference_range: [number, number];
  flag: 'normal' | 'high' | 'low';
  panel: string;
}

export interface Outcome {
  readmitted: boolean;
  days_to_readmission: number | null;
  discharge_disposition: string;
}

export interface RiskAssessment {
  riskScore: number;
  explanation: string;
  fragments: string[];
}
