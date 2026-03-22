# Proposal: rag-readmission

## Intent

Build a desktop healthcare RAG application that predicts 30-day hospital readmission probability using local LLM and clinical notes. Hospitals need to identify high-risk patients to improve care coordination and reduce costs. Current solutions require external APIs, creating privacy concerns. This application provides a local-first solution using RAG architecture without external data transmission.

## Scope

### In Scope
1. **Patient Dashboard** - View patient list with readmission risk scores, search/filter
2. **Risk Score Display** - Show 30-day readmission probability with visual indicators (low/medium/high)
3. **RAG Retrieval** - Display retrieved clinical note fragments that informed the risk assessment
4. **Data Export** - CSV and JSON export of patient data, risk scores, and retrieval results
5. **Authentication** - Local login system with access logging
6. **Offline Operation** - Full functionality without internet connectivity
7. **SQLite + FAISS Storage** - Local database for structured data, FAISS index for vector search

### Out of Scope
- Real patient data integration (MVP uses synthetic/desidentified data only)
- External API integrations
- Cloud deployment or SaaS features
- Mobile platform support
- HL7/FHIR interoperability

## Approach

**Phase 1 (Weeks 1-4): Core Infrastructure**
- Set up Tauri + Svelte + Vite project structure
- Implement Bun backend with TypeScript
- Configure SQLite database schema
- Build basic patient CRUD operations
- Implement local authentication system

**Phase 2 (Weeks 5-8): ML Pipeline**
- Integrate sentence-transformers for embeddings
- Set up FAISS vector store on disk
- Implement llama.cpp/GGML integration for local inference
- Build RAG query pipeline (retrieve → augment → generate)
- Create risk score calculation engine

**Phase 3 (Weeks 9-12): UI/UX & Export**
- Complete patient dashboard with visualizations
- Implement risk score display with interpretation
- Build retrieval fragment viewer
- Add CSV/JSON export functionality
- Basic encryption for local data files
- Access logging system

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/` | New | Tauri Rust backend for desktop packaging |
| `src/` | New | Svelte frontend components |
| `backend/` | New | Bun TypeScript server for API layer |
| `ml/` | New | Embedding generation, FAISS, LLM inference |
| `storage/` | New | SQLite schema, FAISS index files |
| `auth/` | New | Local login, encryption, access logs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Local LLM performance insufficient for clinical accuracy | Medium | Use quantized models optimized for CPU; fallback to simpler scoring based on retrieval similarity |
| FAISS index build time on large datasets | Low | Implement incremental indexing; show progress indicators |
| Tauri + Bun integration complexity | Medium | Use Tauri sidecar pattern for Bun process; test early |
| Embedding model size (>500MB) | Medium | Bundle with installer; cache on first run |
| Data encryption complexity | Low | Use AES-256 for sensitive fields; don't encrypt entire DB |

## Rollback Plan

1. **Before Phase 2**: Tag the working Phase 1 build in git
2. **If ML pipeline fails**: Maintain Phase 1 as "search only" mode without risk scores
3. **If LLM integration fails**: Use similarity-based scoring from FAISS directly as fallback
4. **If Bun runtime issues**: Package Node.js fallback in Tauri build
5. **Full rollback**: Restore last working commit; all code in git

## Dependencies

- sentence-transformers Python package (via Bun process)
- llama.cpp bindings for Node.js/Bun
- FAISS Python package
- better-sqlite3 for SQLite access
- crypto-js for basic encryption

## Success Criteria

- [ ] Application launches as standalone .exe/.app without errors
- [ ] User can create local account and login
- [ ] Patient list displays with search functionality
- [ ] Risk score displayed for each patient based on clinical notes
- [ ] Retrieved fragments visible for each prediction
- [ ] CSV export produces valid file with patient data
- [ ] JSON export produces valid file with full assessment data
- [ ] Application works fully offline (no network calls)
- [ ] Access logs record login/logout events
