"""Synthetic Clinical Data Generation Script

Generates 100 synthetic patient records with demographics, diagnoses,
clinical notes (via Groq LLM), lab results, medications, and readmission outcomes.
"""

import argparse
import json
import logging
import random
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from faker import Faker
from tqdm import tqdm

from icd10_prevalence import (
    COMORBIDITY_WEIGHTS,
    DIAGNOSIS_LAB_CORRELATIONS,
    ICD10_MEDICATION_MAP,
    ICD10_PREVALENCE,
)
from llm_client import create_client
from note_templates import (
    NOTE_TEMPLATES,
    format_diagnoses_for_note,
    format_labs_for_note,
    format_medications_for_note,
    get_template,
)
from schemas import (
    AGE_DISTRIBUTION,
    ETHNICITY_WEIGHTS,
    GENDER_WEIGHTS,
    INSURANCE_WEIGHTS,
)

CONFIG = {
    "N_PATIENTS": 100,
    "MIN_DIAGNOSES": 2,
    "MAX_DIAGNOSES": 6,
    "READMISSION_BASE_RATE": 0.16,
    "OUTPUT_FILE": "data/synthetic_patients.json",
    "CHECKPOINT_INTERVAL": 10,
}

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.FileHandler",
            "level": "DEBUG",
            "formatter": "standard",
            "filename": "logs/generate_clinical_data.log",
            "mode": "a",
        },
    },
    "root": {
        "level": "DEBUG",
        "handlers": ["console", "file"],
    },
}


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure logging for the script."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    return logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate synthetic clinical data for research purposes."
    )
    parser.add_argument(
        "-n",
        "--num-patients",
        type=int,
        default=CONFIG["N_PATIENTS"],
        help=f"Number of patients to generate (default: {CONFIG['N_PATIENTS']})",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=str,
        default=CONFIG["OUTPUT_FILE"],
        help="Output JSON file path",
    )
    parser.add_argument(
        "-s",
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    parser.add_argument(
        "--no-notes",
        action="store_true",
        help="Skip clinical note generation (faster generation)",
    )
    parser.add_argument(
        "--checkpoint",
        type=int,
        default=CONFIG["CHECKPOINT_INTERVAL"],
        help="Save checkpoint every N patients",
    )
    return parser.parse_args()


def generate_demographics(faker: Faker, n: int) -> list[dict[str, Any]]:
    """Generate demographics with weighted age, gender, ethnicity matching US Census.

    Args:
        faker: Faker instance
        n: Number of patients to generate

    Returns:
        List of demographics dictionaries
    """
    demographics = []

    for _ in range(n):
        age = _sample_age()
        gender = _sample_gender()
        ethnicity = _sample_ethnicity()
        insurance = _sample_insurance(age)

        demographics.append(
            {
                "age": age,
                "gender": gender,
                "ethnicity": ethnicity,
                "insurance": insurance,
            }
        )

    return demographics


def _sample_age() -> int:
    """Sample age from weighted distribution."""
    age_ranges = list(AGE_DISTRIBUTION.keys())
    weights = list(AGE_DISTRIBUTION.values())
    selected_range = random.choices(age_ranges, weights=weights, k=1)[0]
    return random.randint(selected_range[0], selected_range[1])


def _sample_gender() -> str:
    """Sample gender from weighted distribution."""
    genders = list(GENDER_WEIGHTS.keys())
    weights = list(GENDER_WEIGHTS.values())
    return random.choices(genders, weights=weights, k=1)[0]


def _sample_ethnicity() -> str:
    """Sample ethnicity from weighted distribution."""
    ethnicities = list(ETHNICITY_WEIGHTS.keys())
    weights = list(ETHNICITY_WEIGHTS.values())
    return random.choices(ethnicities, weights=weights, k=1)[0]


def _sample_insurance(age: int) -> str:
    """Sample insurance based on age."""
    if age >= 65:
        weights = {
            "Medicare": 0.70,
            "Medicaid": 0.10,
            "Private": 0.15,
            "Self-pay": 0.05,
        }
    elif age < 21:
        weights = {
            "Medicare": 0.05,
            "Medicaid": 0.50,
            "Private": 0.40,
            "Self-pay": 0.05,
        }
    else:
        weights = INSURANCE_WEIGHTS

    insurances = list(weights.keys())
    w = list(weights.values())
    return random.choices(insurances, weights=w, k=1)[0]


def sample_icd10_diagnoses(
    demographics: dict[str, Any],
    prevalence_dict: dict,
    rng: random.Random,
) -> list[dict[str, Any]]:
    """Sample 2-6 ICD10 codes per patient correlated with age/gender.

    Args:
        demographics: Patient demographics dict
        prevalence_dict: ICD10 prevalence dictionary
        rng: Random instance

    Returns:
        List of diagnosis dictionaries
    """
    age = demographics["age"]
    gender = demographics["gender"]

    eligible_codes = []
    for code, info in prevalence_dict.items():
        if age >= info["age_min"]:
            weight = info["prevalence"]
            if code.startswith("I") and gender == "F":
                weight *= 0.9
            elif code.startswith("J") and age < 45:
                weight *= 1.1
            eligible_codes.append((code, weight))

    codes = [c[0] for c in eligible_codes]
    weights = [c[1] for c in eligible_codes]

    num_diagnoses = rng.randint(2, 6)
    selected_codes = rng.choices(codes, weights=weights, k=num_diagnoses)
    selected_codes = list(set(selected_codes))

    diagnoses = []
    for i, code in enumerate(selected_codes):
        info = prevalence_dict[code]
        diagnoses.append(
            {
                "icd10": code,
                "description": info["name"],
                "primary": i == 0,
            }
        )

    return diagnoses


def generate_medications(
    diagnoses: list[dict[str, Any]], faker: Faker
) -> list[dict[str, Any]]:
    """Map ICD10 codes to medication classes with realistic dosage ranges.

    Args:
        diagnoses: List of diagnosis dictionaries
        faker: Faker instance

    Returns:
        List of medication dictionaries
    """
    medications = []
    seen_classes = set()

    for diagnosis in diagnoses:
        code = diagnosis["icd10"]
        if code in ICD10_MEDICATION_MAP:
            for med_name in ICD10_MEDICATION_MAP[code]:
                if med_name not in seen_classes:
                    seen_classes.add(med_name)
                    medications.append(_create_medication(med_name, faker))

    return medications


def _create_medication(name: str, faker: Faker) -> dict[str, str]:
    """Create a medication with realistic dosage."""
    dosage_ranges = {
        "Furosemide": ("20mg", "80mg"),
        "Lisinopril": ("5mg", "20mg"),
        "Carvedilol": ("6.25mg", "25mg"),
        "Spironolactone": ("25mg", "50mg"),
        "Albuterol": ("90mcg", "180mcg"),
        "Tiotropium": ("18mcg", "18mcg"),
        "Fluticasone": ("100mcg", "500mcg"),
        "Prednisone": ("10mg", "60mg"),
        "Amoxicillin": ("500mg", "875mg"),
        "Azithromycin": ("250mg", "500mg"),
        "Ceftriaxone": ("1g", "2g"),
        "Aspirin": ("81mg", "325mg"),
        "Clopidogrel": ("75mg", "75mg"),
        "Atorvastatin": ("10mg", "80mg"),
        "Metoprolol": ("25mg", "200mg"),
        "Apixaban": ("2.5mg", "5mg"),
        "Warfarin": ("1mg", "10mg"),
        "Metformin": ("500mg", "2000mg"),
        "Glipizide": ("5mg", "20mg"),
        "Liraglutide": ("0.6mg", "1.8mg"),
        "Insulin": ("10 units", "100 units"),
        "Amlodipine": ("2.5mg", "10mg"),
        "Hydrochlorothiazide": ("12.5mg", "50mg"),
        "Rosuvastatin": ("5mg", "40mg"),
        "Simvastatin": ("10mg", "80mg"),
        "Montelukast": ("4mg", "10mg"),
        "Sertraline": ("25mg", "200mg"),
        "Escitalopram": ("5mg", "20mg"),
        "Fluoxetine": ("10mg", "60mg"),
        "Buspirone": ("5mg", "30mg"),
        "Lorazepam": ("0.5mg", "2mg"),
        "Naproxen": ("250mg", "500mg"),
        "Cyclobenzaprine": ("5mg", "10mg"),
        "Omeprazole": ("20mg", "40mg"),
        "Pantoprazole": ("40mg", "40mg"),
        "Famotidine": ("20mg", "40mg"),
        "Ciprofloxacin": ("250mg", "750mg"),
        "Nitrofurantoin": ("50mg", "100mg"),
        "TMP-SMX": ("80/400mg", "160/800mg"),
        "Diltiazem": ("30mg", "240mg"),
        "Entresto": ("24/26mg", "97/103mg"),
    }

    dosage_range = dosage_ranges.get(name, ("10mg", "100mg"))
    dosage = faker.random_element([dosage_range[0], dosage_range[1]])

    freq = faker.random_element(
        [
            "Once daily",
            "Twice daily",
            "Three times daily",
            "Every 6 hours",
            "Every 8 hours",
            "Every 12 hours",
            "As needed",
        ]
    )

    route = faker.random_element(["PO", "IV", "IM", "SC", "TOP", "IN"])

    return {
        "name": name,
        "dosage": dosage,
        "frequency": freq,
        "route": route,
    }


def generate_labs(
    diagnoses: list[dict[str, Any]], faker: Faker
) -> list[dict[str, Any]]:
    """Correlate BNP/creatinine/glucose with specific diagnoses, include reference ranges.

    Args:
        diagnoses: List of diagnosis dictionaries
        faker: Faker instance

    Returns:
        List of lab result dictionaries
    """
    labs = []
    diagnosis_codes = {d["icd10"] for d in diagnoses}

    common_labs = [
        (
            "BMP",
            {
                "Glucose": (70, 140),
                "Creatinine": (0.7, 1.3),
                "BUN": (7, 20),
                "Sodium": (136, 145),
                "Potassium": (3.5, 5.0),
            },
        ),
        (
            "CBC",
            {
                "WBC": (4.5, 11.0),
                "RBC": (4.0, 5.5),
                "Hemoglobin": (12, 16),
                "Hematocrit": (36, 48),
                "Platelets": (150, 400),
            },
        ),
        (
            "LFT",
            {
                "ALT": (7, 56),
                "AST": (10, 40),
                "Albumin": (3.5, 5.0),
                "Bilirubin": (0.1, 1.2),
            },
        ),
    ]

    for panel_name, tests in common_labs:
        for test_name, (low, high) in tests.items():
            value = round(random.uniform(low, high), 2)
            flag = _determine_lab_flag(test_name, value, low, high)
            labs.append(
                {
                    "name": test_name,
                    "value": value,
                    "unit": _get_lab_unit(test_name),
                    "reference_range": (low, high),
                    "flag": flag,
                    "panel": panel_name,
                }
            )

    for code in diagnosis_codes:
        if code in DIAGNOSIS_LAB_CORRELATIONS:
            for lab_name, config in DIAGNOSIS_LAB_CORRELATIONS[code].items():
                if lab_name == "EF" or lab_name == "FEV1":
                    value = round(
                        random.uniform(config["range"][0], config["range"][1]), 1
                    )
                else:
                    value = round(
                        random.uniform(config["range"][0], config["range"][1]), 2
                    )

                flag = _determine_lab_flag(
                    lab_name, value, config["range"][0], config["range"][1]
                )
                labs.append(
                    {
                        "name": lab_name,
                        "value": value,
                        "unit": config["unit"],
                        "reference_range": config["range"],
                        "flag": flag,
                        "panel": "Special",
                    }
                )

    return labs


def _determine_lab_flag(name: str, value: float, low: float, high: float) -> str:
    """Determine if lab value is normal, low, high, or critical."""
    critical_low = low * 0.7
    critical_high = high * 1.3

    if value < critical_low:
        return "critical"
    elif value < low:
        return "low"
    elif value > critical_high:
        return "critical"
    elif value > high:
        return "high"
    return "normal"


def _get_lab_unit(name: str) -> str:
    """Get unit for lab test."""
    units = {
        "Glucose": "mg/dL",
        "Creatinine": "mg/dL",
        "BUN": "mg/dL",
        "Sodium": "mEq/L",
        "Potassium": "mEq/L",
        "WBC": "K/uL",
        "RBC": "M/uL",
        "Hemoglobin": "g/dL",
        "Hematocrit": "%",
        "Platelets": "K/uL",
        "ALT": "U/L",
        "AST": "U/L",
        "Albumin": "g/dL",
        "Bilirubin": "mg/dL",
        "BNP": "pg/mL",
        "EF": "%",
        "Troponin I": "ng/mL",
        "CK-MB": "ng/mL",
        "FEV1": "% predicted",
        "pO2": "mmHg",
        "HbA1c": "%",
        "eGFR": "mL/min/1.73m²",
        "INR": "",
    }
    return units.get(name, "")


def assign_readmission(
    diagnoses: list[dict[str, Any]], comorbidities: list[str]
) -> dict[str, Any]:
    """Assign readmission with ~16% rate; weight CHF, COPD, multi-morbidity higher.

    Args:
        diagnoses: List of diagnosis dictionaries
        comorbidities: List of comorbidity codes

    Returns:
        Outcomes dictionary with readmission info
    """
    code_set = {d["icd10"] for d in diagnoses}

    base_rate = CONFIG["READMISSION_BASE_RATE"]

    if "I50.9" in code_set or "I50.1" in code_set:
        base_rate += 0.12
    if "J44.9" in code_set or "J44.1" in code_set:
        base_rate += 0.08
    if len(code_set) >= 4:
        base_rate += 0.15
    if "E11.9" in code_set:
        base_rate += 0.05
    if "N18.3" in code_set:
        base_rate += 0.07

    for comorb in comorbidities:
        if comorb in code_set:
            for (c1, c2), weight in COMORBIDITY_WEIGHTS.items():
                if c1 == comorb or c2 == comorb:
                    base_rate += weight * 0.02

    readmitted = random.random() < min(base_rate, 0.35)

    if readmitted:
        days = random.randint(1, 30)
        disposition = random.choice(
            ["Home", "Home with Services", "SNF", "Rehab", "AMA"]
        )
    else:
        days = None
        disposition = random.choice(["Home", "Home with Services", "SNF", "Rehab"])

    return {
        "readmitted": readmitted,
        "days_to_readmission": days,
        "discharge_disposition": disposition,
    }


def generate_patients(n: int = 100, seed: int = 42) -> list[dict[str, Any]]:
    """Generate n patients with demographics, diagnoses, medications, labs, outcomes.

    Args:
        n: Number of patients to generate
        seed: Random seed for reproducibility

    Returns:
        List of patient dictionaries
    """
    rng = random.Random(seed)
    faker = Faker()
    Faker.seed(seed)

    patients = []

    demographics_list = generate_demographics(faker, n)

    for i in range(n):
        demographics = demographics_list[i]

        diagnoses = sample_icd10_diagnoses(demographics, ICD10_PREVALENCE, rng)

        medications = generate_medications(diagnoses, faker)

        labs = generate_labs(diagnoses, faker)

        comorbidity_codes = [d["icd10"] for d in diagnoses]
        outcomes = assign_readmission(diagnoses, comorbidity_codes)

        patient = {
            "patient_id": str(uuid.uuid4()),
            "demographics": demographics,
            "diagnoses": diagnoses,
            "medications": medications,
            "lab_results": labs,
            "outcomes": outcomes,
        }
        patients.append(patient)

    return patients


def generate_note_for_patient(
    patient: dict[str, Any],
    template_type: str,
    groq_client,
) -> dict[str, Any]:
    """Generate a clinical note for a patient using LLM.

    Args:
        patient: Patient data dictionary
        template_type: Type of note (SOAP, H&P, Discharge, Progress, Consult)
        groq_client: Configured Groq client wrapper

    Returns:
        Clinical note dictionary
    """
    demographics = patient["demographics"]
    diagnoses = patient["diagnoses"]
    medications = patient["medications"]
    labs = patient["lab_results"]

    primary_diag, secondary_diags, assessment_text = format_diagnoses_for_note(
        diagnoses
    )
    meds_formatted = format_medications_for_note(medications)
    labs_formatted = format_labs_for_note(labs)

    age = demographics["age"]
    gender = demographics["gender"]
    ethnicity = demographics["ethnicity"]

    template = get_template(template_type)
    if not template:
        raise ValueError(f"Unknown template type: {template_type}")

    system_prompt = """You are a clinical documentation specialist. Generate realistic, professional clinical notes.
Use proper medical terminology. Do not make up specific values that should come from patient data.
Keep notes concise but clinically meaningful. Each note should be 200-500 words."""

    if template_type == "SOAP":
        user_prompt = f"""Generate a SOAP note for this patient:
- Patient: {age} year old {gender}
- Ethnicity: {ethnicity}
- Primary diagnosis: {primary_diag}
- Secondary diagnoses: {secondary_diags}
- Assessment: {assessment_text}
- Medications: {meds_formatted}
- Key labs: {labs_formatted}

Follow standard SOAP format with Subjective, Objective, Assessment, and Plan sections.
Use realistic but fictional details consistent with the diagnoses."""

    elif template_type == "H&P":
        user_prompt = f"""Generate a comprehensive History and Physical note for this patient:
- Patient: {age} year old {gender}
- Ethnicity: {ethnicity}
- Primary diagnosis: {primary_diag}
- Secondary diagnoses: {secondary_diags}
- Medications: {meds_formatted}
- Labs: {labs_formatted}

Include all standard H&P sections: HPI, PMH, Medications, Allergies, Family History,
Social History, ROS, Physical Exam, Assessment and Plan. Use realistic fictional details."""

    elif template_type == "Discharge":
        days_admitted = random.randint(1, 7)
        admission_date = datetime.now() - timedelta(days=days_admitted)
        discharge_date = datetime.now()
        user_prompt = f"""Generate a discharge summary for this patient:
- Patient: {age} year old {gender}
- Admission date: {admission_date.strftime("%Y-%m-%d")}
- Discharge date: {discharge_date.strftime("%Y-%m-%d")}
- Primary diagnosis: {primary_diag}
- Secondary diagnoses: {secondary_diags}
- Hospital course: Summarize {days_admitted} days of hospitalization
- Medications on discharge: {meds_formatted}
- Labs: {labs_formatted}

Include standard discharge summary sections with realistic fictional details."""

    elif template_type == "Progress":
        user_prompt = f"""Generate a daily progress note for this patient:
- Patient: {age} year old {gender}
- Primary diagnosis: {primary_diag}
- Current status: Stable/improving/declining (choose appropriately)
- Medications: {meds_formatted}
- Labs: {labs_formatted}

Use brief SOAP format with today's findings and plan. Keep concise."""

    else:
        user_prompt = f"""Generate a consultation note for this patient:
- Patient: {age} year old {gender}
- Primary diagnosis: {primary_diag}
- Reason for consult: Evaluation of {primary_diag}
- Medications: {meds_formatted}
- Labs: {labs_formatted}

Include standard consultation format with H&P, impression, and recommendations."""

    content = groq_client.generate(
        prompt=user_prompt,
        system_prompt=system_prompt,
        temperature=0.3,
        max_tokens=1024,
    )

    note = {
        "note_id": str(uuid.uuid4()),
        "note_type": template_type,
        "content": content,
        "date": datetime.now().isoformat(),
    }

    return note


def generate_notes_for_patient(
    patient: dict[str, Any],
    groq_client,
    min_notes: int = 2,
    max_notes: int = 5,
) -> list[dict[str, Any]]:
    """Generate 2-5 clinical notes for a patient.

    Args:
        patient: Patient data dictionary
        groq_client: Configured Groq client wrapper
        min_notes: Minimum number of notes to generate
        max_notes: Maximum number of notes to generate

    Returns:
        List of clinical note dictionaries
    """
    available_types = ["SOAP", "H&P", "Progress", "Discharge", "Consult"]
    num_notes = random.randint(min_notes, max_notes)

    if "H&P" not in available_types:
        available_types.append("H&P")
    if "SOAP" not in available_types:
        available_types.insert(0, "SOAP")

    required_types = ["SOAP", "H&P"]
    selected_types = required_types.copy()

    remaining_slots = num_notes - len(required_types)
    if remaining_slots > 0:
        optional_types = [t for t in available_types if t not in required_types]
        selected_types.extend(
            random.sample(optional_types, min(remaining_slots, len(optional_types)))
        )

    notes = []
    for note_type in selected_types:
        try:
            note = generate_note_for_patient(patient, note_type, groq_client)
            notes.append(note)
        except Exception as e:
            logging.warning(f"Failed to generate {note_type} note: {e}")
            continue

    return notes


def save_checkpoint(patients: list[dict[str, Any]], checkpoint_path: Path) -> None:
    """Save checkpoint to file.

    Args:
        patients: List of patient records
        checkpoint_path: Path to checkpoint file
    """
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    checkpoint_data = {
        "patients": patients,
        "count": len(patients),
        "timestamp": datetime.now().isoformat(),
    }
    with open(checkpoint_path, "w") as f:
        json.dump(checkpoint_data, f, indent=2)


def load_checkpoint(checkpoint_path: Path) -> tuple[list[dict[str, Any]], int]:
    """Load checkpoint from file.

    Args:
        checkpoint_path: Path to checkpoint file

    Returns:
        Tuple of (patients list, next patient index)
    """
    with open(checkpoint_path, "r") as f:
        checkpoint_data = json.load(f)
    return checkpoint_data["patients"], checkpoint_data["count"]


def generate_patients_with_notes(
    n: int = 100,
    seed: int = 42,
    groq_api_key: str | None = None,
    checkpoint_interval: int = 10,
    verbose: bool = False,
) -> list[dict[str, Any]]:
    """Generate n patients with clinical notes.

    Args:
        n: Number of patients to generate
        seed: Random seed for reproducibility
        groq_api_key: Groq API key for LLM note generation
        checkpoint_interval: Save checkpoint every N patients
        verbose: Enable verbose logging

    Returns:
        List of patient dictionaries with clinical notes
    """
    rng = random.Random(seed)
    faker = Faker()
    Faker.seed(seed)

    checkpoint_path = Path("data/checkpoint.json")

    start_index = 0
    patients = []

    if checkpoint_path.exists():
        try:
            patients, start_index = load_checkpoint(checkpoint_path)
            logging.info(f"Loaded checkpoint with {start_index} patients")
            start_index = len(patients)
        except Exception as e:
            logging.warning(f"Could not load checkpoint: {e}")
            start_index = 0
            patients = []

    groq_client = None
    if groq_api_key:
        groq_client = create_client(groq_api_key)
        logging.info("Groq client initialized for note generation")

    total_to_generate = n - start_index
    if total_to_generate <= 0:
        logging.info(f"All {n} patients already generated")
        return patients

    for i in tqdm(
        range(start_index, n),
        initial=start_index,
        total=n,
        desc="Generating patients",
        disable=not verbose,
    ):
        demographics = generate_demographics(faker, 1)[0]

        diagnoses = sample_icd10_diagnoses(demographics, ICD10_PREVALENCE, rng)
        medications = generate_medications(diagnoses, faker)
        labs = generate_labs(diagnoses, faker)

        comorbidity_codes = [d["icd10"] for d in diagnoses]
        outcomes = assign_readmission(diagnoses, comorbidity_codes)

        patient = {
            "patient_id": str(uuid.uuid4()),
            "demographics": demographics,
            "diagnoses": diagnoses,
            "medications": medications,
            "lab_results": labs,
            "outcomes": outcomes,
            "clinical_notes": [],
        }

        if groq_client:
            try:
                notes = generate_notes_for_patient(patient, groq_client)
                patient["clinical_notes"] = notes
            except Exception as e:
                logging.warning(f"Failed to generate notes for patient: {e}")

        patients.append(patient)

        if (i + 1) % checkpoint_interval == 0:
            save_checkpoint(patients, checkpoint_path)
            logging.info(f"Checkpoint saved at {i + 1} patients")

    if checkpoint_path.exists():
        checkpoint_path.unlink()
        logging.info("Checkpoint cleared - generation complete")

    return patients


def main():
    """Main entry point for clinical data generation."""
    import os

    args = parse_args()
    logger = setup_logging(args.verbose)

    logger.info(f"Starting clinical data generation for {args.num_patients} patients")
    logger.info(f"Random seed: {args.seed}")
    logger.info(f"Output file: {args.output}")

    groq_api_key = None
    if not args.no_notes:
        groq_api_key = os.environ.get("GROQ_API_KEY")
        if groq_api_key:
            logger.info("Groq API key found - clinical notes will be generated")
        else:
            logger.warning("GROQ_API_KEY not set - skipping clinical notes")

    logger.info("Phase 2: Generating patient records...")

    if not args.no_notes and groq_api_key:
        logger.info("Phase 3: Generating clinical notes...")
        patients = generate_patients_with_notes(
            n=args.num_patients,
            seed=args.seed,
            groq_api_key=groq_api_key,
            checkpoint_interval=args.checkpoint,
            verbose=args.verbose,
        )
    else:
        patients = generate_patients(n=args.num_patients, seed=args.seed)
        for patient in tqdm(patients, desc="Adding empty notes structure"):
            patient["clinical_notes"] = []

    logger.info(f"Generated {len(patients)} patients")

    for patient in patients:
        num_notes = len(patient.get("clinical_notes", []))
        if num_notes == 0:
            logger.debug(f"Patient {patient['patient_id']} has no notes")

    note_counts = [len(p.get("clinical_notes", [])) for p in patients]
    avg_notes = sum(note_counts) / len(note_counts) if note_counts else 0
    logger.info(f"Average notes per patient: {avg_notes:.1f}")

    readmission_count = sum(1 for p in patients if p["outcomes"]["readmitted"])
    logger.info(
        f"Readmission rate: {readmission_count}/{len(patients)} ({100 * readmission_count / len(patients):.1f}%)"
    )

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(patients, f, indent=2)

    logger.info(f"Saved to {args.output}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
