# Export Specification

## Purpose

Defines data export functionality for patient data, risk scores, and retrieval results. Exports enable healthcare staff to generate reports in CSV and JSON formats for analysis and compliance. All exports operate on synthetic/desidentified data only.

## Requirements

### Requirement: EXP-001: CSV Export

The system MUST generate valid CSV files containing patient records. CSV files SHALL use UTF-8 encoding with comma as the delimiter and double-quote as the text qualifier. CSV files SHALL include a header row with column names. Empty values SHALL be represented as empty strings (not null or "null").

#### Scenario: Export all patients to CSV

- GIVEN 50 patients exist in the database
- WHEN a user exports all patients to CSV
- THEN the system SHALL generate a CSV file with header row
- AND each subsequent row SHALL contain one patient record
- AND all 50 patients SHALL be included
- AND the file SHALL be downloadable with name "patients_export_YYYYMMDD.csv"

#### Scenario: CSV with special characters in data

- GIVEN a patient has a diagnosis containing " congestive heart failure, \"acute\""
- WHEN the patient is exported to CSV
- THEN the field SHALL be properly escaped with double quotes
- AND the resulting CSV SHALL parse correctly

### Requirement: EXP-002: JSON Export

The system MUST generate valid JSON files containing patient records and related data. JSON SHALL be pretty-printed with 2-space indentation. The root SHALL be an object with a "exported_at" timestamp and a "patients" array. Each patient object SHALL include all fields including nested clinical notes if selected.

#### Scenario: Export all patients to JSON

- GIVEN 20 patients exist in the database
- WHEN a user exports all patients to JSON
- THEN the JSON file SHALL start with {"exported_at": "ISO timestamp", "patients": [...]} format
- AND each patient SHALL be a separate object in the array
- AND the file SHALL be downloadable with name "patients_export_YYYYMMDD.json"

#### Scenario: JSON export includes nested clinical notes

- GIVEN a patient has 3 clinical notes
- WHEN the JSON export includes clinical notes
- THEN each patient object SHALL include a "clinical_notes" array
- AND each note SHALL have note_id, note_type, note_text, and note_date

### Requirement: EXP-003: Patient Selection for Export

The system SHALL allow exporting all patients or a filtered subset. Filtering options SHALL include: by risk level (low/medium/high), by diagnosis, by admission date range, and by search query. Selection criteria SHALL be combinable.

#### Scenario: Export filtered by risk level

- GIVEN 100 patients with various risk levels
- WHEN a user exports only "high" risk patients
- THEN the export file SHALL contain only patients with risk_level = "high"
- AND low and medium risk patients SHALL NOT be included

#### Scenario: Export filtered by date range

- GIVEN patients admitted across various dates
- WHEN a user exports with admission date filter "2024-01-01" to "2024-03-31"
- THEN only patients admitted within that range SHALL be included
- AND patients admitted outside the range SHALL NOT be included

### Requirement: EXP-004: Field Selection for Export

The system SHALL allow users to select which fields to include in the export. Default selection SHALL include all available fields. Field options SHALL be presented as checkboxes grouped by category (Demographics, Admissions, Risk, Notes).

#### Scenario: Export with limited fields

- GIVEN patient records have fields: first_name, last_name, risk_score, diagnosis, clinical_notes
- WHEN a user selects only first_name, last_name, and risk_score
- THEN the CSV/JSON export SHALL contain only those three columns/fields
- AND diagnosis and clinical_notes SHALL NOT be included

#### Scenario: Export with all fields selected by default

- GIVEN the export form is opened
- WHEN no field deselection has been made
- THEN all available fields SHALL be checked/enabled
- AND the export SHALL include complete patient data

### Requirement: EXP-005: Risk Assessment Data in Export

Exports that include risk data SHALL contain: risk_score (decimal 0.0-1.0), risk_level (low/medium/high), risk_assessment_date, and reasoning_summary. Risk data SHALL be included in the patient record.

#### Scenario: Export includes complete risk data

