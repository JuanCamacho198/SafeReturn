# RAG Specification

## Purpose

Defines the Retrieval-Augmented Generation pipeline for clinical note analysis. The RAG system retrieves relevant clinical note fragments from a FAISS vector store and augments LLM prompts for risk score generation. Handles embedding generation, vector indexing, retrieval, and fragment management.

## Requirements

### Requirement: RAG-001: Embedding Generation

The system MUST generate embeddings for clinical note text using sentence-transformers. Embeddings MUST be generated for each clinical note upon ingestion. The embedding model SHALL be loaded once and reused for all subsequent embeddings. Generated embeddings MUST be 384-dimensional (all-MiniLM-L6-v2 model).

#### Scenario: Embedding generated for new clinical note

- GIVEN a clinical note with note_text "Patient presents with chest pain and shortness of breath"
- WHEN the note is ingested via the patients endpoint
- THEN the system SHALL generate a 384-dimensional embedding vector
- AND the embedding SHALL be stored in the FAISS index
- AND the embedding metadata SHALL include note_id and patient_id

#### Scenario: Embedding generation reuses loaded model

- GIVEN the embedding model is already loaded in memory
- WHEN 10 new clinical notes are ingested sequentially
- THEN the model SHALL NOT be reloaded between notes
- AND each note SHALL receive an embedding using the cached model

### Requirement: RAG-002: FAISS Vector Index Management

The system MUST maintain a FAISS index file on disk at a configurable path. The index SHALL be an IndexFlatL2 (exact nearest neighbor search). The system MUST support rebuilding the entire index from stored embeddings. The index MUST persist between application restarts.

#### Scenario: Index persists across application restart

- GIVEN the application has ingested 50 clinical notes and built the FAISS index
- WHEN the application is closed and reopened
- THEN the FAISS index SHALL be loaded from disk
- AND retrieval queries SHALL work without re-embedding all notes

#### Scenario: Rebuild index from scratch

- GIVEN an existing FAISS index with 100 embeddings
- WHEN the rebuild endpoint is called
- THEN the system SHALL recreate the index from all stored embeddings
- AND the new index SHALL contain all 100 embeddings
- AND queries SHALL return identical results to before rebuild

### Requirement: RAG-003: Semantic Retrieval

The system SHALL retrieve the top-K most relevant clinical note fragments for a given query. K SHALL be configurable with a default of 5. Retrieval MUST use cosine similarity on the FAISS index. Results MUST include the note text, note_id, patient_id, and similarity score.

#### Scenario: Retrieve relevant fragments for patient query

- GIVEN a patient with 10 clinical notes including "history of heart failure" and "elevated BNP"
- WHEN a retrieval query is made for "cardiac risk factors"
- THEN the system SHALL return up to 5 fragments ranked by relevance
- AND fragments containing cardiac-related terms SHALL rank higher
- AND each result SHALL include similarity_score between 0 and 1

#### Scenario: Retrieval with no relevant notes

- GIVEN a patient has clinical notes but none contain terms relevant to the query
- WHEN retrieval is performed for an unrelated query
- THEN the system SHALL return up to 5 fragments with lowest similarity scores
- AND results SHALL be flagged with low_relevance indicator if scores are below threshold (0.3)

### Requirement: RAG-004: Retrieval with Patient Context Filter

The system SHALL restrict retrieval to clinical notes belonging to a specific patient_id. Retrieval queries that do not specify patient_id SHALL return fragments from all patients.

#### Scenario: Retrieve fragments for specific patient only

- GIVEN patient A has 5 notes about cardiac issues
- AND patient B has 3 notes about respiratory issues
- WHEN retrieval is performed with patient_id=A and query "chest symptoms"
- THEN all returned fragments SHALL belong to patient A
- AND patient B's notes SHALL NOT be included

#### Scenario: Retrieve fragments across all patients

- GIVEN multiple patients with various clinical notes
- WHEN retrieval is performed without patient_id filter
- THEN fragments from any patient SHALL be eligible for return
- AND results SHALL include patient_id in each fragment record

