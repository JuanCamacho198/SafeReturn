# Patients Specification

## Purpose

Defines patient data management and clinical notes ingestion for the RAG readmission application. All patient data is synthetic and desidentified. Patient records include demographics, clinical notes, and admission history used for risk scoring.

## Requirements

### Requirement: PAT-001: Patient Data Model

The system MUST store patient records with the following fields: patient_id (UUID), first_name, last_name, date_of_birth, gender, admission_date, discharge_date, primary_diagnosis, secondary_diagnoses (JSON array), length_of_stay_days, and created_at/updated_at timestamps. All patient records SHALL be stored in the `patients` SQLite table.

#### Scenario: Patient record created from synthetic data

- GIVEN the synthetic patient data loader is invoked
- WHEN a patient record with complete demographics is submitted
- THEN the system SHALL store the record in the `patients` table
- AND the patient_id SHALL be a valid UUID
- AND all timestamps SHALL be recorded in UTC

#### Scenario: Patient record with missing required fields

- GIVEN the patient creation form is open
- WHEN a record is submitted with missing first_name
- THEN the system SHALL reject the record
- AND return validation errors indicating first_name is required
- AND no record SHALL be created

### Requirement: PAT-002: Patient List Retrieval

The system SHALL provide a paginated endpoint to retrieve the list of all patients. The response MUST include patient_id, first_name, last_name, admission_date, primary_diagnosis, and current risk_score (if calculated). Default page size SHALL be 20, configurable up to 100.

#### Scenario: Retrieve first page of patients

- GIVEN there are 50 patients in the database
- WHEN a user requests the patient list without pagination parameters
- THEN the system SHALL return the first 20 patients
- AND the response SHALL include total_count (50) and page metadata
- AND patients SHALL be ordered by admission_date descending

#### Scenario: Retrieve specific page of patients

- GIVEN there are 150 patients in the database
- WHEN a user requests page 3 with page_size 30
- THEN the system SHALL return patients 61-90
- AND the response SHALL include total_count (150) and page=3, page_size=30

### Requirement: PAT-003: Patient Search and Filter

The system SHALL provide search functionality to find patients by name (first or last) and filter by primary_diagnosis. Search MUST be case-insensitive and SHALL match partial strings. Filters MAY be combined with search.

#### Scenario: Search patients by last name

- GIVEN patients with last names "Smith", "Smythe", "Sullivan" exist
- WHEN a user searches for "smith"
- THEN the system SHALL return patients "Smith" and "Smythe"
- AND "Sullivan" SHALL NOT be included
- AND results SHALL be case-insensitive (matches "SMITH", "smith", "Smith")

#### Scenario: Combined search and diagnosis filter

- GIVEN patients with various diagnoses
- WHEN a user searches for "john" AND filters by diagnosis "Heart Failure"
- THEN the system SHALL return only patients named John with Heart Failure
- AND patients named John with different diagnoses SHALL NOT be included

### Requirement: PAT-004: Individual Patient Retrieval

The system SHALL provide an endpoint to retrieve complete details of a single patient by patient_id, including all clinical notes and admission history.

#### Scenario: Retrieve existing patient

- GIVEN a patient with patient_id "550e8400-e29b-41d4-a716-446655440000" exists
- WHEN a user requests GET /patients/550e8400-e29b-41d4-a716-446655440000
- THEN the system SHALL return the full patient record including all fields
- AND the response SHALL include embedded clinical_notes array

#### Scenario: Retrieve non-existent patient

- GIVEN no patient with patient_id "nonexistent-id" exists
- WHEN a user requests GET /patients/nonexistent-id
- THEN the system SHALL return HTTP 404
- AND the response SHALL include error message "Patient not found"

### Requirement: PAT-005: Clinical Notes Ingestion

The system MUST store clinical notes associated with each patient. Each note MUST have a note_id (UUID), patient_id (foreign key), note_type (e.g., "progress_note", "discharge_summary", "nursing_note"), note_text (full clinical text), note_date, and created_at. Clinical notes SHALL be stored in the `clinical_notes` SQLite table and indexed in FAISS.

#### Scenario: Ingest clinical note for patient

