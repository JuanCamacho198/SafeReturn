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

// High volume of names to ensure 100+ unique ones when Cartesian product happens
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Nancy',
'Matthew', 'Lisa', 'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley', 'Paul', 'Kimberly',
'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez',
'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

// Generate all combinations and shuffle Fisher-Yates
const combos: {first: string, last: string}[] = [];
for (const f of firstNames) {
  for (const l of lastNames) {
    combos.push({first: f, last: l});
  }
}
for (let i = combos.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [combos[i], combos[j]] = [combos[j], combos[i]];
}

if (combos.length === 0) {
  throw new Error('No name combinations available to seed patients');
}

// Clear old extended data just in case re-running
db.exec('DELETE FROM Encounters');
db.exec('DELETE FROM Patients');
db.exec('DELETE FROM Medications');
db.exec('DELETE FROM LabResults');

// Insert patients
for (let i = 0; i < syntheticData.length; i++) {
  const p = syntheticData[i];
  
  const patientId = p.patient_id;
  const mrn = `MRN${String(i + 1).padStart(3, '0')}`;
  
  const nameCombo = combos[i % combos.length]!;
  const firstName = nameCombo.first;
  const lastName = nameCombo.last;
  
  const gender = p.demographics?.gender === 'M' ? 'Male' : 'Female';
  const dob = new Date(2024 - (p.demographics?.age || 70), 0, 1).toISOString().split('T')[0];
  
  // Insert patient
  db.query(`
    INSERT OR IGNORE INTO Patients (id, mrn, first_name, last_name, dob, gender)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(patientId, mrn, firstName, lastName, dob, gender);
  
  // Add Random Medications
  if (p.medications && p.medications.length > 0) {
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

  // Invent timeline events for the encounter
  if (p.diagnoses && p.diagnoses.length > 0) {
    const diag = p.diagnoses[0];
    
    // Create a chronological timeline
    // Base time: Between 60 days ago and 10 days ago
    const baseTime = new Date(new Date().getTime() - Math.floor(Math.random() * 50 + 10) * 24 * 60 * 60 * 1000);
    
    // We will generate 3-4 encounters showing a progression
    const eventTypesAndNotes = [
      {
         type: "routine",
         daysOffset: 0,
         diagnosis: diag.description,
         note: `Routine checkup. Patient reported minor symptoms related to ${diag.description}. Advised monitoring.`
      },
      {
         type: "medication",
         daysOffset: Math.floor(Math.random() * 5 + 3), // 3 to 7 days later
         diagnosis: `${diag.description} Flare-up`,
         note: `Patient symptoms worsened. Prescribed adjustement in medication. Reviewing again in two weeks.`
      }
    ];
    
    const wentToER = Math.random() < 0.3; // 30% chance they got worse
    if (wentToER) {
      eventTypesAndNotes.push({
         type: "emergency",
         daysOffset: Math.floor(Math.random() * 7 + 10), // 10 to 16 days later
         diagnosis: `Acute ${diag.description}`,
         note: `Patient arrived at ER with acute symptoms. Vital signs unstable. Admitted for immediate treatment.`
      });
      eventTypesAndNotes.push({
         type: "discharge",
         daysOffset: Math.floor(Math.random() * 4 + 14), // 14 to 17 days
         diagnosis: `Resolved: Acute ${diag.description}`,
         note: `Patient condition stabilized. Ready for discharge. Given home care instructions.`
      });
    } else {
      eventTypesAndNotes.push({
         type: "routine",
         daysOffset: Math.floor(Math.random() * 5 + 15), // 15 to 19 days later
         diagnosis: `Follow-up ${diag.description}`,
         note: `Follow-up visit. Patient responding well to new medication regimen. Vitals normal. Keep current plan.`
      });
    }

    for (let k = 0; k < eventTypesAndNotes.length; k++) {
      const evt = eventTypesAndNotes[k];
      if (!evt) continue;
      const encounterId = `${patientId}-enc-${k}`;
      const encounterDate = new Date(baseTime.getTime() + evt.daysOffset * 24 * 60 * 60 * 1000);
      
      db.query(`
        INSERT OR IGNORE INTO Encounters (id, patient_id, admission_date, discharge_date, notes, diagnosis, event_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        encounterId,
        patientId,
        encounterDate.toISOString(),
        encounterDate.toISOString(), // simplified
        evt.note,
        evt.diagnosis,
        evt.type
      );
    }
  }
}

console.log("Database seeded successfully!");
console.log(`Total patients: ${db.query("SELECT COUNT(*) as count FROM Patients").get() as any}.count`);
console.log(`Total encounters: ${db.query("SELECT COUNT(*) as count FROM Encounters").get() as any}.count`);
console.log(`Total medications: ${db.query("SELECT COUNT(*) as count FROM Medications").get() as any}.count`);
console.log(`Total lab results: ${db.query("SELECT COUNT(*) as count FROM LabResults").get() as any}.count`);
