import { spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFile = promisify(require("child_process").execFile);

// Find project root by looking for the scripts folder
function findProjectRoot(startPath: string): string | null {
  let current = startPath;
  const maxDepth = 5;
  
  for (let i = 0; i < maxDepth; i++) {
    const scriptsPath = path.join(current, "scripts");
    const backendPath = path.join(current, "backend");
    
    // Check if this looks like our project root
    if (fs.existsSync(scriptsPath) && fs.existsSync(backendPath)) {
      return current;
    }
    
    const parent = path.dirname(current);
    if (parent === current) break; // Reached root
    current = parent;
  }
  
  return null;
}

// Try multiple methods to find project root
let PROJECT_ROOT: string;

// Method 1: From executable directory (for production builds)
const exeDir = path.dirname(process.execPath);
let foundRoot = findProjectRoot(exeDir);

// Method 2: From current working directory (for dev)
if (!foundRoot) {
  foundRoot = findProjectRoot(process.cwd());
}

// Method 3: From environment variable (Tauri sets this)
if (!foundRoot && process.env.INIT_CWD) {
  foundRoot = findProjectRoot(process.env.INIT_CWD);
}

// Fallback - use cwd and hope for the best
if (!foundRoot) {
  PROJECT_ROOT = process.cwd();
} else {
  PROJECT_ROOT = foundRoot;
}

const SCRIPT_DIR = path.join(PROJECT_ROOT, "scripts");
const GENERATE_EMBEDDINGS_SCRIPT = path.join(SCRIPT_DIR, "generate_embeddings.py");
const DB_PATH = path.join(PROJECT_ROOT, "storage.sqlite");

console.log("PROJECT_ROOT (auto-detected):", PROJECT_ROOT);
console.log("SCRIPT_DIR:", SCRIPT_DIR);
console.log("SCRIPT exists:", fs.existsSync(SCRIPT_DIR));
console.log("GENERATE_EMBEDDINGS_SCRIPT:", GENERATE_EMBEDDINGS_SCRIPT);

interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  model: string;
}

export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  return new Promise((resolve, reject) => {
    const python = process.platform === "win32" ? "python" : "python3";
    const args = [
      GENERATE_EMBEDDINGS_SCRIPT,
      "--text",
      text,
      "--db",
      DB_PATH
    ];

    const proc = spawn(python, args, {
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
        console.error("Python script error:", stderr);
        reject(new Error(`Embedding generation failed: ${stderr}`));
        return;
      }

      try {
        const output = stdout.trim();
        const lines = output.split("\n");
        const jsonLine = lines.find(line => line.trim().startsWith("{"));
        
        if (!jsonLine) {
          reject(new Error("No JSON output from embedding script"));
          return;
        }

        const result: EmbeddingResult = JSON.parse(jsonLine);
        
        if (!result.embedding || result.embedding.length !== 384) {
          reject(new Error(`Invalid embedding dimension: ${result.embedding?.length || 0}`));
          return;
        }

        resolve(result.embedding);
      } catch (parseError) {
        console.error("Failed to parse embedding output:", stdout);
        reject(new Error(`Failed to parse embedding: ${parseError}`));
      }
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn Python: ${err.message}`));
    });
  });
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  for (const text of texts) {
    const embedding = await generateEmbeddings(text);
    embeddings.push(embedding);
  }
  
  return embeddings;
}
