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

## 🔑 API Key Setup (Optional)

SafeReturn supports both local LLM (llama.cpp) and remote LLM via API.

### Groq (Recommended - Free & Fast)

1. Get a free API key at [console.groq.com/keys](https://console.groq.com/keys)
2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your key:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROQ_API_KEY` | Your Groq API key | Required for remote LLM |
| `GROQ_MODEL` | Model to use | `llama-3.3-70b-versatile` |
| `EMBEDDING_MODEL` | Sentence transformer model | `all-MiniLM-L6-v2` |

## Quick Start with Groq

```bash
cd backend
cp ../.env.example ../.env
# Edit .env with your Groq API key
bun run index.ts
```
