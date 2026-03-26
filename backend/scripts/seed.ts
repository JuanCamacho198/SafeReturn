// Seed script to populate the database with synthetic patient data
import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const dbPath = process.argv[2] || "storage.sqlite";
const db = new Database(dbPath);

// Enable WAL mode
db.exec('PRAGMA journal_mode = WAL;');

// Initialize schema
const schemaPath = join(__dirname, "../db/schema.sql");
const schemaSql = readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

// Read synthetic patients
const syntheticData = JSON.parse(
  readFileSync(join(__dirname, "../../frontend/src/lib/synthetic_patients.json"), "utf8")
);

console.log(`Importing ${syntheticData.length} patients...`);

// First names for mapping
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

// Clear old extended data just in case re-running
db.exec('DELETE FROM Medications');
db.exec('DELETE FROM LabResults');

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
  
  // Add Random Medications
  if (p.medications && p.medications.length > 0) {
    // Random amount of medications between 0 and full length
    const numberOfMeds = Math.floor(Math.random() * (p.medications.length + 1));
    const selectedMeds = p.medications.slice(0, numberOfMeds);
    
    for (const med of selectedMeds) {
        db.query(`
          INSERT INTO Medications (patient_id, name, dosage, frequency, route)
          VALUES (?, ?, ?, ?, ?)
        `).run(patientId, med.name, med.dosage, med.frequency, med.route);
    }
  }

  // Add Random Lab Results
  if (p.lab_results && p.lab_results.length > 0) {
    for (const lab of p.lab_results) {
        // Occasionally make the lab result abnormal
        const rand = Math.random();
        let flag = 'normal';
        let valMultiplier = 1.0;
        if (rand > 0.85) {
            flag = 'high';
            valMultiplier = 1.35;
        } else if (rand < 0.15) {
            flag = 'low';
            valMultiplier = 0.65;
        }

        const numericVal = parseFloat(lab.value) * valMultiplier;

        db.query(`
          INSERT INTO LabResults (patient_id, name, value, unit, reference_range_low, reference_range_high, flag)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          patientId, 
          lab.name, 
          parseFloat(numericVal.toFixed(2)), 
          lab.unit, 
          lab.reference_range?.[0] || 0, 
          lab.reference_range?.[1] || 100, 
          flag
        );
    }
  }

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
console.log(`Total medications: ${db.query("SELECT COUNT(*) as count FROM Medications").get() as any}.count`);
console.log(`Total lab results: ${db.query("SELECT COUNT(*) as count FROM LabResults").get() as any}.count`);
