import { expect, test, describe, beforeAll, afterAll, mock } from "bun:test";
import { RagOrchestrator } from "../rag/orchestrator";
import { Database } from "bun:sqlite";

// Mock GroqLLM so we don't need API key and can test JSON parsing
mock.module("../ml/llm", () => {
  return {
    GroqLLM: class {
      async predict(prompt: string) {
        return JSON.stringify({
          riskScore: 0.75,
          explanation: "High risk due to history.",
          evidence: ["Patient missed dose", "Previous readmission"]
        });
      }
    }
  };
});

describe("RAG Pipeline Mock Tests", () => {
  let db: Database;

  beforeAll(() => {
    db = new Database(":memory:");
    // Create tables needed by VectorStore to avoid errors during rebuild
    db.run("CREATE TABLE IF NOT EXISTS Embeddings (id INTEGER PRIMARY KEY, encounter_id TEXT, chunk_index INTEGER, text_chunk TEXT, embedding_vector BLOB)");
    db.run("CREATE TABLE IF NOT EXISTS Encounters (id TEXT PRIMARY KEY, patient_id TEXT)");
  });

  afterAll(() => {
    db.close();
  });

  test("Orchestrator generates a risk score between 0 and 1", async () => {
    const rag = new RagOrchestrator(db);
    const result = await rag.assessRisk("Patient complains of mild chest pain.");
    
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);
    expect(result.riskScore).toBe(0.75); // Matches our mock
  });

  test("Orchestrator returns explanation and context fragments", async () => {
    const rag = new RagOrchestrator(db);
    const result = await rag.assessRisk("Patient missed medication.");
    
    expect(result.explanation).toBeDefined();
    expect(typeof result.explanation).toBe("string");
    expect(Array.isArray(result.fragments)).toBe(true);
    expect(result.fragments.length).toBe(2); // Matches our mock evidence
    expect(result.fragments[0]).toBe("Patient missed dose");
  });
});
