# Tasks: RAG Readmission Application

## Phase 1: Core Infrastructure (Project setup, Tauri/Svelte/Bun boilerplate, DB schema, Auth)

- [x] 1.1 Scaffold the project structure with Tauri CLI using SvelteKit template in `frontend/`.
- [x] 1.2 Initialize Bun project in `backend/` for the sidecar and install dependencies (sqlite, faiss-node).
- [x] 1.3 Configure `src-tauri/tauri.conf.json` to register the Bun sidecar executable and configure window dimensions.
- [x] 1.4 Create SQLite database schema definition in `backend/db/schema.sql` including `Patients`, `Encounters`, `Embeddings`, and `AuditLogs` tables.
- [x] 1.5 Implement database connection and initialization logic in `backend/db/index.ts` to execute schema on startup.
- [x] 1.6 Implement basic sidecar health check and IPC listener setup in `backend/index.ts`.
- [x] 1.7 Create user authentication service in `backend/auth/service.ts` with basic role-based access control (RBAC) and JWT generation.

## Phase 2: ML Pipeline & Backend (Embeddings script, FAISS index, llama.cpp bindings, RAG orchestration)

- [x] 2.1 Create embeddings generation script `backend/ml/embedder.ts` using a local embedding model.
- [x] 2.2 Implement FAISS index management in `backend/ml/vector_store.ts` for storing and retrieving patient embeddings.
- [x] 2.3 Create `backend/ml/llm.ts` to interface with the local `llama.cpp` instance (e.g., node-llama-cpp) for inference.
- [x] 2.4 Implement RAG orchestrator in `backend/rag/orchestrator.ts` that takes a query, searches FAISS, and formats the prompt for the LLM.
- [x] 2.5 Expose IPC commands in `backend/index.ts` for triggering risk assessments and fetching patient data.
- [x] 2.6 Implement readmission risk calculation logic in `backend/services/risk_calculator.ts` utilizing the RAG orchestrator.

## Phase 3: UI & Integration (Svelte dashboard, IPC wiring, risk display, retrieval view)

- [ ] 3.1 Create shared IPC types/interfaces in `frontend/src/lib/types/ipc.ts`.
- [ ] 3.2 Implement IPC client wrapper in `frontend/src/lib/api/client.ts` using `@tauri-apps/api/invoke`.
- [ ] 3.3 Build the main layout and navigation in `frontend/src/routes/+layout.svelte`.
- [ ] 3.4 Create the patient list/dashboard view in `frontend/src/routes/dashboard/+page.svelte` fetching data via IPC.
- [ ] 3.5 Implement the detailed patient view in `frontend/src/routes/patients/[id]/+page.svelte` showing demographics and history.
- [ ] 3.6 Create the Risk Assessment component in `frontend/src/components/RiskCard.svelte` to display the RAG-generated risk score and explanation.
- [ ] 3.7 Build the Retrieval Evidence view in `frontend/src/components/EvidencePanel.svelte` showing the referenced encounters from FAISS.

## Phase 4: Polish & Export (CSV/JSON export, encryption, packaging setup)

- [ ] 4.1 Implement export functionality in `backend/services/export.ts` to generate CSV/JSON reports of patient risks.
- [ ] 4.2 Add export buttons and UI hooks in `frontend/src/routes/dashboard/+page.svelte` calling the export IPC commands.
- [ ] 4.3 Implement AES-256 database encryption at rest in `backend/db/encryption.ts` or configure SQLCipher.
- [ ] 4.4 Add automated tests for the RAG orchestrator in `backend/tests/rag.test.ts`.
- [ ] 4.5 Configure production build scripts for Tauri, SvelteKit, and packaging the Bun sidecar binary.
- [ ] 4.6 Document setup and build instructions in `README.md`.