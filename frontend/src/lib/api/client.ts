// Mocking Tauri IPC invoke for now
// import { invoke } from '@tauri-apps/api/core';
import type { Patient, RiskAssessment } from '../types/ipc';

export async function getPatients(): Promise<Patient[]> {
  // return await invoke('get_patients');
  return [
    { id: '1', name: 'John Doe', age: 65, condition: 'Heart Failure' },
    { id: '2', name: 'Jane Smith', age: 72, condition: 'Pneumonia' }
  ];
}

export async function assessRisk(patientId: string): Promise<RiskAssessment> {
  // return await invoke('assess_risk', { patientId });
  return {
    riskScore: 0.85,
    explanation: 'High Risk of Readmission: Patient shows signs of chronic heart failure non-compliance based on recent clinical notes.',
    fragments: ['Patient missed last 2 cardiology appointments.', 'Reports shortness of breath when lying down.']
  };
}
