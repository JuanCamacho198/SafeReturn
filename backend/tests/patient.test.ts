import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { getPatients, getMetrics } from "../services/patient";

describe("Patient Service Tests", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    // Setup schema
    db.run(`
      CREATE TABLE IF NOT EXISTS Patients (
        id TEXT PRIMARY KEY,
        mrn TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        dob DATE NOT NULL,
        gender TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS Encounters (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        admission_date DATETIME NOT NULL,
        discharge_date DATETIME,
        notes TEXT,
        diagnosis TEXT,
        FOREIGN KEY(patient_id) REFERENCES Patients(id)
      );
    `);

    // Seed data
    for (let i = 1; i <= 25; i++) {
      db.run(
        `INSERT INTO Patients (id, mrn, first_name, last_name, dob, gender, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `p${i}`,
          `MRN${i}`,
          `Patient`,
          `${i}`,
          '1980-01-01',
          'M',
          i <= 5 ? '2025-03-01' : '2024-01-01' // 5 new patients this month (assuming current month is March 2025 for test stability, but need to be careful with date('now'))
        ]
      );
      
      // Add encounter for diagnosis
      db.run(
        `INSERT INTO Encounters (id, patient_id, admission_date, diagnosis) VALUES (?, ?, ?, ?)`,
        [`e${i}`, `p${i}`, '2024-01-01', i % 2 === 0 ? 'Flu' : 'Cold']
      );
    }
  });

  afterEach(() => {
    db.close();
  });

  test("getPatients supports pagination", () => {
    // Page 1, limit 10
    const res1 = getPatients(db, { page: 1, limit: 10 });
    expect(res1.items.length).toBe(10);
    expect(res1.metadata.current_page).toBe(1);
    expect(res1.metadata.total_pages).toBe(3); // 25 items / 10 = 2.5 -> 3
    expect(res1.metadata.total_items).toBe(25);

    // Page 3, limit 10
    const res3 = getPatients(db, { page: 3, limit: 10 });
    expect(res3.items.length).toBe(5); // Remaining 5
    expect(res3.metadata.current_page).toBe(3);
  });

  test("getPatients supports search", () => {
    // Search by name "Patient 1" -> matches "Patient 1", "Patient 10", "Patient 11", ... "Patient 19"
    // Wait, name is "Patient" and lastname is "1", "2"...
    // Search "Patient 2" matches "Patient 2", "Patient 20", "Patient 21"...
    
    // Let's insert a specific one to be sure
    db.run(
        `INSERT INTO Patients (id, mrn, first_name, last_name, dob, gender) VALUES (?, ?, ?, ?, ?, ?)`,
        ['p_special', 'MRN_S', 'John', 'Doe', '1990-01-01', 'M']
    );
    
    const res = getPatients(db, { search: 'John' }) as any;
    expect(res.items.length).toBe(1);
    expect(res.items[0].first_name).toBe('John');
    
    const res2 = getPatients(db, { search: 'Flu' }) as any;
    // Half of 25 are even -> 12 patients with Flu
    expect(res2.items.length).toBeGreaterThan(0);
    expect(res2.items[0].condition).toBe('Flu');
  });

  test("getMetrics returns correct counts", () => {
    // We rely on date('now') in the code, so testing "new this month" is tricky without mocking date
    // But we can check totalPatients
    const metrics = getMetrics(db) as any;
    expect(metrics.totalPatients).toBe(25);
    
    // Check distribution
    expect(metrics.conditionDistribution.length).toBeGreaterThan(0);
    const fluStat = metrics.conditionDistribution.find((d: any) => d.label === 'Flu');
    expect(fluStat).toBeDefined();
    expect(fluStat.value).toBe(12); // 12 evens in 1..25
  });
});
