import { Database } from 'bun:sqlite';
import { getEmbeddingService } from '../ml/embeddings';
import { VectorStore } from '../ml/vector_store';
import { LLMService } from '../ml/llm';
import { randomUUID } from 'crypto';

export interface RetrievalEntry {
  query_hash: string;
  patient_id: string | null;
  result_count: number;
  avg_score: number;
  timestamp: string;
}

export interface RetrievalEvidence {
  id: string;
  noteId: string;
  patientId: string;
  textChunk: string;
  noteType?: string;
  noteDate?: string;
  similarityScore: number;
}

export interface FormattedFragment {
  id: string;
  text: string;
  noteType: string;
  noteDate: string;
  similarityScore: number;
  isTruncated: boolean;
  highlighted: string;
}

const CLINICAL_SYNONYMS: Record<string, string[]> = {
  chf: ['heart failure', 'cardiac failure', 'congestive heart failure'],
  'heart failure': ['chf', 'cardiac failure', 'congestive heart failure'],
  cardiac: ['heart', 'cardiovascular', 'cardiac'],
  mi: ['myocardial infarction', 'heart attack'],
  copd: ['chronic obstructive pulmonary disease', 'lung disease'],
  dm: ['diabetes', 'diabetes mellitus'],
  diabetes: ['dm', 'diabetes mellitus'],
};

const QUERY_EXPANSION_SYNONYMS: Record<string, string[]> = {
  'cardiac risk factors': ['heart failure', 'chf', 'cardiac', 'myocardial infarction', 'mi', 'coronary'],
  'readmission risk': ['readmit', 'rehospitalize', 'return to hospital'],
  'chf': ['heart failure', 'cardiac failure', 'congestive heart failure'],
};

export class RAGOrchestrator {
  private db: Database;
  private embeddings: ReturnType<typeof getEmbeddingService>;
  private vectorStore: VectorStore;
  private llm: LLMService | null = null;
  private cache: Map<string, { result: any; timestamp: number; noteHashes: string[] }> = new Map();
  private cacheTTL: number = 3600000;

  constructor(db: Database, modelPath?: string) {
    this.db = db;
    this.embeddings = getEmbeddingService();
    this.vectorStore = new VectorStore(db);
  }

  async initialize(modelPath?: string): Promise<void> {
    await this.embeddings.encode(['init']).catch(() => {});
    await this.vectorStore.loadIndex();
    if (modelPath) {
      this.llm = new LLMService({ modelPath });
      try {
        await this.llm.initialize();
      } catch (err) {
        console.error(JSON.stringify({ type: 'rag-warning', message: `LLM init failed: ${err}. Using fallback scoring.` }));
        this.llm = null;
      }
    }
  }

  async ingestNote(patientId: string, encounterId: string, noteText: string, noteType: string = 'Progress Note', noteDate?: string): Promise<string> {
    const chunks = this.chunkText(noteText, 512);
    const meta = chunks.map((chunk, i) => ({ noteId: encounterId, patientId, textChunk: chunk, noteType, noteDate: noteDate || new Date().toISOString(), chunkIndex: i }));

    const embeddings = await this.embeddings.encodeWithMetadata({ texts: chunks, noteId: encounterId, patientId });
    const vectors = embeddings.map(e => e.vector);

    const ids = await this.vectorStore.addVectors(vectors, meta);

    for (let i = 0; i < ids.length; i++) {
      const vec = embeddings[i].vector;
      const vecBlob = Buffer.from(new Float32Array(vec).buffer);
      this.db.query(`INSERT INTO Embeddings (id, encounter_id, chunk_index, text_chunk, embedding_vector) VALUES (?, ?, ?, ?, ?)`).run(
        randomUUID(), encounterId, i, chunks[i], vecBlob
      );
    }

    this.invalidateCache(patientId);

    return ids[0];
  }

