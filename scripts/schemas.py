"""Patient Schema Constants

Defines the data structures and field constants for synthetic patient records.
Based on the design specification for clinical data generation.
"""

from typing import Final

DEMOGRAPHICS_SCHEMA = {
    "age": {"type": "int", "min": 18, "max": 95},
    "gender": {"type": "str", "enum": ["M", "F"]},
    "ethnicity": {
        "type": "str",
        "enum": ["White", "Hispanic", "Black", "Asian", "Other"],
    },
    "insurance": {
        "type": "str",
        "enum": ["Medicare", "Medicaid", "Private", "Self-pay"],
    },
}

GENDER_WEIGHTS: Final[dict] = {
    "M": 0.49,
    "F": 0.51,
}

ETHNICITY_WEIGHTS: Final[dict] = {
    "White": 0.60,
    "Hispanic": 0.18,
    "Black": 0.13,
    "Asian": 0.06,
    "Other": 0.03,
}

INSURANCE_WEIGHTS: Final[dict] = {
    "Medicare": 0.35,
    "Medicaid": 0.20,
    "Private": 0.40,
    "Self-pay": 0.05,
}

AGE_DISTRIBUTION: Final[dict] = {
    (18, 30): 0.15,
    (31, 45): 0.20,
    (46, 60): 0.25,
    (61, 75): 0.25,
    (76, 95): 0.15,
}

DIAGNOSIS_SCHEMA = {
    "icd10": {"type": "str", "pattern": r"^[A-Z]\d{2}(\.\d{1,2})?$"},
    "description": {"type": "str"},
    "primary": {"type": "bool"},
}

CLINICAL_NOTE_SCHEMA = {
    "note_id": {"type": "str", "format": "uuid"},
    "note_type": {
        "type": "str",
        "enum": ["SOAP", "H&P", "Progress", "Discharge", "Consult"],
    },
    "content": {"type": "str", "min_length": 100, "max_length": 5000},
    "date": {"type": "str", "format": "iso8601"},
}

NOTE_TYPES: Final[list] = [
    "SOAP",
    "H&P",
    "Progress",
    "Discharge",
    "Consult",
]

LAB_RESULT_SCHEMA = {
    "name": {"type": "str"},
    "value": {"type": "float"},
    "unit": {"type": "str"},
    "reference_range": {"type": "tuple"},
    "flag": {
        "type": "str",
        "enum": ["normal", "low", "high", "critical"],
        "nullable": True,
    },
}

MEDICATION_SCHEMA = {
    "name": {"type": "str"},
    "dosage": {"type": "str"},
    "frequency": {"type": "str"},
    "route": {"type": "str", "enum": ["PO", "IV", "IM", "SC", "TOP", "IN"]},
}

COMMON_MEDICATION_FREQUENCIES: Final[list] = [
    "Once daily",
    "Twice daily",
    "Three times daily",
    "Four times daily",
    "Every 6 hours",
    "Every 8 hours",
    "Every 12 hours",
    "As needed",
    "PRN",
]

OUTCOMES_SCHEMA = {
    "readmitted": {"type": "bool"},
    "days_to_readmission": {"type": "int", "nullable": True, "min": 1, "max": 30},
    "discharge_disposition": {
        "type": "str",
        "enum": ["Home", "Home with Services", "SNF", "Rehab", "AMA", "Deceased"],
    },
}

READMISSION_RISK_FACTORS: Final[dict] = {
    "age_over_65": 0.10,
    "chf": 0.12,
    "copd": 0.08,
    "diabetes": 0.05,
    "ckd": 0.07,
    "multiple_comorbidities": 0.15,
    "public_insurance": 0.03,
}

PATIENT_OUTPUT_SCHEMA = {
    "patient_id": str,
    "demographics": dict,
    "diagnoses": list,
    "clinical_notes": list,
    "lab_results": list,
    "medications": list,
    "outcomes": dict,
}

HEALTH_LITERACY_LEVELS: Final[list] = [
    "Low",
    "Medium",
    "High",
]

SOCIAL_DETERMINANTS: Final[list] = [
    "Stable Housing",
    "Unstable Housing",
    "Food Insecure",
    "Transportation Barriers",
    "Social Support",
    "No Barriers",
]
