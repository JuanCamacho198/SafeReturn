import type { Database } from "bun:sqlite";

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
      p.id, p.mrn, p.first_name, p.last_name, p.dob, p.gender, p.created_at,
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
