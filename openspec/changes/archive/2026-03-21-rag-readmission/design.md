# Design: RAG Readmission Healthcare Application

## Technical Approach

This greenfield project delivers a local-first desktop healthcare RAG application. The UI is built using Tauri, Svelte, and Vite for a native desktop feel. The backend logic runs in a Bun (TypeScript) sidecar spawned by Tauri, communicating via JSON-RPC over `stdio`. The Bun sidecar orchestrates local ML processes (embedding via sentence-transformers, vector storage with FAISS, and inference with llama.cpp/GGML). Application data (patients, clinical notes, logs, users) is stored locally using SQLite.

## Architecture Decisions

### Decision: Tauri Sidecar Pattern

**Choice**: Tauri spawns a Bun process as a sidecar (`Command::new_sidecar()`) with bidirectional IPC over stdin/stdout.
**Alternatives considered**: Embed Node/Bun via WebView, Rust-only ML backend, local HTTP API server.
**Rationale**: Tauri sidecars natively manage process lifecycles, ensuring the Bun process starts and stops with the main application. Bun offers a fast TypeScript runtime with good ML package compatibility, bypassing the need for a full Node.js installation on the client. Communication via `stdio` avoids complex port management and CORS configurations inherent to HTTP APIs.

### Decision: ML Subprocess Communication

**Choice**: The Bun sidecar communicates with Python-based ML processes (like sentence-transformers) via standard I/O (stdio) streams with JSON payloads, or uses FFI bindings where possible.
**Alternatives considered**: HTTP APIs, WebSockets, gRPC, shared memory.
**Rationale**: Using `stdio` is a robust, cross-platform approach for inter-process communication (IPC) that avoids local network interface bindings (which can trigger firewall warnings). It easily maps to asynchronous TypeScript streams.

### Decision: FAISS Index Strategy

**Choice**: Use `IndexFlatIP` (flat inner product on normalized embeddings) stored on disk alongside metadata JSON files and synchronized with the main SQLite DB.
**Alternatives considered**: In-memory FAISS rebuilding on startup, ChromaDB, Qdrant.
**Rationale**: A flat index is simple, deterministic, and sufficiently performant for the expected scale of clinical note chunks (<100k). Writing the index to disk prevents long startup times, and keeping metadata separate avoids bloating the FAISS index structure.

### Decision: LLM Integration via llama.cpp GGML Bindings

**Choice**: Use `llama.cpp` through Bun FFI bindings to run quantized GGML/GGUF models (e.g., Q4_K_M) on local CPU hardware.
**Alternatives considered**: Transformers.js in browser, Python subprocess wrappers, remote APIs (OpenAI/Anthropic).
**Rationale**: Fully offline local execution guarantees patient data privacy, strictly adhering to healthcare compliance requirements. `llama.cpp` using GGUF format is highly optimized for consumer hardware (CPU and optionally GPU), making it perfect for a desktop client.

### Decision: SQLite Schema

**Choice**: Use SQLite for structured relational data.
**Alternatives considered**: JSON file stores, Document DBs (MongoDB/CouchDB local equivalents).
**Rationale**: Healthcare records naturally fit relational models (Patients -> Notes, Users -> Access Logs). SQLite is lightweight, file-based, and highly reliable.

## Data Flow

    [Svelte UI]
         │ (Tauri invoke / IPC)
         ▼
    [Tauri Rust Core] ──spawn/manage── [Bun Sidecar Process]
                                           │
          ┌────────────────────────────────┼─────────────────────────────────┐
          │                                │                                 │
    (Better-SQLite3)                (stdio JSON stream)               (FFI / N-API)
          ▼                                ▼                                 ▼
     [SQLite DB]                  [Python: Embeddings]              [llama.cpp Process]
    (Patients, Logs)             (sentence-transformers)             (GGUF local model)
                                           │
                                           ▼
                                    [FAISS Index]

**Full RAG Query Flow:**
1. Svelte UI dispatches a search intent.
2. Tauri Rust Core proxies the command to the Bun sidecar via stdio.
3. Bun requests an embedding for the query from the Python embedding process.
4. The generated embedding is used to search the FAISS Index.
5. Bun fetches corresponding text chunks via the mapped SQLite DB IDs.
6. The context and prompt are passed to the `llama.cpp` LLM process.
7. The readmission risk prediction and reasoning stream back through Bun, then Tauri, to Svelte.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/` | Create | Rust core code, commands, and sidecar management configurations. |
| `src/` | Create | Svelte frontend application code (components, routes, stores). |
| `backend/src/index.ts` | Create | Bun sidecar entrypoint and IPC router. |
| `backend/src/ml/` | Create | Modules integrating `sentence-transformers`, FAISS wrapper, and `llama.cpp`. |
| `backend/src/db/` | Create | SQLite schema setup, migrations, and model repositories. |
| `storage/db.sqlite` | Create | SQLite database file (created on runtime if absent). |
| `storage/faiss/` | Create | FAISS `.index` files and `.meta.json`. |

## Interfaces / Contracts

**SQLite Schema Draft:**
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT
);

CREATE TABLE patients (
    id TEXT PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    dob DATE,
    mrn TEXT UNIQUE
);

CREATE TABLE clinical_notes (
    id TEXT PRIMARY KEY,
    patient_id TEXT,
    content TEXT,
    timestamp DATETIME,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);

CREATE TABLE access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT,
    target_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**Bun IPC Payload Example:**
```typescript
interface RAGRequest {
  patient_id: string;
  query: string;
  action: 'predict_readmission';
}

interface RAGResponse {
  risk_score: number; // 0.0 - 1.0
  explanation: string;
  referenced_notes: string[]; // List of note IDs used in RAG
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | DB models, UI components, IPC parsers | `bun test` for backend logic, Vitest for Svelte components. |
| Integration | RAG Pipeline (Embedding -> FAISS -> LLM) | Automated Bun scripts validating full ML data flow without UI. |
| E2E | Desktop UI interactions to ML predictions | Tauri WebDriver / Playwright targeting the compiled desktop app. |

## Migration / Rollout

No migration required. This is a greenfield desktop application.

## Open Questions

- [ ] Which specific quant size and GGUF model will serve as the default standard for inference?
- [ ] Will the Python ML dependencies (sentence-transformers) be bundled via PyInstaller/cx_Freeze or expected on the host environment?