import { spawn } from "child_process";
import path from "path";
import { generateEmbeddings } from "./embeddings.js";

const SCRIPT_DIR = path.join(process.cwd(), "scripts");
const FAISS_OPS_SCRIPT = path.join(SCRIPT_DIR, "faiss_ops.py");

interface SearchResult {
  index: number;
  distance: number;
  metadata: any;
}

interface IndexInfo {
  dimension: number;
  ntotal: number;
  index_type: string;
  index_path: string;
}

export class FaissStore {
  private indexPath: string;

  constructor(indexPath?: string) {
    this.indexPath = indexPath || path.join(process.cwd(), "storage/faiss/clinical_notes.index");
  }

  private async runPythonCommand(args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const python = process.platform === "win32" ? "python" : "python3";

      const proc = spawn(python, [FAISS_OPS_SCRIPT, ...args], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`FAISS ops failed: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse FAISS output: ${parseError}`));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`Failed to spawn Python: ${err.message}`));
      });
    });
  }

  async addDocument(id: string, text: string): Promise<void> {
    const embedding = await generateEmbeddings(text);
    
    const args = [
      "add",
      "--embeddings",
      JSON.stringify([embedding]),
      "--metadata",
      JSON.stringify([{ id, text: text.substring(0, 100) }])
    ];

    await this.runPythonCommand(args);
  }

  async addDocumentWithEmbedding(id: string, embedding: number[]): Promise<void> {
    const args = [
      "add",
      "--embeddings",
      JSON.stringify([embedding]),
      "--metadata",
      JSON.stringify([{ id }])
    ];

    await this.runPythonCommand(args);
  }

  async search(queryText: string, k: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await generateEmbeddings(queryText);
    
    const args = [
      "search",
      "--query",
      JSON.stringify(queryEmbedding),
      "--k",
      k.toString()
    ];

    const result = await this.runPythonCommand(args);
    return result.results || [];
  }

  async searchWithEmbedding(queryEmbedding: number[], k: number = 5): Promise<SearchResult[]> {
    const args = [
      "search",
      "--query",
      JSON.stringify(queryEmbedding),
      "--k",
      k.toString()
    ];

    const result = await this.runPythonCommand(args);
    return result.results || [];
  }

  async getIndexInfo(): Promise<IndexInfo | null> {
    try {
      const args = ["info"];
      const result = await this.runPythonCommand(args);
      return result;
    } catch (error) {
      console.error("Failed to get index info:", error);
      return null;
    }
  }

  async getTotalVectors(): Promise<number> {
    const info = await this.getIndexInfo();
    return info?.ntotal || 0;
  }
}

export async function createFaissStore(): Promise<FaissStore> {
  return new FaissStore();
}
