import { generateEmbeddings } from "../ml/embeddings";
import { VectorStore } from "../ml/vector_store";
import { GroqLLM } from "../ml/llm";
import type { Database } from "bun:sqlite";

export class RagOrchestrator {
  vectorStore: VectorStore;
  llm: GroqLLM;

  constructor(db: Database) {
    this.vectorStore = new VectorStore(db);
    this.llm = new GroqLLM();
  }

  async assessRisk(patientNotes: string) {
    // 1. Generate embeddings for input
    // generateEmbeddings returns Promise<number[]>
    const embedding = await generateEmbeddings(patientNotes);
    
    // 2. Retrieve similar cases/history
    // vectorStore.search expects { vector: number[], ... }
    const context = await this.vectorStore.search({ vector: embedding });
    
    // 3. Augment prompt and generate
    const prompt = `Context: ${JSON.stringify(context)}\nNotes: ${patientNotes}\nPredict 30-day readmission risk based on the notes and similar cases.`;
    const result = await this.llm.predict(prompt);
    
    return {
      riskScore: 0.85, // Placeholder, ideally parsed from result
      explanation: result,
      fragments: context
    };
  }
}
