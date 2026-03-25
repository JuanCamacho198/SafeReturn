// import { invoke } from '@tauri-apps/api/core';
import type { Patient, RiskAssessment } from '../types/ipc';

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
}

export async function getPatients(page: number = 1, limit: number = 10, search: string = ""): Promise<PatientListResponse> {
  // Uncomment and use real invoke when sidecar is ready
  // return await invoke('get_patients', { payload: { page, limit, search } });
  
  // Mocking the paginated response
  return {
    items: [
      { id: '1', name: 'John Doe', age: 65, condition: 'Heart Failure' },
      { id: '2', name: 'Jane Smith', age: 72, condition: 'Pneumonia' }
    ],
    metadata: {
      total_items: 2,
      total_pages: 1,
      current_page: page,
      limit: limit
    }
  };
}

export async function getMetrics(): Promise<MetricsResponse> {
  // return await invoke('get_metrics');
  
  // Mocking the metrics response
  return {
    totalPatients: 1542,
    newThisMonth: 124,
    conditionDistribution: [
      { label: 'Hypertension', value: 450 },
      { label: 'Diabetes Type 2', value: 380 },
      { label: 'Asthma', value: 210 },
      { label: 'Heart Failure', value: 180 },
      { label: 'COPD', value: 150 }
    ]
  };
}

export async function assessRisk(patientId: string): Promise<RiskAssessment> {
  // return await invoke('assess_risk', { patientId });
  return {
    riskScore: 0.85,
    explanation: 'High Risk of Readmission: Patient shows signs of chronic heart failure non-compliance based on recent clinical notes.',
    fragments: ['Patient missed last 2 cardiology appointments.', 'Reports shortness of breath when lying down.']
  };
}
