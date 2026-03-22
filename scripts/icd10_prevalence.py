"""ICD-10 Diagnosis Prevalence Dictionary

Prevalence rates based on CDC/hospital data for common conditions.
Used for weighted sampling of diagnoses in synthetic patient generation.
"""

ICD10_PREVALENCE = {
    "I50.9": {
        "name": "Congestive Heart Failure (CHF)",
        "prevalence": 0.06,
        "age_min": 55,
    },
    "J44.9": {
        "name": "Chronic Obstructive Pulmonary Disease (COPD)",
        "prevalence": 0.05,
        "age_min": 45,
    },
    "J18.9": {
        "name": "Pneumonia, unspecified organism",
        "prevalence": 0.04,
        "age_min": 50,
    },
    "I21.9": {
        "name": "Acute Myocardial Infarction (AMI)",
        "prevalence": 0.03,
        "age_min": 40,
    },
    "I63.9": {
        "name": "Cerebral Infarction (Stroke)",
        "prevalence": 0.02,
        "age_min": 55,
    },
    "E11.9": {"name": "Type 2 Diabetes Mellitus", "prevalence": 0.08, "age_min": 35},
    "N17.9": {"name": "Acute Kidney Failure", "prevalence": 0.04, "age_min": 50},
    "N18.3": {
        "name": "Chronic Kidney Disease, Stage 3",
        "prevalence": 0.03,
        "age_min": 45,
    },
    "I10": {"name": "Essential Hypertension", "prevalence": 0.10, "age_min": 30},
    "E78.5": {"name": "Hyperlipidemia, unspecified", "prevalence": 0.08, "age_min": 35},
    "J45.909": {"name": "Asthma, unspecified", "prevalence": 0.05, "age_min": 18},
    "F32.9": {"name": "Major Depressive Disorder", "prevalence": 0.06, "age_min": 18},
    "F41.9": {
        "name": "Anxiety Disorder, unspecified",
        "prevalence": 0.05,
        "age_min": 18,
    },
    "M54.5": {"name": "Low Back Pain", "prevalence": 0.07, "age_min": 25},
    "K21.9": {
        "name": "Gastroesophageal Reflux Disease",
        "prevalence": 0.06,
        "age_min": 30,
    },
    "N39.0": {"name": "Urinary Tract Infection", "prevalence": 0.05, "age_min": 50},
    "I48.0": {"name": "Atrial Fibrillation", "prevalence": 0.03, "age_min": 55},
    "J44.1": {
        "name": "COPD with acute exacerbation",
        "prevalence": 0.02,
        "age_min": 50,
    },
    "I50.1": {"name": "Left Heart Failure", "prevalence": 0.02, "age_min": 55},
    "E11.65": {
        "name": "Type 2 DM with hyperglycemia",
        "prevalence": 0.02,
        "age_min": 40,
    },
}

ICD10_MEDICATION_MAP = {
    "I50.9": ["Furosemide", "Lisinopril", "Carvedilol", "Spironolactone"],
    "J44.9": ["Albuterol", "Tiotropium", "Fluticasone", "Prednisone"],
    "J18.9": ["Amoxicillin", "Azithromycin", "Ceftriaxone"],
    "I21.9": ["Aspirin", "Clopidogrel", "Atorvastatin", "Metoprolol"],
    "I63.9": ["Aspirin", "Atorvastatin", "Apixaban", "Warfarin"],
    "E11.9": ["Metformin", "Glipizide", "Liraglutide", "Insulin"],
    "N17.9": ["Furosemide", "Bun/SCr monitoring"],
    "N18.3": ["Lisinopril", "Sodium restriction"],
    "I10": ["Lisinopril", "Amlodipine", "Hydrochlorothiazide"],
    "E78.5": ["Atorvastatin", "Rosuvastatin", "Simvastatin"],
    "J45.909": ["Albuterol", "Fluticasone", "Montelukast"],
    "F32.9": ["Sertraline", "Escitalopram", "Fluoxetine"],
    "F41.9": ["Sertraline", "Buspirone", "Lorazepam"],
    "M54.5": ["Naproxen", "Cyclobenzaprine", "Physical therapy"],
    "K21.9": ["Omeprazole", "Pantoprazole", "Famotidine"],
    "N39.0": ["Ciprofloxacin", "Nitrofurantoin", "TMP-SMX"],
    "I48.0": ["Apixaban", "Diltiazem", "Metoprolol"],
    "J44.1": ["Prednisone", "Albuterol", "Tiotropium"],
    "I50.1": ["Furosemide", "Carvedilol", "Entresto"],
    "E11.65": ["Insulin", "Metformin", "Glipizide"],
}

DIAGNOSIS_LAB_CORRELATIONS = {
    "I50.9": {
        "BNP": {"range": (100, 1000), "unit": "pg/mL", "high_abnormal": ">500"},
        "EF": {"range": (25, 55), "unit": "%", "low_abnormal": "<40"},
    },
    "I21.9": {
        "Troponin I": {"range": (0, 2.5), "unit": "ng/mL", "high_abnormal": ">0.5"},
        "CK-MB": {"range": (0, 8), "unit": "ng/mL", "high_abnormal": ">5"},
    },
    "J44.9": {
        "FEV1": {"range": (40, 80), "unit": "% predicted", "low_abnormal": "<50"},
        "pO2": {"range": (55, 80), "unit": "mmHg", "low_abnormal": "<60"},
    },
    "E11.9": {
        "HbA1c": {"range": (5.5, 9.5), "unit": "%", "high_abnormal": ">7.0"},
        "Glucose": {"range": (80, 250), "unit": "mg/dL", "high_abnormal": ">140"},
    },
    "N17.9": {
        "Creatinine": {"range": (1.2, 4.5), "unit": "mg/dL", "high_abnormal": ">1.5"},
        "BUN": {"range": (15, 60), "unit": "mg/dL", "high_abnormal": ">25"},
    },
    "N18.3": {
        "eGFR": {"range": (30, 59), "unit": "mL/min/1.73m²", "low_abnormal": "<45"},
        "Creatinine": {"range": (1.0, 2.0), "unit": "mg/dL", "high_abnormal": ">1.3"},
    },
    "I48.0": {
        "INR": {"range": (1.5, 3.5), "unit": "", "out_of_range": "not 2-3"},
    },
}

COMORBIDITY_WEIGHTS = {
    ("I50.9", "J44.9"): 2.0,
    ("I50.9", "E11.9"): 1.8,
    ("I50.9", "N18.3"): 1.7,
    ("J44.9", "E11.9"): 1.5,
    ("I21.9", "I50.9"): 2.0,
    ("I63.9", "I48.0"): 1.5,
    ("E11.9", "N18.3"): 1.8,
}

SPECIALTY_REFERRALS = {
    "I50.9": "Cardiology",
    "I21.9": "Cardiology",
    "I48.0": "Cardiology",
    "I63.9": "Neurology",
    "J44.9": "Pulmonology",
    "J18.9": "Pulmonology",
    "E11.9": "Endocrinology",
    "N17.9": "Nephrology",
    "N18.3": "Nephrology",
}