- GIVEN a patient has a risk assessment with score 0.72, level "high"
- WHEN the patient is exported
- THEN the export record SHALL include risk_score: 0.72, risk_level: "high"
- AND risk_assessment_date: "2024-01-15T10:30:00Z"
- AND reasoning_summary: the LLM-generated reasoning text

### Requirement: EXP-006: Retrieved Fragments in Export

Exports MAY include retrieved clinical note fragments that informed the risk assessment. When included, fragments SHALL contain: note_id, note_type, note_date, note_text, and similarity_score. Fragments SHALL be associated with the patient record in the export.

#### Scenario: Export includes retrieved fragments

- GIVEN a patient has 5 retrieved fragments from the last risk assessment
- WHEN the export includes fragments option
- THEN the patient export record SHALL include a "retrieved_fragments" array
- AND each fragment SHALL have note_id, note_text, similarity_score
- AND fragments SHALL be ordered by similarity_score descending

### Requirement: EXP-007: Export File Naming

Exported files SHALL follow the naming convention: {type}_export_{YYYYMMDD}_{HHMMSS}.{extension}. Files SHALL be placed in the user's downloads directory via browser download mechanism. The system SHALL NOT store exported files on the server.

#### Scenario: Export file has correct name

- GIVEN the export is generated on January 15, 2024 at 2:30:45 PM
- WHEN the export completes
- THEN the downloaded file SHALL be named "patients_export_20240115_143045.csv" (or .json)
- AND the file SHALL be saved to the browser's downloads folder

### Requirement: EXP-008: Export Progress Indication

Exports larger than 100 records SHALL display a progress indicator. Progress SHALL show records processed out of total. The export SHALL be cancellable via a cancel button while in progress.

#### Scenario: Large export shows progress

- GIVEN an export of 500 patients is initiated
- WHEN the export is processing
- THEN a progress dialog SHALL be displayed
- AND it SHALL show "Exporting: 250 of 500 patients"
- AND a "Cancel" button SHALL be available

#### Scenario: Export cancellation

- GIVEN a large export is in progress (250 of 500 processed)
- WHEN the user clicks "Cancel"
- THEN the export SHALL be halted immediately
- AND partially generated data SHALL be discarded
- AND no file SHALL be downloaded

### Requirement: EXP-009: Export Validation

Before generating an export, the system SHALL validate that at least one patient matches the selected criteria. If no patients match, the system SHALL display an error message and not generate an empty file.

#### Scenario: Export with matching patients succeeds

- GIVEN 25 patients match the selected filter criteria
- WHEN the user clicks "Download"
- THEN the system SHALL validate that patients exist
- AND the export SHALL proceed and generate a file

#### Scenario: Export with no matching patients

- GIVEN no patients have risk_level = "extreme" (invalid filter)
- WHEN the user attempts to export with that filter
- THEN the system SHALL display "No patients match the selected criteria"
- AND no file SHALL be downloaded
- AND the user SHALL be prompted to adjust filters

### Requirement: EXP-010: Export Audit Log

All export operations SHALL be logged with: user_id, export_type (CSV/JSON), patient_count, fields_included, filters_applied, and timestamp. Logs SHALL be stored for compliance and auditing purposes.

#### Scenario: Export operation logged

- GIVEN a user exports 50 patients to CSV with filters
- WHEN the export completes
- THEN a log entry SHALL be created with user_id, type=CSV, count=50
- AND filters_applied SHALL list the filter criteria used

### Requirement: EXP-011: Batch Export

The system SHALL support exporting in batches if the total patient count exceeds a configurable threshold (default 10,000). Batch exports SHALL generate multiple files with sequential numbering. Each batch SHALL be independently valid.

#### Scenario: Batch export creates multiple files

- GIVEN 25,000 patients exist and batch size is 10,000
- WHEN the user initiates a full export
- THEN 3 files SHALL be generated: export_001, export_002, export_003
- AND each file SHALL contain up to 10,000 patient records
- AND the last file SHALL contain the remaining 5,000 records
