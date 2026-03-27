#!/usr/bin/env python3
"""Generate embeddings for clinical notes and build FAISS index.

This script:
1. Reads clinical notes from the database
2. Generates embeddings using sentence-transformers (all-MiniLM-L6-v2)
3. Saves embeddings to the Embeddings table as BLOBs
4. Builds and saves a FAISS index for similarity search
"""

import argparse
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

import numpy as np
import sqlite3

try:
    import faiss

    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer

    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False


CHUNK_SIZE = 500
OVERLAP = 50
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
FAISS_INDEX_DIR = Path("storage/faiss")


def chunk_text(
    text: str, chunk_size: int = CHUNK_SIZE, overlap: int = OVERLAP
) -> list[str]:
    """Split text into overlapping chunks."""
    if not text or not text.strip():
        return []

    text = text.strip()
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap

    return chunks


def get_embeddings_model():
    """Load and return the sentence transformer model."""
    if not SENTENCE_TRANSFORMERS_AVAILABLE:
        raise ImportError(
            "sentence-transformers is not installed. Run: pip install sentence-transformers"
        )
    return SentenceTransformer(EMBEDDING_MODEL)


def generate_embeddings(texts: list[str], model) -> np.ndarray:
    """Generate embeddings for a list of texts."""
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
    return embeddings


def create_faiss_index(embeddings: np.ndarray, index_path: Path) -> None:
    """Create and save a FAISS index from embeddings."""
    if not FAISS_AVAILABLE:
        raise ImportError("faiss-cpu is not installed. Run: pip install faiss-cpu")

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    FAISS_INDEX_DIR.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(index_path))
    print(f"FAISS index saved to {index_path}")


def get_connection(db_path: str) -> sqlite3.Connection:
    """Create and return a database connection."""
    if not os.path.exists(db_path):
        raise FileNotFoundError(f"Database not found: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_clinical_notes(
    conn: sqlite3.Connection, patient_id: str | None = None
) -> list[dict]:
    """Fetch clinical notes from the Encounters table."""
    cursor = conn.cursor()

    if patient_id:
        cursor.execute(
            """
            SELECT id, patient_id, notes, admission_date 
            FROM Encounters 
            WHERE patient_id = ? AND notes IS NOT NULL AND notes != ''
            """,
            (patient_id,),
        )
    else:
        cursor.execute(
            """
            SELECT id, patient_id, notes, admission_date 
            FROM Encounters 
            WHERE notes IS NOT NULL AND notes != ''
            """
        )

    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_existing_embedding_ids(
    conn: sqlite3.Connection, encounter_ids: list[str]
) -> set:
    """Get IDs of encounters that already have embeddings."""
    if not encounter_ids:
        return set()

    placeholders = ",".join(["?"] * len(encounter_ids))
    cursor = conn.cursor()
    cursor.execute(
        f"SELECT DISTINCT encounter_id FROM Embeddings WHERE encounter_id IN ({placeholders})",
        encounter_ids,
    )
    return {row[0] for row in cursor.fetchall()}


