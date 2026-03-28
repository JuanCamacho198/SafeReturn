# Tasks: Analysis Variety v1.0.2

## Phase 1: Database Schema Changes

- [ ] 1.1 Add AnalysisHistory table to backend/db/schema.sql with columns: id (auto-increment), patient_id, encounter_id, input_data_hash (TEXT), risk_score (REAL), explanation (TEXT), evidence (TEXT JSON array), created_at (DATETIME)
- [ ] 1.2 Verify schema.sql syntax is valid SQLite
- [ ] 1.3 Update backend/db/index.ts to export AnalysisHistory table interface if needed

## Phase 2: Enhanced Prompt Implementation

- [ ] 2.1 Modify backend/rag/orchestrator.ts - enhance the assessRisk method to accept full patient data object instead of just notes
- [ ] 2.2 Add constructEnhancedPrompt(patientData) method that includes: age/demographics, comorbidities, current medications with dosages, lab results with values/flags, previous treatment responses, vital signs
- [ ] 2.3 Handle missing clinical data gracefully - include "not available" for missing fields
- [ ] 2.4 Update the locale handling to work with the enhanced prompt structure

## Phase 3: History Storage Implementation

- [ ] 3.1 Add computeInputDataHash(patientData) method using SHA-256 to backend/rag/orchestrator.ts - incorporate: demographics, diagnoses, medications, lab results, vital signs, encounter date
- [ ] 3.2 Add saveAnalysisToHistory(patientId, encounterId, inputHash, result) method to orchestrator.ts
- [ ] 3.3 Add checkDuplicateAnalysis(patientId, encounterId, inputHash) method to detect existing analysis
- [ ] 3.4 Modify assessRisk() to save results to history after successful assessment
- [ ] 3.5 Return cached result if duplicate analysis detected

## Phase 4: Change Detection Implementation

- [ ] 4.1 Add detectChanges(previousAnalysis, currentPatientData) method to orchestrator.ts
- [ ] 4.2 Implement medication change detection - compare current vs previous medication lists
- [ ] 4.3 Implement lab value change detection - flag when value deviation >20%
- [ ] 4.4 Implement time-based re-analysis check - flag when >7 days since last analysis
- [ ] 4.5 Add getLastAnalysis(patientId) method to retrieve most recent analysis
- [ ] 4.6 Return re-analysis suggestions with appropriate messages per spec scenarios

## Phase 5: Testing and Verification

- [ ] 5.1 Write unit test for AnalysisHistory table creation
- [ ] 5.2 Write unit test for computeInputDataHash - verify hash changes on medication change
- [ ] 5.3 Write unit test for computeInputDataHash - verify hash stable for identical data
- [ ] 5.4 Write unit test for enhanced prompt construction with all clinical factors
- [ ] 5.5 Write unit test for enhanced prompt with missing clinical data
- [ ] 5.6 Write unit test for duplicate analysis detection
- [ ] 5.7 Write unit test for medication change detection
- [ ] 5.8 Write unit test for lab results significant change detection (>20%)
- [ ] 5.9 Write unit test for time-based re-analysis reminder
- [ ] 5.10 Integration test: full risk assessment workflow with history storage
- [ ] 5.11 Integration test: verify risk assessment variety with different patient scenarios

## Phase 6: Cleanup and Documentation

- [ ] 6.1 Add JSDoc comments to new public methods in orchestrator.ts
- [ ] 6.2 Update backend/README.md with new AnalysisHistory table documentation if needed
