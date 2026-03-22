"""Load synthetic clinical data into SQLite database.

Usage:
    python scripts/load_to_sqlite.py --data data/synthetic_patients.json --db database/clinical_data.db
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path


def create_tables(conn: sqlite3.Connection) -> None:
    schema_path = Path(__file__).parent.parent / "database" / "schema.sql"
    with open(schema_path, "r") as f:
        schema = f.read()
    conn.executescript(schema)
    conn.commit()
    print("Database tables created successfully")


def load_patients(conn: sqlite3.Connection, patients: list[dict]) -> int:
    cursor = conn.cursor()
    count = 0

    for patient in patients:
        demographics = patient.get("demographics", {})
        outcomes = patient.get("outcomes", {})

        cursor.execute(
            """
            INSERT OR REPLACE INTO patients 
            (patient_id, age, gender, ethnicity, insurance, readmitted, days_to_readmission, discharge_disposition)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient["patient_id"],
                demographics.get("age"),
                demographics.get("gender"),
                demographics.get("ethnicity"),
                demographics.get("insurance"),
                1 if outcomes.get("readmitted") else 0,
                outcomes.get("days_to_readmission"),
                outcomes.get("discharge_disposition"),
            ),
        )
        count += 1

    conn.commit()
    return count


def load_diagnoses(conn: sqlite3.Connection, patients: list[dict]) -> int:
    cursor = conn.cursor()
    count = 0

    for patient in patients:
        for diag in patient.get("diagnoses", []):
            cursor.execute(
                """
                INSERT INTO diagnoses (patient_id, icd10, description, is_primary)
                VALUES (?, ?, ?, ?)
                """,
                (
                    patient["patient_id"],
                    diag.get("icd10"),
                    diag.get("description"),
                    1 if diag.get("primary") else 0,
                ),
            )
            count += 1

    conn.commit()
    return count


def load_labs(conn: sqlite3.Connection, patients: list[dict]) -> int:
    cursor = conn.cursor()
    count = 0

    for patient in patients:
        for lab in patient.get("lab_results", []):
            ref_range = lab.get("reference_range", [])
            ref_low = ref_range[0] if len(ref_range) > 0 else None
            ref_high = ref_range[1] if len(ref_range) > 1 else None

            cursor.execute(
                """
                INSERT INTO labs (patient_id, name, value, unit, ref_low, ref_high, flag, panel)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    patient["patient_id"],
                    lab.get("name"),
                    lab.get("value"),
                    lab.get("unit"),
                    ref_low,
                    ref_high,
                    lab.get("flag"),
                    lab.get("panel"),
                ),
            )
            count += 1

    conn.commit()
    return count


def load_medications(conn: sqlite3.Connection, patients: list[dict]) -> int:
    cursor = conn.cursor()
    count = 0

    for patient in patients:
        for med in patient.get("medications", []):
            cursor.execute(
                """
                INSERT INTO medications (patient_id, name, dosage, frequency, route)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    patient["patient_id"],
                    med.get("name"),
                    med.get("dosage"),
                    med.get("frequency"),
                    med.get("route"),
                ),
            )
            count += 1

    conn.commit()
    return count


def load_notes(conn: sqlite3.Connection, patients: list[dict]) -> int:
    cursor = conn.cursor()
    count = 0

    for patient in patients:
        for note in patient.get("clinical_notes", []):
            cursor.execute(
                """
                INSERT INTO clinical_notes (patient_id, note_type, content, date)
                VALUES (?, ?, ?, ?)
                """,
                (
                    patient["patient_id"],
                    note.get("note_type"),
                    note.get("content"),
                    note.get("date"),
                ),
            )
            count += 1

    conn.commit()
    return count


def verify_data(conn: sqlite3.Connection) -> dict:
    cursor = conn.cursor()
    stats = {}

    cursor.execute("SELECT COUNT(*) FROM patients")
    stats["patients"] = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM diagnoses")
    stats["diagnoses"] = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM labs")
    stats["labs"] = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM medications")
    stats["medications"] = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM clinical_notes")
    stats["notes"] = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM patients WHERE readmitted = 1")
    stats["readmitted"] = cursor.fetchone()[0]

    return stats


def run_test_query(conn: sqlite3.Connection) -> list:
    cursor = conn.cursor()

    cursor.execute("""
        SELECT p.patient_id, p.age, p.gender, d.icd10, d.description, p.readmitted
        FROM patients p
        JOIN diagnoses d ON p.patient_id = d.patient_id
        WHERE d.icd10 = 'I50.9'
        LIMIT 5
    """)
    
    results = cursor.fetchall()
    return results


def main():
    parser = argparse.ArgumentParser(description="Load synthetic clinical data into SQLite")
    parser.add_argument(
        "--data",
        default="data/synthetic_patients.json",
        help="Path to synthetic patient JSON file"
    )
    parser.add_argument(
        "--db",
        default="database/clinical_data.db",
        help="Output SQLite database path"
    )
    args = parser.parse_args()

    data_path = Path(args.data)
    db_path = Path(args.db)

    if not data_path.exists():
        print(f"ERROR: Data file not found: {data_path}")
        return 1

    db_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Loading data from: {data_path}")
    with open(data_path, "r") as f:
        patients = json.load(f)

    print(f"Loaded {len(patients)} patients")

    conn = sqlite3.connect(str(db_path))
    print(f"Connected to database: {db_path}")

    print("\nCreating tables...")
    create_tables(conn)

    print("\nLoading data...")
    patient_count = load_patients(conn, patients)
    print(f"  - {patient_count} patients")

    diagnosis_count = load_diagnoses(conn, patients)
    print(f"  - {diagnosis_count} diagnoses")

    lab_count = load_labs(conn, patients)
    print(f"  - {lab_count} lab results")

    med_count = load_medications(conn, patients)
    print(f"  - {med_count} medications")

    note_count = load_notes(conn, patients)
    print(f"  - {note_count} clinical notes")

    print("\nVerifying data...")
    stats = verify_data(conn)
    print(f"  - Patients: {stats['patients']}")
    print(f"  - Diagnoses: {stats['diagnoses']}")
    print(f"  - Lab results: {stats['labs']}")
    print(f"  - Medications: {stats['medications']}")
    print(f"  - Clinical notes: {stats['notes']}")
    print(f"  - Readmitted: {stats['readmitted']}")

    print("\n--- Test Query: Heart Failure Patients ---")
    results = run_test_query(conn)
    print(f"Found {len(results)} patients with CHF (I50.9):")
    for row in results:
        print(f"  - Patient {row[0][:8]}...: {row[2]} {row[1]}y/o, {row[4]}, readmitted={row[5]}")

    conn.close()
    print(f"\nDatabase saved to: {db_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
