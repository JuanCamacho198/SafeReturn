import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface EmbeddingResult {
  id: string;
  vector: number[];
  text: string;
  metadata: {
    noteId: string;
    patientId: string;
    chunkIndex: number;
  };
}

export interface EmbeddingRequest {
  texts: string[];
  noteId: string;
  patientId: string;
}

const PYTHON_SCRIPT = `
import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer

model = None

def load_model():
    global model
    if model is None:
        model = SentenceTransformer('all-MiniLM-L6-v2')
    return model

def encode_texts(texts):
    m = load_model()
    embeddings = m.encode(texts, convert_to_numpy=True)
    normalized = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    return normalized.tolist()

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        if data.get('type') == 'encode':
            texts = data.get('texts', [])
            embeddings = encode_texts(texts)
            print(json.dumps({'type': 'result', 'embeddings': embeddings, 'id': data.get('id')}))
        elif data.get('type') == 'ping':
            print(json.dumps({'type': 'pong'}))
        elif data.get('type') == 'shutdown':
            break
    except Exception as e:
        print(json.dumps({'type': 'error', 'error': str(e)}), file=sys.stderr)
    sys.stdout.flush()
`;

const SCRIPT_DIR = join(import.meta.dir, '..', 'ml-scripts');
const SCRIPT_PATH = join(SCRIPT_DIR, 'embedder.py');

export class EmbeddingService {
  private process: ReturnType<typeof spawn> | null = null;
  private pendingRequests: Map<string, { resolve: (v: number[][]) => void; reject: (e: Error) => void }> = new Map();
  private ready: boolean = false;
  private queue: string[] = [];
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!existsSync(SCRIPT_DIR)) {
      mkdirSync(SCRIPT_DIR, { recursive: true });
    }
    writeFileSync(SCRIPT_PATH, PYTHON_SCRIPT, 'utf8');
    await this.startPythonProcess();
  }

  private async startPythonProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('python', [SCRIPT_PATH], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      this.process.stdout?.setEncoding('utf8');
      this.process.stderr?.on('data', (data) => {
        console.error(JSON.stringify({ type: 'ml-error', source: 'python', message: data.toString() }));
      });

      let buffer = '';
      this.process.stdout?.on('data', (data: string) => {
        buffer += data;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) this.handleMessage(line);
        }
      });

      this.process.on('error', (err) => {
        console.error(JSON.stringify({ type: 'ml-error', message: `Python process error: ${err}` }));
        reject(err);
      });

      this.process.on('close', () => {
        this.ready = false;
        this.process = null;
      });

      this.send({ type: 'ping' }).then(() => {
        this.ready = true;
        resolve();
      }).catch(reject);

      setTimeout(() => reject(new Error('Embedding service init timeout')), 30000);
    });
  }

  private handleMessage(message: string): void {
    try {
      const data = JSON.parse(message);
      if (data.type === 'result' && data.id) {
        const pending = this.pendingRequests.get(data.id);
        if (pending) {
          pending.resolve(data.embeddings);
          this.pendingRequests.delete(data.id);
        }
      } else if (data.type === 'error') {
        const id = this.findPendingRequest();
        if (id) {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            pending.reject(new Error(data.error));
            this.pendingRequests.delete(id);
          }
        }
      } else if (data.type === 'pong') {
        this.ready = true;
      }
    } catch {
      // ignore parse errors
    }
  }

  private findPendingRequest(): string | undefined {
    for (const [id] of this.pendingRequests) return id;
    return undefined;
  }

  private send(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('Process not running'));
        return;
      }
      const msg = JSON.stringify(message) + '\n';
      this.process.stdin.write(msg, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private async ensureReady(): Promise<void> {
    await this.initPromise;
    if (!this.process || !this.ready) {
      await this.startPythonProcess();
      await this.initPromise;
    }
  }

  async encode(texts: string[]): Promise<number[][]> {
    await this.ensureReady();
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.send({ type: 'encode', texts, id }).catch(reject);
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Embedding request timeout'));
        }
      }, 60000);
    });
  }

  async encodeWithMetadata(request: EmbeddingRequest): Promise<EmbeddingResult[]> {
    const { texts, noteId, patientId } = request;
    const vectors = await this.encode(texts);
    return vectors.map((vector, index) => ({
      id: randomUUID(),
      vector,
      text: texts[index] ?? '',
      metadata: { noteId, patientId, chunkIndex: index },
    }));
  }

  async shutdown(): Promise<void> {
    if (this.process) {
      try {
        await this.send({ type: 'shutdown' });
        await new Promise(r => setTimeout(r, 500));
        this.process.kill();
      } catch { /* ignore */ }
    }
  }
}

let instance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!instance) instance = new EmbeddingService();
  return instance;
}
