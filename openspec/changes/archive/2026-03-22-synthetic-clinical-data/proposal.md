# Proposal: Synthetic Clinical Data Generation

## Intent

The SafeReturn RAG system requires realistic clinical data to train and demonstrate the 30-day readmission prediction model. Real patient data is protected by HIPAA and unavailable. This change generates 100 synthetic patient records with realistic demographics, clinical notes, diagnoses, lab values, and medications to simulate the hospital environment for the RAG pipeline.

## Scope

### In Scope
- Generate 100 synthetic patient records
- Patient demographics (age, gender, ethnicity distribution matching US Census)
- ICD-10 diagnosis codes with realistic disease prevalence
- Clinical notes (SOAP, H&P, discharge summaries) in natural language
- Lab results with realistic values and reference ranges
- Medication lists with dosages
- Readmission outcomes (yes/no + days) at ~16% rate matching real statistics

### Out of Scope
- Real PHI data (using entirely synthetic data)
- Integration with external health record systems
- Regulatory compliance documentation beyond data generation

## Approach

Generate synthetic data using a tiered approach:

1. **Base demographics**: Use faker with weighted distributions matching US population (age 18-95, realistic gender ratio, ethnic diversity)
2. **Diagnoses**: Sample ICD-10 codes using real disease prevalence rates (heart failure ~6%, COPD ~5%, pneumonia ~4%, etc.)
3. **LLM-assisted clinical notes**: Use Groq API to generate realistic clinical narratives based on diagnoses
4. **Lab values**: Correlated with diagnoses - e.g., elevated BNP for heart failure, elevated creatinine for kidney disease
5. **Readmission labels**: Assign ~16% readmission rate with risk factor correlation (patients with CHF, multiple comorbidities have higher risk)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `data/synthetic_patients.json` | New | Generated patient dataset |
| `scripts/generate_clinical_data.py` | New | Generation script |
| `database/schema.sql` | Modified | Add new fields if needed |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| LLM API costs | Medium | Use small model, cache prompts |
| Data not realistic enough | Low | Validate against real statistics |
| Privacy concerns with Groq | Low | No PHI sent, all synthetic |

## Rollback Plan

Delete generated data files and revert any schema changes. The generation script is reproducible - can regenerate with different seed.

## Dependencies

- Groq API key for LLM-assisted note generation
- faker-python package installed

## Success Criteria

- [ ] 100 patient records generated with complete demographics
- [ ] Each patient has 2-5 clinical notes (500+ total notes)
- [ ] Readmission rate ~16% (15-20 patients)
- [ ] Diagnosis distribution matches real disease prevalence
- [ ] Clinical notes are coherent and disease-appropriate
- [ ] Data loads successfully into SQLite database
- [ ] RAG retrieval returns relevant fragments for test queries