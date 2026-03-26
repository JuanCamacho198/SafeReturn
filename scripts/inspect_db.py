import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "database" / "clinical_data.db"

if not DB_PATH.exists():
    print(f"ERROR: No se encontró la base de datos en: {DB_PATH}")
    raise SystemExit(1)

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()

tables = ["patients", "diagnoses", "labs", "medications", "clinical_notes"]
for t in tables:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        n = cur.fetchone()[0]
        print(f"{t}: {n}")
    except Exception as e:
        print(f"{t}: error ({e})")

# Show a sample patient id
try:
    cur.execute("SELECT patient_id, age, gender FROM patients LIMIT 5")
    rows = cur.fetchall()
    if rows:
        print("\nMuestras de pacientes:")
        for r in rows:
            print(r)
    else:
        print("\nNo hay filas en la tabla patients.")
except Exception as e:
    print(f"Error al leer pacientes: {e}")

conn.close()