  private chunkText(text: string, maxChars: number): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const sentence of sentences) {
      if ((current + ' ' + sentence).length > maxChars && current) {
        chunks.push(current.trim());
        current = sentence;
      } else {
        current += (current ? ' ' : '') + sentence;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  private expandQuery(query: string): string {
    const expanded = new Set<string>([query.toLowerCase()]);
    for (const [key, synonyms] of Object.entries(QUERY_EXPANSION_SYNONYMS)) {
      if (query.toLowerCase().includes(key)) {
        synonyms.forEach(s => expanded.add(s));
      }
    }
    for (const [term, synonyms] of Object.entries(CLINICAL_SYNONYMS)) {
      if (query.toLowerCase().includes(term)) {
        synonyms.forEach(s => expanded.add(s));
      }
    }
    return Array.from(expanded).join(' ');
  }

  async retrieve(query: string, patientId?: string, topK: number = 5): Promise<RetrievalEvidence[]> {
    const expanded = this.expandQuery(query);
    const queryVec = await this.embeddings.encode([expanded]);
    const results = await this.vectorStore.search({ vector: queryVec[0], topK, patientId });

    this.logRetrieval(query, patientId, results.length, results.reduce((s, r) => s + r.similarityScore, 0) / (results.length || 1));

    return results;
  }

  private logRetrieval(query: string, patientId: string | null, resultCount: number, avgScore: number): void {
    try {
      this.db.query(`INSERT INTO AuditLogs (user_id, action, target_id, details) VALUES (?, ?, ?, ?)`).run(
        null, 'retrieval', patientId || 'all', JSON.stringify({ query: query.substring(0, 100), result_count: resultCount, avg_score: avgScore })
      );
    } catch { /* ignore */ }
  }

  formatFragment(evidence: RetrievalEvidence, query: string): FormattedFragment {
    let text = evidence.textChunk;
    const isTruncated = text.length > 500;
    if (isTruncated) text = text.substring(0, 500) + '...';

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
    let highlighted = text;
    for (const term of terms) {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '**$1**');
    }

    return {
      id: evidence.id,
      text,
      noteType: evidence.noteType || 'Progress Note',
      noteDate: evidence.noteDate ? new Date(evidence.noteDate).toLocaleDateString() : 'Unknown',
      similarityScore: evidence.similarityScore,
      isTruncated,
      highlighted,
    };
  }

  async assessRisk(patientId: string, query?: string): Promise<{ risk_score: number; risk_level: string; reasoning: string; is_fallback: boolean; evidence: FormattedFragment[] }> {
    const cacheKey = patientId;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return { ...cached.result, cached: true };
    }

    const q = query || 'What is the 30-day readmission risk? Consider medical history, comorbidities, prior readmissions, and social factors.';
    const evidence = await this.retrieve(q, patientId, 5);
    const fragments = evidence.map(e => this.formatFragment(e, q));

    let result: { risk_score: number; risk_level: string; reasoning: string; is_fallback: boolean };

    if (this.llm?.isReady()) {
      const prompt = this.buildPrompt(patientId, fragments);
      try {
        const raw = await this.llm.generate(prompt);
        result = this.llm.parseRiskAssessment(raw, this.computeFallbackScore(evidence));
      } catch {
        result = { risk_score: this.computeFallbackScore(evidence), risk_level: this.mapScoreToLevel(this.computeFallbackScore(evidence)), reasoning: 'Fallback scoring due to inference error', is_fallback: true };
      }
    } else {
      const score = this.computeFallbackScore(evidence);
      result = { risk_score: score, risk_level: this.mapScoreToLevel(score), reasoning: 'Fallback similarity-based scoring (LLM not available)', is_fallback: true };
    }

    const fullResult = { ...result, evidence: fragments };
    this.cache.set(cacheKey, { result: fullResult, timestamp: Date.now(), noteHashes: [] });

    this.db.query(`UPDATE Patients SET last_risk_score = ?, last_risk_assessment = ?, last_risk_at = ? WHERE id = ?`).run(
      result.risk_score, result.reasoning, new Date().toISOString(), patientId
    );

    return fullResult;
  }

  private computeFallbackScore(evidence: RetrievalEvidence[]): number {
    if (!evidence.length) return 0.5;
    const avg = evidence.reduce((s, e) => s + e.similarityScore, 0) / evidence.length;
    const score = Math.min(avg * 1.2, 1.0);
    return Math.round(score * 1000) / 1000;
  }

  private mapScoreToLevel(score: number): string {
    if (score <= 0.33) return 'low';
    if (score <= 0.66) return 'medium';
    return 'high';
  }

  private buildPrompt(patientId: string, fragments: FormattedFragment[]): string {
    const patient = this.db.query(`SELECT * FROM Patients WHERE id = ?`).get(patientId) as any;
    const encounters = this.db.query(`SELECT * FROM Encounters WHERE patient_id = ? ORDER BY admission_date DESC LIMIT 5`).all(patientId) as any[];

    let context = `Patient Information:\n`;
    if (patient) {
      context += `- MRN: ${patient.mrn || 'N/A'}\n`;
      context += `- Admission: ${encounters[0]?.admission_date || 'N/A'}\n`;
      context += `- Primary Diagnosis: ${patient.primary_diagnosis || encounters[0]?.diagnosis || 'N/A'}\n\n`;
    }

    context += `Clinical Notes (ranked by relevance):\n`;
    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      context += `[${i + 1}] (${f.noteType}, ${f.noteDate}, score: ${f.similarityScore})\n${f.text}\n\n`;
    }

    context += `Assessment Request: Estimate the 30-day hospital readmission probability. Return valid JSON with risk_score (0.0-1.0), risk_level (low/medium/high), and reasoning citing specific clinical factors.`;

    return `<|system|>${SYSTEM_PROMPT}</|system>\n<|user|>${context}</|user|>`;
  }

  invalidateCache(patientId: string): void {
    this.cache.delete(patientId);
  }

  setCacheTTL(ttlMs: number): void { this.cacheTTL = ttlMs; }
  getCacheStats(): { size: number; ttl: number } { return { size: this.cache.size, ttl: this.cacheTTL }; }

  async rebuildIndex(): Promise<void> {
    await this.vectorStore.rebuild();
  }

  getVectorStats(): { count: number; dimension: number } {
    const stats = this.vectorStore.getIndexStats();
    return { count: stats.count, dimension: stats.dimension };
  }
}