def save_embeddings_to_db(
    conn: sqlite3.Connection,
    encounter_id: str,
    chunks: list[str],
    embeddings: np.ndarray,
) -> int:
    """Save embeddings to the Embeddings table."""
    cursor = conn.cursor()
    inserted = 0

    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        embedding_id = str(uuid.uuid4())
        embedding_bytes = embedding.tobytes()

        cursor.execute(
            """
            INSERT OR REPLACE INTO Embeddings (id, encounter_id, chunk_index, text_chunk, embedding_vector, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                embedding_id,
                encounter_id,
                i,
                chunk,
                embedding_bytes,
                datetime.now().isoformat(),
            ),
        )
        inserted += 1

    conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(
        description="Generate embeddings for clinical notes and build FAISS index"
    )
    parser.add_argument(
        "--db",
        type=str,
        default="storage.sqlite",
        help="Path to SQLite database (default: storage.sqlite)",
    )
    parser.add_argument(
        "--patient-id",
        type=str,
        default=None,
        help="Optional patient ID to filter notes (default: all patients)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=32,
        help="Batch size for embedding generation (default: 32)",
    )
    parser.add_argument(
        "--rebuild-index",
        action="store_true",
        help="Rebuild FAISS index from existing embeddings in database",
    )

    args = parser.parse_args()

    progress = {
        "status": "starting",
        "timestamp": datetime.now().isoformat(),
        "db_path": args.db,
        "patient_id": args.patient_id,
        "model": EMBEDDING_MODEL,
        "chunks_processed": 0,
        "embeddings_saved": 0,
        "faiss_index_created": False,
        "errors": [],
    }

    try:
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            progress["errors"].append("sentence-transformers not available")
            progress["status"] = "error"
            print(json.dumps(progress))
            sys.exit(1)

        print(f"Loading embedding model: {EMBEDDING_MODEL}")
        model = get_embeddings_model()

        conn = get_connection(args.db)

        if args.rebuild_index:
            print("Rebuilding FAISS index from existing embeddings...")
            cursor = conn.cursor()
            cursor.execute(
                "SELECT embedding_vector FROM Embeddings WHERE embedding_vector IS NOT NULL"
            )
            rows = cursor.fetchall()

            if rows:
                embeddings = np.frombuffer(rows[0][0], dtype=np.float32)
                dimension = len(embeddings)
                embeddings = np.array(
                    [np.frombuffer(row[0], dtype=np.float32) for row in rows]
                )

                index_path = FAISS_INDEX_DIR / "clinical_notes.index"
                create_faiss_index(embeddings, index_path)
                progress["faiss_index_created"] = True
                progress["embeddings_saved"] = len(rows)

            conn.close()
            progress["status"] = "complete"
            print(json.dumps(progress, indent=2))
            return

        print(f"Fetching clinical notes from database...")
        notes = fetch_clinical_notes(conn, args.patient_id)
        progress["total_notes"] = len(notes)

        if not notes:
            print("No clinical notes found to process.")
            progress["status"] = "complete"
            progress["message"] = "No notes to process"
            print(json.dumps(progress, indent=2))
            conn.close()
            return

        existing_ids = get_existing_embedding_ids(conn, [n["id"] for n in notes])

        all_chunks = []
        chunk_metadata = []

        for note in notes:
            if note["id"] in existing_ids:
                continue

            chunks = chunk_text(note["notes"])
            for i, chunk in enumerate(chunks):
                all_chunks.append(chunk)
                chunk_metadata.append(
                    {
                        "encounter_id": note["id"],
                        "chunk_index": i,
                        "patient_id": note["patient_id"],
                    }
                )

        progress["total_chunks"] = len(all_chunks)

        if not all_chunks:
            print("No new chunks to embed.")
            progress["status"] = "complete"
            progress["message"] = "All notes already embedded"
            print(json.dumps(progress, indent=2))
            conn.close()
            return

        print(f"Generating embeddings for {len(all_chunks)} chunks...")
        embeddings = generate_embeddings(all_chunks, model)

        print(f"Saving embeddings to database...")
        encounter_chunks = {}
        for meta, embedding in zip(chunk_metadata, embeddings):
            enc_id = meta["encounter_id"]
            if enc_id not in encounter_chunks:
                encounter_chunks[enc_id] = {"chunks": [], "embeddings": []}
            encounter_chunks[enc_id]["chunks"].append(meta.get("text_chunk", ""))
            encounter_chunks[enc_id]["embeddings"].append(embedding)

        for enc_id, data in encounter_chunks.items():
            saved = save_embeddings_to_db(
                conn, enc_id, data["chunks"], data["embeddings"]
            )
            progress["embeddings_saved"] += saved

        progress["chunks_processed"] = len(all_chunks)

        print("Building FAISS index...")
        all_embeddings_cursor = conn.cursor()
        all_embeddings_cursor.execute(
            "SELECT embedding_vector FROM Embeddings WHERE embedding_vector IS NOT NULL"
        )
        embedding_rows = all_embeddings_cursor.fetchall()

        if embedding_rows:
            embeddings_matrix = np.array(
                [np.frombuffer(row[0], dtype=np.float32) for row in embedding_rows]
            )

            index_path = FAISS_INDEX_DIR / "clinical_notes.index"
            create_faiss_index(embeddings_matrix, index_path)
            progress["faiss_index_created"] = True
            progress["faiss_index_path"] = str(index_path)
            progress["total_embeddings_in_index"] = len(embedding_rows)

        conn.close()

        progress["status"] = "complete"
        print(json.dumps(progress, indent=2))

    except Exception as e:
        progress["status"] = "error"
        progress["errors"].append(str(e))
        print(json.dumps(progress, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
