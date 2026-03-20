# SafeReturn 🏥

SafeReturn is a local-first, desktop healthcare application that utilizes a Retrieval-Augmented Generation (RAG) architecture to predict the 30-day hospital readmission probability based on unstructured clinical notes.

Built for privacy and compliance, all data and models run **100% offline** on the local machine without relying on external cloud APIs.

## Tech Stack
- **Frontend**: Tauri (Rust) + Svelte + Vite
- **Backend / Sidecar**: Bun (TypeScript)
- **Machine Learning**: 
  - Embeddings: `sentence-transformers`
  - Vector Store: `FAISS`
  - Local LLM: `llama.cpp` (GGML/GGUF models)
- **Database**: SQLite

## Features
- **Local RAG Pipeline**: Ingests patient notes, vectorizes them, and retrieves context for accurate LLM predictions.
- **Risk Dashboard**: Intuitive Svelte UI to view patient risk scores and analytical drill-downs.
- **Explainability**: Displays the exact clinical note fragments used by the LLM to generate the prediction.
- **Offline First**: Absolutely zero data leaves the host machine.
- **Data Export**: Export results and reports to CSV or JSON for compliance and further analysis.

## Development

### Prerequisites
- [Node.js](https://nodejs.org/) or [Bun](https://bun.sh/)
- [Rust](https://rustup.rs/) (for Tauri)
- Python 3.10+ (for ML scripts/FAISS)

### Setup
1. Clone the repository
2. Install frontend dependencies: `cd frontend && npm install`
3. Install backend dependencies: `cd backend && bun install`
4. Run in dev mode: `npm run tauri dev`

## Architecture
See the SDD documentation in `openspec/` for full proposals, design documents, and architecture decisions.

## Production Build & Packaging

To package SafeReturn into a standalone desktop executable (.exe, .app, .deb):

1. **Build the Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Bundle the Backend Sidecar (Bun)**:
   ```bash
   cd backend
   bun build ./index.ts --compile --outfile ../frontend/src-tauri/bin/backend-sidecar
   ```

3. **Package with Tauri**:
   ```bash
   cd frontend
   npm run tauri build
   ```

This will generate the final installer in `frontend/src-tauri/target/release/bundle/`. Ensure you have the corresponding local ML models placed in the correct resource directory as specified in your `tauri.conf.json`.
