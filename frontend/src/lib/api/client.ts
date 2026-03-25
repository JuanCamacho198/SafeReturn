import { invoke } from '@tauri-apps/api/core';
import type { Patient, RiskAssessment } from '../types/ipc';
import syntheticPatients from '../synthetic_patients.json';

// Generate random names for patients (matching dashboard approach)
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

// Map synthetic patient index to consistent names
function getNameFromIndex(index: number) {
  return {
    firstName: firstNames[index % firstNames.length],
    lastName: lastNames[index % lastNames.length]
  };
}

export interface PatientListResponse {
  items: Patient[];
  metadata: {
    total_items: number;
    total_pages: number;
    current_page: number;
    limit: number;
  };
}

export interface MetricsResponse {
  totalPatients: number;
  newThisMonth: number;
  conditionDistribution: { label: string; value: number }[];
  averageAge?: number;
  highRiskCount?: number;
}

export async function getPatients(page: number = 1, limit: number = 10, search: string = ""): Promise<PatientListResponse> {
  // Use real invoke
  // Note: payload structure depends on how backend expects arguments.
  // Backend expects: const { id, command, payload } = message;
  // invoke probably sends the object as payload or arguments.
  // If backend expects { command: 'get_patients', payload: { page, limit, search } }
  // Then invoke('get_patients', { payload: { page, limit, search } }) should work if Rust forwards it.
  return await invoke('get_patients', { payload: { page, limit, search } });
}

export async function getMetrics(): Promise<MetricsResponse> {
  return await invoke('get_metrics');
}

export async function getPatient(id: string): Promise<Patient> {
  try {
    return await invoke('get_patient', { payload: { id } });
  } catch (error) {
    console.warn(`Tauri invoke failed for getPatient: ${error}. Falling back to mock data.`);
    
    // Find patient in synthetic data
    const allPatients = syntheticPatients as any[];
    const patientIndex = allPatients.findIndex(p => p.patient_id === id);
    const patient = allPatients.find(p => p.patient_id === id);
    
    if (!patient) {
      throw new Error(`Patient with ID ${id} not found in mock data.`);
    }
    
    // Generate consistent names based on index
    const { firstName, lastName } = getNameFromIndex(patientIndex >= 0 ? patientIndex : 0);
    
    // Map synthetic data to Patient interface (matching dashboard/+page.svelte)
    const primaryDiagnosis = patient.diagnoses?.find((d: any) => d.primary) || patient.diagnoses?.[0];
    
    return {
      id: patient.patient_id,
      mrn: `MRN${String(patientIndex + 1).padStart(3, '0')}`,
      first_name: firstName,
      last_name: lastName,
      firstName,
      lastName,
      gender: patient.demographics?.gender === 'M' ? 'Male' : 'Female',
      dob: new Date(2024 - (patient.demographics?.age || 70), 0, 1).toISOString().split('T')[0],
      age: patient.demographics?.age,
      condition: primaryDiagnosis?.description || 'General',
      riskScore: Math.random() * 0.5 + 0.3,
      encounters: patient.encounters || [],
      diagnoses: patient.diagnoses || []
    };
  }
}

export async function assessRisk(id: string, apiKey?: string): Promise<RiskAssessment> {
  try {
    return await invoke('assess_risk', { payload: { id, apiKey } });
  } catch (error) {
     console.warn(`Tauri invoke failed for assessRisk: ${error}. Falling back to mock data.`);
     
     const patient = (syntheticPatients as any[]).find(p => p.patient_id === id);
     if (!patient) {
        throw new Error(`Patient with ID ${id} not found in mock data.`);
     }

     // Synthesize a risk assessment based on patient data
     const isHighRisk = patient.outcomes?.readmitted || patient.diagnoses?.length > 3;
     
     return {
         riskScore: isHighRisk ? 0.85 : 0.25,
         explanation: isHighRisk 
            ? "High risk of readmission due to prior history and multiple comorbidities." 
            : "Low risk profile based on current clinical indicators.",
         fragments: isHighRisk 
            ? ["Readmission history", "Multiple diagnoses", "Complex medication regimen"] 
            : ["Stable vital signs", "Good adherence"]
     };
  }
}
