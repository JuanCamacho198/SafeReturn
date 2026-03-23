# Synthetic Clinical Data Specification

## Purpose

This spec defines requirements for generating 100 synthetic patient records for SafeReturn RAG training and demonstration, ensuring realistic clinical data across demographics, diagnoses, notes, labs, and readmission outcomes.

## Requirements

### Requirement: Dataset Completeness

The generation script **MUST** produce exactly 100 unique patient records. Each record **MUST** contain: patient_id, demographics, 2–5 clinical notes, 1–5 diagnoses with ICD-10 codes, 2–10 lab results, 1–5 medications, and a readmission outcome.

#### Scenario: Full record generation
- GIVEN the generation script is executed with valid API credentials
- WHEN it completes without error
- THEN exactly 100 patient records exist in `data/synthetic_patients.json`
- AND each record contains all required fields

#### Scenario: Missing fields trigger failure
- GIVEN a patient record is missing required fields
- WHEN the generation script validates output
- THEN it **MUST** reject the incomplete record and regenerate

### Requirement: Demographic Realism

Patient demographics **SHALL** match US Census distributions within ±5%. Age **MUST** span 18–95 with weighted distribution favoring 45–75. Gender **MUST** be ~48% female, ~51% male, ~1% other. Ethnicity **MUST** follow approximate US diversity (70% White, 13% Hispanic, 12% Black, 5% Asian/Other).

#### Scenario: Age distribution validation
- GIVEN 100 generated patients
- WHEN age distribution is checked against US Census benchmarks
- THEN at least 50% of patients fall between ages 45–75

### Requirement: Diagnosis Prevalence

ICD-10 codes **MUST** be sampled using real disease prevalence rates. Heart failure **SHALL** occur in ~6% of patients, COPD in ~5%, pneumonia in ~4%, diabetes in ~10%, hypertension in ~25%. Each patient **MUST** have 1–5 diagnoses.

#### Scenario: Disease prevalence within tolerance
- GIVEN 100 generated patients
- WHEN diagnosis counts are aggregated
- THEN heart failure appears in 4–8 patients, diabetes in 8–14 patients

### Requirement: Clinical Note Authenticity

Clinical notes **MUST** be generated via LLM in natural clinical language. Each patient **MUST** have 2–5 notes covering: History of Present Illness (HPI), Physical Exam, Assessment/Plan, or Discharge Summary. Notes **MUST** reference the patient's actual diagnoses and contain clinically plausible content.

#### Scenario: Note-diagnosis alignment
- GIVEN a patient with CHF and diabetes diagnoses
- WHEN their clinical notes are reviewed
- THEN at least one note mentions heart failure or fluid overload
- AND at least one note references blood sugar or diabetes management

### Requirement: Lab Value Correlation

Lab results **MUST** be correlated with diagnoses. Patients with heart failure **SHALL** have elevated BNP (>400 pg/mL). Patients with kidney disease **MUST** have elevated creatinine (>1.2 mg/dL). Each patient **MUST** have 2–10 lab results with name, value, unit, and reference range.

#### Scenario: Lab-diagnosis correlation
- GIVEN a patient diagnosed with heart failure
- WHEN lab results are examined
- THEN at least one BNP or NT-proBNP value is elevated per diagnosis

### Requirement: Readmission Outcome Distribution

Readmission outcomes **MUST** be assigned with a 14–18% overall rate. Patients with CHF, COPD, or 3+ comorbidities **SHOULD** have elevated readmission probability (~30%). Outcomes **MUST** include readmitted (boolean) and days_to_readmission (integer, 0 if not readmitted).

#### Scenario: Readmission rate within target
- GIVEN 100 generated patients with assigned outcomes
- WHEN readmission counts are tallied
- THEN 14–18 patients have readmitted=true
- AND remaining patients have days_to_readmission=0

### Requirement: Data Persistence

Generated data **MUST** load successfully into the SQLite database without schema errors. The RAG pipeline **MUST** retrieve relevant text chunks for test queries.

#### Scenario: Database load
- GIVEN `data/synthetic_patients.json` exists with 100 records
- WHEN the import script runs
- THEN all records appear in the patients table
- AND associated notes, diagnoses, labs appear in their tables

## Summary Table

| Requirement | Strength | Scenarios |
|-------------|----------|-----------|
| Dataset Completeness | MUST | 2 |
| Demographic Realism | SHALL | 1 |
| Diagnosis Prevalence | MUST | 1 |
| Clinical Note Authenticity | MUST | 1 |
| Lab Value Correlation | MUST | 1 |
| Readmission Distribution | MUST | 1 |
| Data Persistence | MUST | 1 |
