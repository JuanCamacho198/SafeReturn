CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
    event_type TEXT DEFAULT 'routine',
    FOREIGN KEY(patient_id) REFERENCES Patients(id)
);

CREATE TABLE IF NOT EXISTS Medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    route TEXT,
    FOREIGN KEY(patient_id) REFERENCES Patients(id)
);

CREATE TABLE IF NOT EXISTS LabResults (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id TEXT NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT,
    reference_range_low REAL,
    reference_range_high REAL,
    flag TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES Patients(id)
);

CREATE TABLE IF NOT EXISTS Embeddings (
    id TEXT PRIMARY KEY,
    encounter_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    text_chunk TEXT NOT NULL,
    embedding_vector BLOB,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(encounter_id) REFERENCES Encounters(id)
);

CREATE TABLE IF NOT EXISTS AuditLogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS AnalysisHistory (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    encounter_id TEXT,
    input_data_hash TEXT,
    risk_score REAL,
    explanation TEXT,
    evidence TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
