import { invoke } from '@tauri-apps/api/core';
import type { Patient, RiskAssessment } from '../types/ipc';
import syntheticPatients from '../synthetic_patients.json';

// DEBUG: Check Tauri API availability
console.log('[DEBUG] Tauri API check:');
console.log('  - invoke exists:', typeof invoke !== 'undefined');
console.log('  - invoke type:', typeof invoke);
console.log('  - window.__TAURI__:', typeof window !== 'undefined' ? (window as any).__TAURI__ : 'N/A');
console.log('  - window.__TAURI_INTERNALS__:', typeof window !== 'undefined' ? (window as any).__TAURI_INTERNALS__ : 'N/A');

// Generate random names for patients (matching dashboard approach)
// Expanded to 50+ names with diverse nationalities
const firstNames = [
  // Anglo-Saxon
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
  'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  // Hispanic/Latino
  'Carlos', 'Maria', 'Jose', 'Ana', 'Luis', 'Rosa', 'Miguel', 'Sofia', 'Antonio', 'Isabella',
  'Fernando', 'Carmen', 'Diego', 'Valentina', 'Alejandro', 'Natalia', 'Rafael', 'Lucia', 'Eduardo', 'Paula',
  // Asian
  'Wei', 'Mei', 'Yuki', 'Hiroshi', 'Sakura', 'Kenji', 'Akiko', 'Takeshi', 'Sung', 'Min-jun',
  'Ji-young', 'Hana', 'Raj', 'Priya', 'Aarav', 'Ananya', 'Wei-lin', 'Chen', 'Ling', 'Ming'
];
const lastNames = [
  // Anglo-Saxon
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen',
  // Hispanic/Latino
  'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Cruz', 'Reyes',
  'Morales', 'Ortiz', 'Vargas', 'Chavez', 'Mendez', 'Ruiz', 'Fernandez', 'Alvarez', 'Castillo', 'Jimenez',
  // Asian
  'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Kim', 'Park', 'Choi', 'Nguyen',
  'Tran', 'Le', 'Singh', 'Kumar', 'Patel', 'Shah', 'Tanaka', 'Suzuki', 'Takahashi', 'Watanabe'
];

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
      diagnoses: patient.diagnoses || [],
      // Extended clinical data
      medications: patient.medications || [],
      lab_results: patient.lab_results || [],
      outcomes: patient.outcomes || null
    };
  }
}

export async function assessRisk(id: string, apiKey?: string): Promise<RiskAssessment> {
  try {
    return await invoke('assess_risk', { payload: { id, apiKey } });
  } catch (error) {
     const errorMsg = String(error);

     if (errorMsg.includes("schema.sql") || errorMsg.includes("No se encontró schema.sql")) {
       throw new Error("Error crítico: El sidecar de IA no pudo encontrar 'schema.sql'. Reinstala la aplicación o verifica los archivos de recursos.");
     }

     if (errorMsg.includes("SIDECAR_NOT_FOUND") || (errorMsg.includes("Failed to spawn sidecar") && (errorMsg.includes("os error 2") || errorMsg.includes("cannot find the file specified") || errorMsg.includes("No se puede encontrar el archivo especificado")))) {
       throw new Error("No se encontro el servicio de IA local (sidecar). Ejecuta: cd backend && bun run build:sidecar:tauri-win, luego reinicia la app.");
     }

      // Propagate configuration errors explicitly so UI can prompt user
      if (errorMsg.includes("Groq API key not configured")) {
        throw new Error("Groq API key not configured");
      }

     console.error(`Tauri invoke failed for assessRisk: ${error}`);
     throw error;
  }
}
