import { generateEmbeddings } from "../ml/embeddings";
import { FaissStore } from "../ml/faiss";
import { LlamaInference } from "../ml/llm";

export class RagOrchestrator {
  faiss: FaissStore;
  llm: LlamaInference;

  constructor() {
    this.faiss = new FaissStore();
    this.llm = new LlamaInference("./models/mistral-7b-instruct.gguf");
  }

  async assessRisk(patientNotes: string) {
    // 1. Generate embeddings for input
    const embedding = await generateEmbeddings(patientNotes);
    
    // 2. Retrieve similar cases/history
    const context = await this.faiss.search(embedding);
    
    // 3. Augment prompt and generate
    const prompt = `Context: ${JSON.stringify(context)}\nNotes: ${patientNotes}\nPredict 30-day readmission risk:`;
    const result = await this.llm.predict(prompt);
    
    return {
      riskScore: 0.85,
      explanation: result,
      fragments: context
    };
  }
}
