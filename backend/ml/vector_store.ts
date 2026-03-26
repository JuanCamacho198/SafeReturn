import { Database } from 'bun:sqlite';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

export interface VectorMetadata {
  id: string;
  noteId: string;
  patientId: string;
  textChunk: string;
  noteType?: string;
  noteDate?: string;
  chunkIndex: number;
}

export interface RetrievalResult {
  id: string;
  noteId: string;
  patientId: string;
  textChunk: string;
  noteType?: string;
  noteDate?: string;
  similarityScore: number;
}

export interface RetrievalQuery {
  vector: number[];
  topK?: number;
  patientId?: string;
}

const DIMENSION = 384;
const INDEX_FILE = 'storage/faiss/index.bin';
const META_FILE = 'storage/faiss/metadata.json';

export class VectorStore {
  private db: Database;
  private indexPath: string;
  private metaPath: string;
  private index: Float32Array | null = null;
  private metadata: VectorMetadata[] = [];
  private idMap: Map<number, string> = new Map();

  constructor(db: Database, storageDir: string = 'storage/faiss') {
    this.db = db;
    // Use process.cwd() instead of import.meta.dir which breaks in Bun single-file executables
    const baseDir = process.cwd();
    const dir = join(baseDir, storageDir);
    this.indexPath = join(dir, 'index.bin');
    this.metaPath = join(dir, 'metadata.json');
    this.ensureDir(dir);
  }

  private ensureDir(dir: string): void {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  async loadIndex(): Promise<void> {
    try {
      if (existsSync(this.indexPath) && existsSync(this.metaPath)) {
        const buffer = readFileSync(this.indexPath);
        this.index = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
        const metaRaw = readFileSync(this.metaPath, 'utf8');
        const parsed = JSON.parse(metaRaw);
        this.metadata = parsed.metadata;
        this.idMap.clear();
        this.metadata.forEach((m, i) => this.idMap.set(i, m.id));
      } else {
        await this.rebuild();
      }
    } catch (err) {
      console.error(JSON.stringify({ type: 'faiss-error', message: `Failed to load index: ${err}` }));
      await this.rebuild();
    }
  }

  async addVectors(vectors: number[][], meta: Omit<VectorMetadata, 'id'>[]): Promise<string[]> {
    if (!this.index) await this.loadIndex();
    const ids: string[] = [];
    const startIdx = this.metadata.length;
    const totalVecs = startIdx + vectors.length;

    const newIndex = new Float32Array(DIMENSION * totalVecs);
    if (this.index) newIndex.set(this.index);
    for (let i = 0; i < vectors.length; i++) {
      const vec = vectors[i]!;
      const base = (startIdx + i) * DIMENSION;
      for (let j = 0; j < DIMENSION; j++) {
        newIndex[base + j] = vec[j] ?? 0;
      }
      const id = (this.metadata.length + i).toString();
      ids.push(id);
      const metaItem = meta[i]!;
      const m: VectorMetadata = { noteId: metaItem.noteId, patientId: metaItem.patientId, textChunk: metaItem.textChunk, noteType: metaItem.noteType, noteDate: metaItem.noteDate, chunkIndex: metaItem.chunkIndex, id };
      this.metadata.push(m);
      this.idMap.set(startIdx + i, id);
    }
    this.index = newIndex;
    await this.saveIndex();
    return ids;
  }

  async search(query: RetrievalQuery): Promise<RetrievalResult[]> {
    if (!this.index || this.metadata.length === 0) await this.loadIndex();
    const { vector, topK = 5, patientId } = query;

    let candidates: Array<{ idx: number; score: number }> = [];
    const numVecs = this.metadata.length;

    for (let i = 0; i < numVecs; i++) {
      const base = i * DIMENSION;
      let dot = 0;
      for (let j = 0; j < DIMENSION; j++) {
        dot += (this.index![base + j] ?? 0) * (vector[j] ?? 0);
      }
      candidates.push({ idx: i, score: dot });
    }

    candidates.sort((a, b) => b.score - a.score);
    candidates = candidates.slice(0, topK * 3);

    if (patientId) {
      candidates = candidates.filter(c => {
        const m = this.metadata[c.idx];
        return m?.patientId === patientId;
      }).slice(0, topK);
    } else {
      candidates = candidates.slice(0, topK);
    }

    return candidates.map(c => {
      const m = this.metadata[c.idx]!;
      return {
        id: m.id,
        noteId: m.noteId,
        patientId: m.patientId,
        textChunk: m.textChunk,
        noteType: m.noteType,
        noteDate: m.noteDate,
        similarityScore: Math.round(c.score * 1000) / 1000,
      };
    });
  }

  async saveIndex(): Promise<void> {
    try {
      const buffer = Buffer.from(this.index!.buffer, this.index!.byteOffset, this.index!.byteLength);
      writeFileSync(this.indexPath, buffer);
      const metaJson = JSON.stringify({ metadata: this.metadata }, null, 2);
      writeFileSync(this.metaPath, metaJson);
    } catch (err) {
      console.error(JSON.stringify({ type: 'faiss-error', message: `Failed to save index: ${err}` }));
      throw err;
    }
  }

  async rebuild(): Promise<void> {
    const rows = this.db.query(`SELECT id, encounter_id, chunk_index, text_chunk FROM Embeddings`).all() as any[];
    const encounters = this.db.query(`SELECT id, patient_id FROM Encounters`).all() as any[];

    const encounterMap = new Map<string, string>();
    for (const e of encounters) encounterMap.set(e.id, e.patient_id);

    const vectors: number[][] = [];
    const metas: Omit<VectorMetadata, 'id'>[] = [];
    const missingVectors: string[] = [];

    for (const row of rows) {
      if (row.embedding_vector) {
        const vec = new Float32Array(row.embedding_vector);
        const arr: number[] = Array.from(vec);
        vectors.push(arr);
        metas.push({
          noteId: row.encounter_id,
          patientId: encounterMap.get(row.encounter_id) || '',
          textChunk: row.text_chunk,
          chunkIndex: row.chunk_index,
        });
      } else {
        missingVectors.push(row.id);
      }
    }

    const newIndex = new Float32Array(DIMENSION * vectors.length);
    for (let i = 0; i < vectors.length; i++) {
      const vec = vectors[i] ?? [];
      const base = i * DIMENSION;
      for (let j = 0; j < DIMENSION; j++) {
        newIndex[base + j] = vec[j] ?? 0;
      }
    }

    this.index = newIndex;
    this.metadata = metas.map((m, i) => ({ ...m, id: i.toString() }));
    this.idMap.clear();
    this.metadata.forEach((m, i) => this.idMap.set(i, m.id));

    await this.saveIndex();

    if (missingVectors.length > 0) {
      console.warn(JSON.stringify({ type: 'faiss-warning', message: `${missingVectors.length} embeddings missing vectors`, ids: missingVectors }));
    }
  }

  getIndexStats(): { count: number; dimension: number; path: string } {
    return {
      count: this.metadata.length,
      dimension: DIMENSION,
      path: this.indexPath,
    };
  }
}
