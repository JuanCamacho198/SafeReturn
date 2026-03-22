# Design: Synthetic Clinical Data Generation

## Technical Approach

The system generates 100 synthetic patient records through a tiered pipeline: (1) demographic generation with faker, (2) ICD-10 diagnosis sampling based on real prevalence, (3) LLM-assisted clinical note generation via Groq API, (4) correlated lab values, and (5) readmission outcome assignment with risk stratification.

```
faker (demographics) → diagnosisSampler (ICD-10) → groqClient (clinical notes) 
                                                         ↓
                                              labCorrelator (lab values)
                                                         ↓
                                              outcomeAssigner (readmission)
                                                         ↓
                                              data/synthetic_patients.json
```

## Architecture Decisions

### Decision: Groq API for Clinical Notes

**Choice**: Use Groq API with Mixtral-8x7b-32768 model for clinical note generation
**Alternatives considered**: OpenAI API (more expensive), local LLMs (infrastructure cost), templates (too mechanical)
**Rationale**: Groq offers fast inference at lower cost; Mixtral provides good quality for narrative generation; meets the 500+ note requirement efficiently

### Decision: Faker-Based Demographic Generation

**Choice**: Use faker library with custom weighted providers
**Alternatives considered**: Random number generation (insufficient variety), external APIs (latency, costs)
**Rationale**: Faker is mature, pip-installable, and supports custom providers for realistic distributions

### Decision: JSON Output Format

**Choice**: Output to `data/synthetic_patients.json` with schema validation
**Alternatives considered**: CSV (loses nested structure), SQLite direct (less portable)
**Rationale**: JSON supports nested clinical notes and lab results; easily imported to SQLite

## Data Flow

1. **Demographics**: Generate age (18-95), gender, ethnicity per US Census weights
2. **Diagnoses**: Sample 1-5 ICD-10 codes per patient using prevalence rates (CHF 6%, COPD 5%, Pneumonia 4%, etc.)
3. **Clinical Notes**: Queue diagnoses → Groq API → Parse response → Validate coherence
4. **Labs**: For each diagnosis, lookup correlated lab parameters (e.g., BNP for CHF, creatinine for CKD)
5. **Readmission**: Apply risk factors (comorbidities, age >65) → 16% base rate + 10% per risk factor
6. **Validation**: Run statistical checks against expected distributions

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/generate_clinical_data.py` | Create | Main generation script with faker, Groq client, validation |
| `scripts/icd10_prevalence.json` | Create | Disease prevalence weights from CDC data |
| `data/synthetic_patients.json` | Create | Generated output (100 patients, 500+ notes) |
| `data/schema.json` | Create | JSON schema for validation |

## Interfaces / Contracts

```python
# Patient record structure
Patient = {
    "patient_id": str,           # UUID
    "demographics": {
        "age": int,              # 18-95
        "gender": str,            # "M" | "F"
        "ethnicity": str,         # Census categories
        "insurance": str          # "Medicare" | "Medicaid" | "Private" | "Self-pay"
    },
    "diagnoses": [
        {"icd10": str, "description": str, "primary": bool}
    ],
    "clinical_notes": [
        {
            "note_id": str,
            "note_type": str,    # "SOAP" | "H&P" | "Discharge"
            "content": str,       # LLM-generated narrative
            "date": str           # ISO date
        }
    ],
    "lab_results": [
        {"name": str, "value": float, "unit": str, "reference_range": tuple}
    ],
    "medications": [
        {"name": str, "dosage": str, "frequency": str}
    ],
    "outcomes": {
        "readmitted": bool,
        "days_to_readmission": int | null
    }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | faker providers, ICD-10 sampling, schema validation | pytest with mock data |
| Integration | Groq API connection, JSON output validity | fixture with small dataset |
| Validation | Statistical distribution checks | compare output vs expected ranges |

## Migration / Rollback

No migration required. This is a greenfield data generation task. Rollback: delete `data/synthetic_patients.json` and optionally regenerate with different seed.

## Open Questions

- [ ] Should clinical notes include timestamps within the patient encounter episode?
- [ ] Need to confirm Groq API rate limits for 500+ note generation batch