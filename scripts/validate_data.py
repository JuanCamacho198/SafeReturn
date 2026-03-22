"""Clinical Data Validation Script

Validates synthetic patient data against real-world benchmarks for:
- Diagnosis distribution
- Readmission rates
- Demographics (age, gender, ethnicity)
- Clinical note realism
"""

import argparse
import json
import random
from collections import Counter
from pathlib import Path
from typing import Any

REAL_WORLD_BENCHMARKS = {
    "diagnosis_prevalence": {
        "I10": {"name": "Essential Hypertension", "expected_pct": 26.0},
        "E11.9": {"name": "Type 2 Diabetes Mellitus", "expected_pct": 10.5},
        "I50.9": {"name": "Congestive Heart Failure", "expected_pct": 6.0},
        "J44.9": {"name": "COPD", "expected_pct": 5.0},
        "J18.9": {"name": "Pneumonia", "expected_pct": 4.0},
        "I21.9": {"name": "Acute Myocardial Infarction", "expected_pct": 3.0},
        "M54.5": {"name": "Low Back Pain", "expected_pct": 8.0},
        "E78.5": {"name": "Hyperlipidemia", "expected_pct": 7.0},
        "K21.9": {"name": "GERD", "expected_pct": 5.0},
        "F32.9": {"name": "Major Depressive Disorder", "expected_pct": 5.0},
        "F41.9": {"name": "Anxiety Disorder", "expected_pct": 5.0},
        "J45.909": {"name": "Asthma", "expected_pct": 4.0},
        "N18.3": {"name": "Chronic Kidney Disease", "expected_pct": 3.0},
    },
    "readmission_rate": {"min": 15, "max": 20, "unit": "%"},
    "age_distribution": {
        "18-44": 35,
        "45-64": 35,
        "65-84": 25,
        "85+": 5,
    },
    "gender_distribution": {"M": 48, "F": 52},
    "ethnicity_distribution": {
        "White": 60,
        "Hispanic": 18,
        "Black": 13,
        "Asian": 6,
        "Other": 3,
    },
}


def load_patients(data_path: str) -> list[dict[str, Any]]:
    with open(data_path, "r") as f:
        return json.load(f)


def validate_diagnosis_distribution(patients: list[dict[str, Any]]) -> dict[str, Any]:
    all_diagnoses = []
    for patient in patients:
        for diag in patient["diagnoses"]:
            all_diagnoses.append(diag["icd10"])

    diagnosis_counts = Counter(all_diagnoses)
    total = len(patients)
    results = {"passed": True, "diagnoses": {}}

    print("\n=== DIAGNOSIS DISTRIBUTION VALIDATION ===")
    print(
        f"{'ICD10':<10} {'Description':<35} {'Actual %':<10} {'Expected %':<12} {'Status'}"
    )
    print("-" * 85)

    for icd10, info in REAL_WORLD_BENCHMARKS["diagnosis_prevalence"].items():
        count = diagnosis_counts.get(icd10, 0)
        actual_pct = (count / total) * 100
        expected_pct = info["expected_pct"]
        tolerance = 5

        is_acceptable = abs(actual_pct - expected_pct) <= tolerance
        status = "PASS" if is_acceptable else "WARN"
        if not is_acceptable:
            results["passed"] = False

        results["diagnoses"][icd10] = {
            "count": count,
            "actual_pct": round(actual_pct, 1),
            "expected_pct": expected_pct,
            "status": status,
        }

        print(
            f"{icd10:<10} {info['name'][:35]:<35} {actual_pct:>6.1f}%    "
            f"{expected_pct:>6.1f}%     {status}"
        )

    print("-" * 85)
    print(f"Note: +/- {tolerance}% tolerance applied. Top 10 diagnoses:")
    top_10 = diagnosis_counts.most_common(10)
    for icd10, count in top_10:
        pct = (count / total) * 100
        print(f"  {icd10}: {count} ({pct:.1f}%)")

    return results


