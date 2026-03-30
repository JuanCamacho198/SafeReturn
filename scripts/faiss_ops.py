#!/usr/bin/env python3
"""FAISS index operations for similarity search.

This script provides a CLI for:
- Loading an existing FAISS index
- Adding new vectors to the index
- Searching for similar vectors
"""

import argparse
import json
import sys
import os
from pathlib import Path

import numpy as np

try:
    import faiss

    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False


# Get project root (parent of scripts/)
PROJECT_ROOT = Path(__file__).parent.parent.resolve()
FAISS_INDEX_DIR = PROJECT_ROOT / "storage" / "faiss"
INDEX_FILE = FAISS_INDEX_DIR / "clinical_notes.index"
METADATA_FILE = FAISS_INDEX_DIR / "metadata.json"

print(f"FAISS_INDEX_DIR: {FAISS_INDEX_DIR}")
print(f"INDEX_FILE: {INDEX_FILE}")


def load_index(index_path: Path = INDEX_FILE):
    """Load an existing FAISS index."""
    if not index_path.exists():
        raise FileNotFoundError(f"Index not found: {index_path}")
    return faiss.read_index(str(index_path))


def save_index(index, index_path: Path = INDEX_FILE):
    """Save FAISS index to disk."""
    FAISS_INDEX_DIR.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(index_path))


def load_metadata():
    """Load metadata from JSON file."""
    if METADATA_FILE.exists():
        with open(METADATA_FILE) as f:
            return json.load(f)
    return {"metadata": []}


def save_metadata(metadata):
    """Save metadata to JSON file."""
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f)


def add_vectors(embeddings: list, metadata: list):
    """Add vectors to the FAISS index."""
    if not FAISS_AVAILABLE:
        raise ImportError("faiss-cpu not installed")

    embeddings_array = np.array(embeddings, dtype=np.float32)

    if embeddings_array.ndim == 1:
        embeddings_array = embeddings_array.reshape(1, -1)

    try:
        index = load_index()
    except FileNotFoundError:
        dimension = embeddings_array.shape[1]
        index = faiss.IndexFlatL2(dimension)

    index.add(embeddings_array)
    save_index(index)

    current_metadata = load_metadata()
    current_metadata["metadata"].extend(metadata)

    return {
        "status": "success",
        "vectors_added": len(embeddings),
        "total_vectors": index.ntotal,
    }


def search_vectors(query_embedding: list, k: int = 5):
    """Search for similar vectors in the FAISS index."""
    if not FAISS_AVAILABLE:
        raise ImportError("faiss-cpu not installed")

    index = load_index()
    query_array = np.array([query_embedding], dtype=np.float32)

    distances, indices = index.search(query_array, min(k, index.ntotal))

    results = []
    metadata = load_metadata()
    meta_list = metadata.get("metadata", [])

    for dist, idx in zip(distances[0], indices[0]):
        if idx < len(meta_list):
            results.append(
                {"index": int(idx), "distance": float(dist), "metadata": meta_list[idx]}
            )
        else:
            results.append(
                {"index": int(idx), "distance": float(dist), "metadata": None}
            )

    return {"results": results, "query_vector": query_embedding[:5], "k": k}


def get_index_info():
    """Get information about the FAISS index."""
    try:
        index = load_index()
        return {
            "dimension": index.d,
            "ntotal": index.ntotal,
            "index_type": type(index).__name__,
            "index_path": str(INDEX_FILE),
        }
    except FileNotFoundError:
        return {"exists": False, "index_path": str(INDEX_FILE)}


def main():
    if not FAISS_AVAILABLE:
        print(json.dumps({"error": "faiss-cpu not installed"}))
        sys.exit(1)

    parser = argparse.ArgumentParser(description="FAISS index operations")
    subparsers = parser.add_subparsers(dest="command", required=True)

    add_parser = subparsers.add_parser("add", help="Add vectors to index")
    add_parser.add_argument(
        "--embeddings", type=str, required=True, help="JSON array of embedding vectors"
    )
    add_parser.add_argument(
        "--metadata", type=str, default="[]", help="JSON array of metadata objects"
    )

    search_parser = subparsers.add_parser("search", help="Search similar vectors")
    search_parser.add_argument(
        "--query", type=str, required=True, help="JSON array of query vector"
    )
    search_parser.add_argument(
        "--k", type=int, default=5, help="Number of results to return"
    )

    subparsers.add_parser("info", help="Get index information")

    args = parser.parse_args()

    try:
        if args.command == "add":
            embeddings = json.loads(args.embeddings)
            metadata = json.loads(args.metadata)
            result = add_vectors(embeddings, metadata)
            print(json.dumps(result))

        elif args.command == "search":
            query = json.loads(args.query)
            result = search_vectors(query, args.k)
            print(json.dumps(result))

        elif args.command == "info":
            result = get_index_info()
            print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
