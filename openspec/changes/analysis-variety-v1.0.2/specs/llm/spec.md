# Delta for llm

## ADDED Requirements

### Requirement: LLM-007: Enhanced Risk Assessment Prompt

The system MUST construct prompts that include additional clinical factors beyond the current implementation. The enhanced prompt SHALL include: age and demographics, comorbidities, current medications, lab results with values and flags, previous response to treatments, and vital signs.

#### Scenario: Enhanced prompt includes all clinical factors

- GIVEN a patient with age 65, male, CHF + COPD comorbidities, lisinopril 10mg, hemoglobin 11.5g/dL, prior response "responded well to diuretics", BP 145/90
- WHEN the enhanced prompt is constructed
- THEN it SHALL include age: 65, gender: male
- AND SHALL include comorbidities: CHF, COPD
- AND SHALL include medication names with dosages
- AND SHALL include lab results with values and abnormal flags
- AND SHALL include previous treatment responses
- AND SHALL include vital signs: BP, heart rate, temperature

#### Scenario: Patient has missing clinical data

- GIVEN a patient with missing vital signs and no previous treatment response
- WHEN the enhanced prompt is constructed
- THEN it SHALL include available data
- AND SHALL indicate "not available" for missing fields
- AND SHALL NOT omit sections entirely

---

### Requirement: LLM-008: Analysis History Storage

The system MUST create and maintain an AnalysisHistory table to store each risk analysis performed. The table SHALL include: id (auto-increment), patient_id, encounter_id, input_data_hash (SHA-256 of input data for change detection), risk_score, explanation, evidence, and created_at timestamp.

#### Scenario: Analysis stored after risk assessment

- GIVEN a completed risk assessment for patient_id=123, encounter_id=456
- WHEN the assessment completes successfully
- THEN the system SHALL insert a record into AnalysisHistory
- AND record SHALL include patient_id=123, encounter_id=456
- AND input_data_hash SHALL be computed from all input clinical data
- AND created_at SHALL be current timestamp

#### Scenario: Duplicate analysis detection

- GIVEN an identical analysis request (same patient_id, encounter_id, input_data_hash)
- WHEN the analysis is requested
- THEN the system SHALL return the existing result instead of creating a duplicate
- AND SHALL indicate this is a cached result

---

### Requirement: LLM-009: Change Detection and Re-analysis Suggestion

The system MUST detect when a re-analysis is warranted and suggest re-analysis to users. Re-analysis SHALL be suggested when: a new encounter is added for the patient, medications have changed significantly, lab results have changed significantly (value deviation >20%), or more than 7 days have elapsed since the last analysis.

#### Scenario: New encounter triggers re-analysis suggestion

- GIVEN patient 123 has a previous analysis from 5 days ago
- WHEN a new encounter is created for patient 123
- THEN the system SHALL flag that re-analysis is recommended
- AND SHALL display message "New encounter added - re-analysis recommended"

#### Scenario: Medication change detected

- GIVEN patient 123's last analysis included medications [lisinopril, metoprolol]
- WHEN current medications are [lisinopril, metoprolol, furosemide]
- THEN the system SHALL flag medication change detected
- AND SHALL suggest re-analysis

#### Scenario: Lab results significantly changed

- GIVEN patient 123's last analysis had hemoglobin 14.0 g/dL
- WHEN current hemoglobin is 10.5 g/dL (>20% change)
- THEN the system SHALL flag significant lab change
- AND SHALL suggest re-analysis

#### Scenario: Time-based re-analysis reminder

- GIVEN patient 123's last analysis was 8 days ago
- WHEN the patient is viewed
- THEN the system SHALL display "Last analysis was 8 days ago - consider re-analysis"
- AND SHALL NOT auto-trigger re-analysis without user confirmation

---

### Requirement: LLM-010: Input Data Hash Computation

The system MUST compute a SHA-256 hash of all input clinical data to enable change detection. The hash SHALL incorporate: patient demographics, all diagnoses, all medications with dosages, all lab results, all vital signs, and encounter date.

#### Scenario: Hash changes when medications change

- GIVEN input data produces hash ABC123
- WHEN medications list is modified
- THEN the new hash SHALL be different from ABC123
- AND change detection SHALL identify this as a modification

#### Scenario: Hash stable for identical data

- GIVEN input data produces hash XYZ789
- WHEN the same data is submitted again
- THEN the hash SHALL remain XYZ789
- AND duplicate detection SHALL identify this as a duplicate
