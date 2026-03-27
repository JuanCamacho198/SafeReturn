#!/usr/bin/env python3
import subprocess
import json
import sys

# Get embedding for "diabetes" query
result = subprocess.run(
    [
        "python",
        "scripts/generate_embeddings.py",
        "--db",
        "storage.sqlite",
        "--text",
        "diabetes",
    ],
    capture_output=True,
    text=True,
    cwd=".",
)
lines = result.stdout.strip().split("\n")
embedding = None
for line in reversed(lines):
    if line.strip().startswith("{"):
        data = json.loads(line)
        embedding = data["embedding"]
        break

if not embedding:
    print("Failed to get embedding")
    sys.exit(1)

# Search FAISS
result2 = subprocess.run(
    [
        "python",
        "scripts/faiss_ops.py",
        "search",
        "--query",
        json.dumps(embedding),
        "--k",
        "3",
    ],
    capture_output=True,
    text=True,
    cwd=".",
)

print('FAISS Search Results for "diabetes":')
search_results = json.loads(result2.stdout)
for r in search_results["results"]:
    print(f"  Index: {r['index']}, Distance: {r['distance']:.4f}")
    if r["metadata"]:
        print(f"    Metadata: {r['metadata']}")
