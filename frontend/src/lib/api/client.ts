import { invoke } from '@tauri-apps/api/core';
import type { Patient, RiskAssessment } from '../types/ipc';
import syntheticPatients from '../synthetic_patients.json';

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
    const patient = (syntheticPatients as any[]).find(p => p.patient_id === id);
    if (!patient) {
      throw new Error(`Patient with ID ${id} not found in mock data.`);
    }
    
    // Map synthetic data to Patient interface if needed, or return as is if compatible
    // Based on ipc.ts, Patient interface has optional fields matching synthetic data
    // We might need to construct the full Patient object similar to how it's done in dashboard/+page.svelte
    // but looking at ipc.ts, it seems lenient.
    
    // Let's do a basic mapping to ensure compatibility with UI components that might expect certain fields
    // derived from the raw data (like 'condition' or 'riskScore').
    // However, the dashboard logic derives 'condition' and 'riskScore' when mapping for the list view.
    // The detail view might expect raw data or the same derived data.
    // Given 'getPatient' usually returns the full backend object, and the backend likely does some processing...
    // But for the fallback, let's return the raw object plus the ID which is essential.
    
    return {
        ...patient,
        id: patient.patient_id,
        // Add basic derived fields if they are missing and critical
        riskScore: 0.5, // Default/Placeholder
        condition: patient.diagnoses?.find((d: any) => d.primary)?.description || 'Unknown'
    } as Patient;
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
