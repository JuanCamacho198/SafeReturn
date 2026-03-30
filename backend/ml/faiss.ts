import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { generateEmbeddings } from "./embeddings.js";

// Find project root by looking for the scripts folder
function findProjectRoot(startPath: string): string | null {
  let current = startPath;
  const maxDepth = 5;
  
  for (let i = 0; i < maxDepth; i++) {
    const scriptsPath = path.join(current, "scripts");
    const backendPath = path.join(current, "backend");
    
    if (fs.existsSync(scriptsPath) && fs.existsSync(backendPath)) {
      return current;
    }
    
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  
  return null;
}

// Try multiple methods to find project root
let PROJECT_ROOT: string;

const exeDir = path.dirname(process.execPath);
let foundRoot = findProjectRoot(exeDir);

if (!foundRoot) {
  foundRoot = findProjectRoot(process.cwd());
}

if (!foundRoot && process.env.INIT_CWD) {
  foundRoot = findProjectRoot(process.env.INIT_CWD);
}

if (!foundRoot) {
  PROJECT_ROOT = process.cwd();
} else {
  PROJECT_ROOT = foundRoot;
}

const SCRIPT_DIR = path.join(PROJECT_ROOT, "scripts");
const FAISS_OPS_SCRIPT = path.join(SCRIPT_DIR, "faiss_ops.py");
const STORAGE_DIR = path.join(PROJECT_ROOT, "storage");
const FAISS_INDEX_PATH = path.join(STORAGE_DIR, "faiss/clinical_notes.index");

console.log("FAISS PROJECT_ROOT:", PROJECT_ROOT);
console.log("FAISS SCRIPT_DIR:", SCRIPT_DIR);

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
    this.indexPath = indexPath || FAISS_INDEX_PATH;
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