def validate_readmission_rate(patients: list[dict[str, Any]]) -> dict[str, Any]:
    readmitted = [p for p in patients if p["outcomes"]["readmitted"]]
    rate = (len(readmitted) / len(patients)) * 100

    benchmark = REAL_WORLD_BENCHMARKS["readmission_rate"]
    is_valid = benchmark["min"] <= rate <= benchmark["max"]

    print("\n=== READMISSION RATE VALIDATION ===")
    print(f"Total patients: {len(patients)}")
    print(f"Readmitted patients: {len(readmitted)}")
    print(f"Actual rate: {rate:.1f}%")
    print(f"Expected range: {benchmark['min']}-{benchmark['max']}%")
    print(f"Status: {'PASS' if is_valid else 'WARN'}")

    if len(readmitted) >= 15:
        print("\nSample of readmitted patients:")
        sample = random.sample(readmitted, min(5, len(readmitted)))
        for p in sample:
            diag = [d["description"] for d in p["diagnoses"] if d["primary"]]
            print(
                f"  - {p['patient_id'][:8]}... Age {p['demographics']['age']}: "
                f"{diag[0] if diag else 'N/A'} (readmit in {p['outcomes']['days_to_readmission']} days)"
            )

    return {
        "passed": is_valid,
        "total": len(patients),
        "readmitted": len(readmitted),
        "rate": round(rate, 1),
        "expected_range": f"{benchmark['min']}-{benchmark['max']}%",
    }


