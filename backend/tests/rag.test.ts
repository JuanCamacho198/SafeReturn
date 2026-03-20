import { expect, test, describe } from "bun:test";
import { RagOrchestrator } from "../rag/orchestrator";

describe("RAG Pipeline Mock Tests", () => {
  test("Orchestrator generates a risk score between 0 and 1", async () => {
    const rag = new RagOrchestrator();
    const result = await rag.assessRisk("Patient complains of mild chest pain.");
    
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(1);
  });

  test("Orchestrator returns explanation and context fragments", async () => {
    const rag = new RagOrchestrator();
    const result = await rag.assessRisk("Patient missed medication.");
    
    expect(result.explanation).toBeDefined();
    expect(typeof result.explanation).toBe("string");
    expect(Array.isArray(result.fragments)).toBe(true);
  });
});
