import { generateEmbeddings } from "../ml/embeddings";
import { VectorStore } from "../ml/vector_store";
import { GroqLLM } from "../ml/llm";
import type { Database } from "bun:sqlite";

export class RagOrchestrator {
  vectorStore: VectorStore;
  llm: GroqLLM;

  constructor(db: Database, apiKey?: string) {
    this.vectorStore = new VectorStore(db);
    this.llm = new GroqLLM(apiKey);
  }

  async assessRisk(patientNotes: string) {
    // 1. Generate embeddings for input
    // generateEmbeddings returns Promise<number[]>
    const embedding = await generateEmbeddings(patientNotes);
    
    // 2. Retrieve similar cases/history
    // vectorStore.search expects { vector: number[], ... }
    const context = await this.vectorStore.search({ vector: embedding });
    
    // 3. Augment prompt and generate
    const contextString = context.map((c, i) => `Case ${i+1}: ${c.textChunk}`).join('\n\n');
    
    const prompt = `
You are a clinical risk assessment expert. Analyze the following patient notes and similar historical cases to predict the 30-day readmission risk.

similar_cases:
${contextString}

current_patient_notes:
${patientNotes}

Task:
1. Analyze the risk factors in the current patient notes.
2. Compare with outcomes in similar cases.
3. Determine a risk score from 0.0 (low risk) to 1.0 (high risk).
4. Select key fragments from the text that support your decision.

Output MUST be a valid JSON object with this exact structure:
{
  "riskScore": number, // 0.0 to 1.0
  "explanation": "string", // Concise clinical explanation
  "evidence": ["string"] // Exact quotes or specific facts from the notes/context
}

Return ONLY the raw JSON string. No markdown, no code blocks.
`;

    const result = await this.llm.predict(prompt);
    
    try {
      // 4. Parse and Validate
      // Clean the result in case the LLM wrapped it in markdown
      const cleanedResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedResult);

      // Robust validation with fallbacks
      const riskScore = typeof parsed.riskScore === 'number' 
          ? Math.max(0, Math.min(1, parsed.riskScore)) 
          : 0.5;
      
      const explanation = typeof parsed.explanation === 'string' 
          ? parsed.explanation 
          : "Risk assessment generated, but explanation format was invalid.";

      const fragments = Array.isArray(parsed.evidence) 
          ? parsed.evidence.filter((e: any) => typeof e === 'string') 
          : [];

      return {
        riskScore,
        explanation,
        fragments
      };

    } catch (e) {
      console.error("Failed to parse LLM risk assessment response:", result, e);
      // Fail safely
      return {
        riskScore: 0.5,
        explanation: "Automated risk assessment failed to parse. Please review patient notes manually.",
        fragments: []
      };
    }
  }
}
