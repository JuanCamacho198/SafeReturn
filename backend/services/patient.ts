import type { Database } from "bun:sqlite";
import { RagOrchestrator } from "../rag/orchestrator";

// Initialize the RAG orchestrator lazily
let ragOrchestrator: RagOrchestrator | null = null;

function getRagOrchestrator(db: Database, apiKey?: string) {
  if (apiKey || !ragOrchestrator) {
    ragOrchestrator = new RagOrchestrator(db, apiKey);
  }
  return ragOrchestrator;
}

export interface GetPatientsOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export function getPatients(db: Database, options: GetPatientsOptions = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10));
  const offset = (page - 1) * limit;
  const search = options.search ? `%${options.search}%` : null;

  let countQuery = `
    SELECT COUNT(DISTINCT p.id) as total 
    FROM Patients p
    LEFT JOIN Encounters e ON p.id = e.patient_id
  `;
  
  let dataQuery = `
    SELECT DISTINCT 
      p.id, p.mrn, 
      (p.first_name || ' ' || p.last_name) as name,
      (strftime('%Y', 'now') - strftime('%Y', p.dob)) - (strftime('%m-%d', 'now') < strftime('%m-%d', p.dob)) as age,
      p.dob, p.gender, p.created_at,
      e.diagnosis as condition
    FROM Patients p
    LEFT JOIN Encounters e ON p.id = e.patient_id
  `;

  const params: any[] = [];
  if (search) {
    const whereClause = `
      WHERE (p.first_name || ' ' || p.last_name) LIKE ? 
         OR e.diagnosis LIKE ?
    `;
    countQuery += whereClause;
    dataQuery += whereClause;
    params.push(search, search);
  }

  dataQuery += `
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countRow = db.query(countQuery).get(...params) as { total: number };
  const totalItems = countRow.total;
  
  const dataParams = [...params, limit, offset];
  const patients = db.query(dataQuery).all(...dataParams);

  return {
    items: patients,
    metadata: {
      total_items: totalItems,
      total_pages: Math.ceil(totalItems / limit),
      current_page: page,
      limit
    }
  };
}

export function getMetrics(db: Database) {
  const totalRow = db.query(`SELECT COUNT(*) as total FROM Patients`).get() as { total: number };
  
  const newThisMonthRow = db.query(`
    SELECT COUNT(*) as count 
    FROM Patients 
    WHERE created_at >= date('now', 'start of month')
  `).get() as { count: number };
  
  const conditionDist = db.query(`
    SELECT diagnosis as label, COUNT(DISTINCT patient_id) as value 
    FROM Encounters 
    WHERE diagnosis IS NOT NULL AND diagnosis != ''
    GROUP BY diagnosis 
    ORDER BY value DESC 
    LIMIT 5
  `).all();

  return {
    totalPatients: totalRow.total,
    newThisMonth: newThisMonthRow.count,
    conditionDistribution: conditionDist
  };
}

export function getPatientById(db: Database, id: string) {
  const patient = db.query(`
    SELECT *, 
    (first_name || ' ' || last_name) as name,
    (strftime('%Y', 'now') - strftime('%Y', dob)) - (strftime('%m-%d', 'now') < strftime('%m-%d', dob)) as age
    FROM Patients WHERE id = ?
  `).get(id);
  
  if (!patient) return null;
  
  const encounters = db.query("SELECT * FROM Encounters WHERE patient_id = ? ORDER BY admission_date DESC").all(id);
  const medications = db.query("SELECT * FROM Medications WHERE patient_id = ?").all(id);
  const rawLabs = db.query("SELECT * FROM LabResults WHERE patient_id = ? ORDER BY date DESC").all(id) as any[];
  
  const lab_results = rawLabs.map(lab => ({
    ...lab,
    reference_range: [lab.reference_range_low, lab.reference_range_high]
  }));
  
  return { ...patient, encounters, medications, lab_results };
}

export async function assessPatientRisk(db: Database, id: string, apiKey?: string) {
  const encounters = db.query("SELECT notes FROM Encounters WHERE patient_id = ? ORDER BY admission_date ASC").all(id) as { notes: string }[];
  
  if (!encounters || encounters.length === 0) {
      throw new Error("No encounters found for patient");
  }

  const allNotes = encounters.map(e => e.notes).join("\n\n---\n\n");
  
  const rag = getRagOrchestrator(db, apiKey);
  return await rag.assessRisk(allNotes);
}
