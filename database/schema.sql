-- Synthetic Clinical Data SQLite Schema
-- Tables: patients, diagnoses, labs, medications, clinical_notes

CREATE TABLE IF NOT EXISTS patients (
    patient_id TEXT PRIMARY KEY,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    ethnicity TEXT NOT NULL,
    insurance TEXT,
    readmitted INTEGER NOT NULL DEFAULT 0,
    days_to_readmission INTEGER,
    discharge_disposition TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diagnoses (
    diagnosis_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    icd10 TEXT NOT NULL,
    description TEXT NOT NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS labs (
    lab_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT,
    ref_low REAL,
    ref_high REAL,
    flag TEXT,
    panel TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS medications (
    med_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    route TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS clinical_notes (
    note_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    note_type TEXT NOT NULL,
    content TEXT,
    date TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_patients_age ON patients(age);
CREATE INDEX IF NOT EXISTS idx_patients_gender ON patients(gender);
CREATE INDEX IF NOT EXISTS idx_patients_readmitted ON patients(readmitted);
CREATE INDEX IF NOT EXISTS idx_diagnoses_icd10 ON diagnoses(icd10);
CREATE INDEX IF NOT EXISTS idx_diagnoses_patient ON diagnoses(patient_id);
CREATE INDEX IF NOT EXISTS idx_labs_patient ON labs(patient_id);
CREATE INDEX IF NOT EXISTS idx_labs_panel ON labs(panel);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON clinical_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_type ON clinical_notes(note_type);
