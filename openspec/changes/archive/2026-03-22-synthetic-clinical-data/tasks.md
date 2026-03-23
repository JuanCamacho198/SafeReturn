# Tasks: Synthetic Clinical Data Generation

## Phase 1: Foundation

- [x] 1.1 Create `scripts/generate_clinical_data.py` — stub with argparse, config constants, and logging setup
- [x] 1.2 Create `data/` directory
- [x] 1.3 Install dependencies: `pip install faker groq python-dotenv`; add `requirements.txt` if absent
- [x] 1.4 Create `.env.example` with `GROQ_API_KEY=` placeholder
- [x] 1.5 Define ICD10 prevalence dictionary in `scripts/icd10_prevalence.py` (CHF ~6%, COPD ~5%, pneumonia ~4%, AMI ~3%, etc.)
- [x] 1.6 Define patient schema constants in `scripts/schemas.py`: demographics, diagnosis, lab, medication, note fields

## Phase 2: Core Generation

- [x] 2.1 Implement `generate_demographics(faker, n)` in `scripts/generate_clinical_data.py` — weighted age 18-95, gender, ethnicity matching US Census distributions
- [x] 2.2 Implement `sample_icd10_diagnoses(demographics, prevalence_dict, rng)` — return 2-6 codes per patient correlated with age/gender
- [x] 2.3 Implement `generate_medications(diagnoses, faker)` — map ICD10 codes to medication classes with realistic dosage ranges
- [x] 2.4 Implement `generate_labs(diagnoses, faker)` — correlate BNP/creatinine/glucose with specific diagnoses, include reference ranges
- [x] 2.5 Implement `assign_readmission(diagnoses, comorbidities)` — ~16% rate; weight CHF, COPD, multi-morbidity patients higher
- [x] 2.6 Write `generate_patients(n=100)` loop that calls 2.1–2.5 and outputs list of dicts

## Phase 3: Clinical Notes

- [x] 3.1 Create `scripts/llm_client.py` — Groq client wrapper with rate limiting, prompt caching, and error retry
- [x] 3.2 Define note templates in `scripts/note_templates.py`: SOAP, H&P, discharge summary — with `{diagnosis}`, `{medications}`, `{labs}` fill points
- [x] 3.3 Implement `generate_note_for_patient(patient, template_type, groq_client)` — call LLM to produce natural-language note
- [x] 3.4 Implement batch generation in `generate_clinical_data.py` — each patient gets 2-5 notes (SOAP on admission, H&P, daily progress, discharge)
- [x] 3.5 Add progress bar via `tqdm` and checkpoint saving every 10 patients to `data/checkpoint.json`

## Phase 4: Validation & Export

- [x] 4.1 Validate diagnosis distribution in `scripts/validate_data.py` — compare generated ICD10 prevalence against real benchmarks
- [x] 4.2 Validate readmission rate — check 15-20 patients flagged as readmitted
- [x] 4.3 Validate demographics distribution — print age/gender/ethnicity histograms
- [x] 4.4 Validate note realism — sample 5 notes, manually spot-check coherence
- [x] 4.5 Export final dataset to `data/synthetic_patients.json` with all fields per patient
- [x] 4.6 Load data into SQLite: create `database/schema.sql` with patients, diagnoses, labs, medications, notes tables; run `scripts/load_to_sqlite.py`
- [x] 4.7 Run test RAG query: verify retrieval returns relevant fragments for "heart failure discharge" query