def validate_demographics(patients: list[dict[str, Any]]) -> dict[str, Any]:
    ages = [p["demographics"]["age"] for p in patients]
    genders = [p["demographics"]["gender"] for p in patients]
    ethnicities = [p["demographics"]["ethnicity"] for p in patients]

    print("\n=== DEMOGRAPHICS VALIDATION ===")

    print("\n--- Age Distribution ---")
    age_ranges = {
        "18-44": (18, 44),
        "45-64": (45, 64),
        "65-84": (65, 84),
        "85+": (85, 120),
    }
    age_dist = {k: 0 for k in age_ranges}
    for age in ages:
        for range_name, (low, high) in age_ranges.items():
            if low <= age <= high:
                age_dist[range_name] += 1
                break

    print(
        f"{'Age Range':<12} {'Count':<8} {'Actual %':<10} {'Expected %':<12} {'Status'}"
    )
    print("-" * 50)
    age_benchmark = REAL_WORLD_BENCHMARKS["age_distribution"]
    age_passed = True
    for range_name, count in age_dist.items():
        actual_pct = (count / len(patients)) * 100
        expected_pct = age_benchmark[range_name]
        status = "PASS" if abs(actual_pct - expected_pct) <= 10 else "WARN"
        if status == "WARN":
            age_passed = False
        print(
            f"{range_name:<12} {count:<8} {actual_pct:>6.1f}%     {expected_pct:>6.1f}%       {status}"
        )

    print(f"\n  Age histogram (bin size 5):")
    age_buckets = Counter(((a // 5) * 5 for a in ages))
    for bucket in sorted(age_buckets.keys()):
        count = age_buckets[bucket]
        bar = "#" * (count // 2)
        print(f"  {bucket:>3}-{bucket + 4:>3}: {bar} ({count})")

    print("\n--- Gender Distribution ---")
    gender_dist = Counter(genders)
    print(f"{'Gender':<10} {'Count':<8} {'Actual %':<10} {'Expected %':<12} {'Status'}")
    print("-" * 50)
    gender_benchmark = REAL_WORLD_BENCHMARKS["gender_distribution"]
    gender_passed = True
    for gender in ["M", "F"]:
        count = gender_dist.get(gender, 0)
        actual_pct = (count / len(patients)) * 100
        expected_pct = gender_benchmark[gender]
        status = "PASS" if abs(actual_pct - expected_pct) <= 10 else "WARN"
        if status == "WARN":
            gender_passed = False
        print(
            f"{gender:<10} {count:<8} {actual_pct:>6.1f}%     {expected_pct:>6.1f}%       {status}"
        )

    print("\n--- Ethnicity Distribution ---")
    ethnicity_dist = Counter(ethnicities)
    print(
        f"{'Ethnicity':<12} {'Count':<8} {'Actual %':<10} {'Expected %':<12} {'Status'}"
    )
    print("-" * 50)
    ethnicity_benchmark = REAL_WORLD_BENCHMARKS["ethnicity_distribution"]
    ethnicity_passed = True
    for ethnicity, count in sorted(ethnicity_dist.items(), key=lambda x: -x[1]):
        actual_pct = (count / len(patients)) * 100
        expected_pct = ethnicity_benchmark.get(ethnicity, 5)
        status = "PASS" if abs(actual_pct - expected_pct) <= 8 else "WARN"
        if status == "WARN":
            ethnicity_passed = False
        print(
            f"{ethnicity:<12} {count:<8} {actual_pct:>6.1f}%     {expected_pct:>6.1f}%       {status}"
        )

    all_passed = age_passed and gender_passed and ethnicity_passed
    return {
        "passed": all_passed,
        "age_distribution": {
            k: {"count": v, "pct": round((v / len(patients)) * 100, 1)}
            for k, v in age_dist.items()
        },
        "gender_distribution": {
            k: {"count": v, "pct": round((v / len(patients)) * 100, 1)}
            for k, v in gender_dist.items()
        },
        "ethnicity_distribution": {
            k: {"count": v, "pct": round((v / len(patients)) * 100, 1)}
            for k, v in ethnicity_dist.items()
        },
    }


def validate_note_realism(
    patients: list[dict[str, Any]], num_samples: int = 5
) -> dict[str, Any]:
    patients_with_notes = [
        p for p in patients if p.get("clinical_notes") and len(p["clinical_notes"]) > 0
    ]

    print("\n=== CLINICAL NOTE REALISM VALIDATION ===")

    if len(patients_with_notes) == 0:
        print(
            "No patients with clinical notes found. Generating sample notes for validation..."
        )

        sample_patients = random.sample(patients, min(num_samples, len(patients)))
        for patient in sample_patients:
            print(f"\n--- Sample Patient (ID: {patient['patient_id'][:8]}...) ---")
            print(
                f"  Demographics: {patient['demographics']['age']} y/o {patient['demographics']['gender']}, "
                f"{patient['demographics']['ethnicity']}"
            )
            print(
                f"  Primary Diagnosis: {patient['diagnoses'][0]['description'] if patient['diagnoses'] else 'N/A'}"
            )
            print(
                f"  Secondary Diagnoses: {[d['description'] for d in patient['diagnoses'][1:4]]}"
            )
            print(
                f"  Medications: {[m['name'] for m in patient['medications'][:5]]}..."
            )
            print(f"  Note count: 0 (no notes generated)")

        print("\n  NOTE: Clinical notes require GROQ_API_KEY to be set.")
        print(
            "  Run: export GROQ_API_KEY=your_key && python scripts/generate_clinical_data.py"
        )
        return {
            "passed": False,
            "reason": "No clinical notes in dataset",
            "samples_checked": 0,
        }

    samples = random.sample(
        patients_with_notes, min(num_samples, len(patients_with_notes))
    )

    print(f"Checking {len(samples)} patients with clinical notes...\n")

    results = []
    for i, patient in enumerate(samples, 1):
        print(f"--- Sample {i} (ID: {patient['patient_id'][:8]}...) ---")
        print(
            f"  Demographics: {patient['demographics']['age']} y/o {patient['demographics']['gender']}, "
            f"{patient['demographics']['ethnicity']}"
        )

        diagnoses = patient["diagnoses"]
        primary_diag = next(
            (d for d in diagnoses if d["primary"]), diagnoses[0] if diagnoses else None
        )
        if primary_diag:
            print(
                f"  Primary Diagnosis: {primary_diag['description']} ({primary_diag['icd10']})"
            )

        notes = patient["clinical_notes"]
        print(f"  Number of notes: {len(notes)}")

        coherent_count = 0
        for note in notes[:3]:
            print(f"\n  Note Type: {note.get('note_type', 'Unknown')}")
            content = note.get("content", "")
            if len(content) > 200:
                print(f"  Content Preview: {content[:200]}...")
            else:
                print(f"  Content: {content}")

            coherence_score = assess_note_coherence(content, diagnoses)
            coherent_count += coherence_score
            print(f"  Coherence Score: {coherence_score}/3")

        avg_coherence = coherent_count / max(len(notes), 1)
        print(f"\n  Average Coherence: {avg_coherence:.1f}/3")
        results.append(
            {"patient_id": patient["patient_id"], "coherence": avg_coherence}
        )
        print()

    avg_all = sum(r["coherence"] for r in results) / len(results) if results else 0
    print(f"Overall Average Coherence: {avg_all:.1f}/3")
    print(f"Status: {'PASS' if avg_all >= 2.0 else 'WARN'}")

    return {
        "passed": avg_all >= 2.0 if results else False,
        "samples_checked": len(samples),
        "average_coherence": round(avg_all, 1),
        "individual_scores": results,
    }


def assess_note_coherence(note_content: str, diagnoses: list[dict[str, Any]]) -> int:
    score = 0

    if len(note_content) > 50:
        score += 1

    diag_keywords = [d["description"].lower().split()[0] for d in diagnoses[:3]]
    content_lower = note_content.lower()
    if any(keyword in content_lower for keyword in diag_keywords):
        score += 1

    if any(
        word in content_lower
        for word in ["patient", "history", "diagnosis", "plan", "medication"]
    ):
        score += 1

    return score


def export_final_dataset(
    patients: list[dict[str, Any]], output_path: str
) -> dict[str, Any]:
    print(f"\n=== EXPORTING FINAL DATASET ===")
    print(f"Output path: {output_path}")

    required_fields = [
        "patient_id",
        "demographics",
        "diagnoses",
        "medications",
        "lab_results",
        "outcomes",
    ]

    invalid_count = 0
    for i, patient in enumerate(patients):
        for field in required_fields:
            if field not in patient:
                print(f"  WARNING: Patient {i} missing field '{field}'")
                invalid_count += 1

    valid_patients = [p for p in patients if all(f in p for f in required_fields)]

    with open(output_path, "w") as f:
        json.dump(valid_patients, f, indent=2)

    print(f"Total patients: {len(patients)}")
    print(f"Valid patients exported: {len(valid_patients)}")
    print(f"Missing/invalid records: {invalid_count}")

    return {
        "passed": invalid_count == 0,
        "total": len(patients),
        "exported": len(valid_patients),
        "invalid": invalid_count,
    }


def run_validation(data_path: str = "data/synthetic_patients.json") -> dict[str, Any]:
    print("=" * 60)
    print("CLINICAL DATA VALIDATION REPORT")
    print("=" * 60)

    patients = load_patients(data_path)
    print(f"\nLoaded {len(patients)} patients from {data_path}")

    results = {}

    results["diagnosis_distribution"] = validate_diagnosis_distribution(patients)
    results["readmission_rate"] = validate_readmission_rate(patients)
    results["demographics"] = validate_demographics(patients)
    results["note_realism"] = validate_note_realism(patients)
    results["export"] = export_final_dataset(patients, data_path)

    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)

    all_passed = all(r.get("passed", False) for r in results.values())
    print(f"\nOverall Status: {'ALL PASSED' if all_passed else 'SOME WARNINGS'}")

    for check, result in results.items():
        status = "PASS" if result.get("passed") else "WARN"
        print(f"  {check}: {status}")

    print("=" * 60)

    return results


def main():
    parser = argparse.ArgumentParser(description="Validate synthetic clinical data")
    parser.add_argument(
        "-d",
        "--data",
        default="data/synthetic_patients.json",
        help="Path to synthetic patient data",
    )
    parser.add_argument(
        "-s", "--samples", type=int, default=5, help="Number of note samples to check"
    )
    args = parser.parse_args()

    results = run_validation(args.data)

    if all(r.get("passed", False) for r in results.values()):
        return 0
    return 1


if __name__ == "__main__":
    import sys

    sys.exit(main())