### Requirement: RAG-005: Fragment Display Formatting

Retrieved fragments MUST be formatted for display with: the note_text (truncated to 500 characters), note_type, note_date, and similarity_score rounded to 3 decimal places. Fragments SHOULD highlight terms from the query if they appear in the note text.

#### Scenario: Fragment display with term highlighting

- GIVEN a retrieved fragment containing "patient has heart failure history"
- AND the query was "heart failure"
- WHEN the fragment is prepared for display
- THEN the term "heart failure" SHALL be highlighted in the displayed text
- AND the display SHALL show note_type as "Progress Note" and formatted date

#### Scenario: Long fragment truncation

- GIVEN a retrieved fragment with note_text of 2000 characters
- WHEN the fragment is prepared for display
- THEN only the first 500 characters SHALL be shown
- AND the display SHALL indicate truncation with "..." suffix
- AND the full text SHALL be available via a "show more" expansion

### Requirement: RAG-006: Incremental Indexing

The system SHALL support adding new embeddings to an existing FAISS index without full rebuild. When a new clinical note is ingested, its embedding MUST be added to the existing index file incrementally.

#### Scenario: Add new embedding incrementally

- GIVEN an existing FAISS index with 100 embeddings
- WHEN a new clinical note is ingested
- THEN the new embedding SHALL be appended to the existing index
- AND the index SHALL now contain 101 embeddings
- AND existing 100 embeddings SHALL remain at their original positions

#### Scenario: Index file corruption recovery

- GIVEN the FAISS index file is corrupted or unreadable
- WHEN any retrieval operation is attempted
- THEN the system SHALL attempt automatic rebuild from stored embeddings
- AND if rebuild succeeds, retrieval SHALL proceed normally
- AND if rebuild fails, the system SHALL return an error with recovery instructions

### Requirement: RAG-007: Retrieval Performance

The system SHOULD complete retrieval queries in under 500ms for indexes containing up to 10,000 clinical notes. The system SHALL return a loading indicator during retrieval if it exceeds 200ms.

#### Scenario: Fast retrieval on small index

- GIVEN a FAISS index with 500 clinical notes
- WHEN a retrieval query is executed
- THEN the result SHALL be returned in under 200ms
- AND no loading indicator SHALL be shown to the user

#### Scenario: Retrieval on large index shows loading

- GIVEN a FAISS index with 8,000 clinical notes
- WHEN a retrieval query is executed
- THEN the system SHALL show a loading indicator
- AND the query SHALL complete in under 500ms
- AND the loading indicator SHALL be removed upon completion

### Requirement: RAG-008: Query Expansion

The system SHOULD expand user queries with synonyms from a clinical vocabulary before retrieval. Common cardiac terms (heart failure, CHF, cardiac) SHOULD be treated as equivalent. Query expansion SHALL increase recall without significantly degrading precision.

#### Scenario: Query expansion with cardiac synonyms

- GIVEN the query "CHF readmission risk"
- WHEN query expansion is applied
- THEN the expanded query SHALL include "heart failure", "cardiac", "congestive heart failure"
- AND retrieval SHALL return notes mentioning any of these terms

#### Scenario: Query expansion does not dilute specificity

- GIVEN the query "diabetes mellitus type 2"
- WHEN query expansion is applied
- THEN the system SHALL expand "diabetes" but preserve "type 2" specificity
- AND notes about type 1 diabetes SHALL NOT rank as highly as type 2

### Requirement: RAG-009: Retrieval Metadata Tracking

Each retrieval operation MUST log metadata including: query text, patient_id (if specified), number of results returned, average similarity score, and timestamp. Logs SHALL be stored for analytics and debugging.

#### Scenario: Retrieval log entry created

- GIVEN a retrieval query is executed
- WHEN the query completes successfully
- THEN the system SHALL write a log entry to the retrieval_logs table
- AND the log SHALL include query_hash, patient_id, result_count, avg_score, and timestamp
- AND logs SHALL be queryable via admin endpoint
