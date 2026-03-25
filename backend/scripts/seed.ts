// Seed script to populate the database with synthetic patient data
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const dbPath = process.argv[2] || "storage.sqlite";
const db = new Database(dbPath);

// Enable WAL mode
db.exec('PRAGMA journal_mode = WAL;');

// Read synthetic patients
const syntheticData = JSON.parse(
  readFileSync(join(__dirname, "../../frontend/src/lib/synthetic_patients.json"), "utf8")
);

console.log(`Importing ${syntheticData.length} patients...`);

// First names for mapping
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

// Insert patients
for (let i = 0; i < syntheticData.length; i++) {
  const p = syntheticData[i];
  
  const patientId = p.patient_id;
  const mrn = `MRN${String(i + 1).padStart(3, '0')}`;
  const firstName = firstNames[i % firstNames.length];
  const lastName = lastNames[i % lastNames.length];
  const gender = p.demographics?.gender === 'M' ? 'Male' : 'Female';
  const dob = new Date(2024 - (p.demographics?.age || 70), 0, 1).toISOString().split('T')[0];
  
  // Insert patient
  db.query(`
    INSERT OR IGNORE INTO Patients (id, mrn, first_name, last_name, dob, gender)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(patientId, mrn, firstName, lastName, dob, gender);
  
  // Create encounters from diagnoses
  if (p.diagnoses && p.diagnoses.length > 0) {
    for (let j = 0; j < p.diagnoses.length; j++) {
      const diag = p.diagnoses[j];
      const encounterId = `${patientId}-enc-${j}`;
      
      const admissionDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const dischargeDate = new Date(admissionDate.getTime() + (Math.random() * 7 + 1) * 24 * 60 * 60 * 1000);
      
      const notes = `
Patient presents with ${diag.description}.
History of present illness: ${p.medications?.slice(0, 2).map((m: any) => m.name).join(', ') || 'No relevant medications'}.
Physical examination: Vital signs stable. Cardiac exam normal. Lungs clear.
Assessment: ${diag.description}
Plan: Continue current medications. Follow up in 2 weeks.
${p.outcomes?.readmitted ? 'Note: Patient was readmitted within 30 days.' : ''}
      `.trim();
      
      db.query(`
        INSERT OR IGNORE INTO Encounters (id, patient_id, admission_date, discharge_date, notes, diagnosis)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        encounterId,
        patientId,
        admissionDate.toISOString(),
        dischargeDate.toISOString(),
        notes,
        diag.description
      );
    }
  }
}

console.log("Database seeded successfully!");
console.log(`Total patients: ${db.query("SELECT COUNT(*) as count FROM Patients").get() as any}.count`);
console.log(`Total encounters: ${db.query("SELECT COUNT(*) as count FROM Encounters").get() as any}.count`);
