// Embeddings generator using sentence-transformers (via subprocess)
import { spawn } from "child_process";

export async function generateEmbeddings(text: string): Promise<number[]> {
  // Mocking embedding generation for MVP
  console.log(`Generating embeddings for text: ${text.substring(0, 20)}...`);
  return Array(384).fill(Math.random());
}
