import { invoke } from '@tauri-apps/api/core';
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
  return await invoke('get_patient', { payload: { id } });
}

export async function assessRisk(id: string, apiKey?: string): Promise<RiskAssessment> {
  return await invoke('assess_risk', { payload: { id, apiKey } });
}
