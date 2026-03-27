import { spawn } from "child_process";
import { promisify } from "util";
import path from "path";

const execFile = promisify(require("child_process").execFile);

const SCRIPT_DIR = path.join(process.cwd(), "scripts");
const GENERATE_EMBEDDINGS_SCRIPT = path.join(SCRIPT_DIR, "generate_embeddings.py");

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
      "storage.sqlite"
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