- GIVEN a patient with patient_id exists
- WHEN a clinical note with note_text is submitted for that patient
- THEN the system SHALL store the note in `clinical_notes`
- AND the system SHALL generate an embedding for note_text
- AND the embedding SHALL be stored in the FAISS index
- AND the FAISS metadata SHALL link back to note_id and patient_id

#### Scenario: Clinical note ingestion creates duplicate embedding

- GIVEN a clinical note was previously ingested for a patient
- WHEN the same note_text is ingested again
- THEN the system SHALL store the new note record with a new note_id
- AND the system SHALL generate a new embedding (even if identical to previous)
- AND the FAISS index SHALL contain both embeddings with distinct IDs

### Requirement: PAT-006: Clinical Note List for Patient

The system SHALL provide an endpoint to list all clinical notes for a given patient, sorted by note_date descending. Each note in the list SHALL include note_id, note_type, note_date, and a preview of the first 200 characters of note_text.

#### Scenario: List notes for patient with multiple notes

- GIVEN a patient has 5 clinical notes
- WHEN a user requests the notes list for that patient
- THEN the system SHALL return all 5 notes
- AND each note SHALL include preview truncated to 200 characters
- AND notes SHALL be ordered by note_date descending (newest first)

#### Scenario: List notes for patient with no notes

- GIVEN a patient has no clinical notes
- WHEN a user requests the notes list for that patient
- THEN the system SHALL return an empty array
- AND no error SHALL be returned

### Requirement: PAT-007: Patient Update

The system SHALL allow updating patient demographics (first_name, last_name, gender) and admission information (discharge_date, primary_diagnosis, secondary_diagnoses). Patient_id, admission_date, and created_at SHALL be immutable after creation. The updated_at timestamp SHALL be automatically updated.

#### Scenario: Update patient discharge information

- GIVEN a patient with admission_date set and no discharge_date
- WHEN an update sets discharge_date to a future date
- THEN the system SHALL store the new discharge_date
- AND updated_at SHALL be set to current timestamp
- AND admission_date SHALL remain unchanged

#### Scenario: Attempt to modify immutable patient_id

- GIVEN a patient with patient_id "550e8400-e29b-41d4-a716-446655440000"
- WHEN an update request includes a different patient_id
- THEN the system SHALL reject the update
- AND the system SHALL return a validation error indicating patient_id is immutable
- AND the patient record SHALL remain unchanged

### Requirement: PAT-008: Patient Deletion

The system SHALL support soft-delete of patient records. Deleted patients SHALL have a `deleted_at` timestamp set rather than being physically removed. Soft-deleted patients SHALL NOT appear in list or search results but their data SHALL remain in FAISS index until explicitly purged.

#### Scenario: Soft-delete patient

- GIVEN a patient with patient_id exists
- WHEN a delete request is issued for that patient
- THEN the system SHALL set deleted_at to current timestamp
- AND the patient SHALL NOT appear in subsequent list queries
- AND the patient SHALL NOT appear in search results

#### Scenario: Retrieve soft-deleted patient

- GIVEN a patient with deleted_at timestamp set
- WHEN a direct GET request is made for that patient_id
- THEN the system SHALL return HTTP 404
- AND the response SHALL indicate patient not found (as if deleted)

### Requirement: PAT-009: Bulk Patient Data Import

The system SHALL support bulk import of patient data from JSON format. Imports MUST be transactional: either all records are imported successfully or none are. The import SHALL validate each record and report validation errors per-record without stopping the entire import.

#### Scenario: Bulk import with valid data

- GIVEN a JSON file with 100 valid patient records
- WHEN the import endpoint receives the file
- THEN all 100 records SHALL be inserted into the database
- AND FAISS embeddings SHALL be generated for each record's clinical notes
- AND the response SHALL include success_count=100, error_count=0

#### Scenario: Bulk import with partial invalid data

- GIVEN a JSON file with 100 records where 5 have invalid data
- WHEN the import endpoint receives the file
- THEN the system SHALL import the 95 valid records
- AND the system SHALL report which 5 records failed and why
- AND the response SHALL include success_count=95, error_count=5
- AND the error details SHALL list record index and validation failure reason
