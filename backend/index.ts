import { initDb } from './db';
import { createInterface } from 'readline';
import { getPatients, getMetrics, getPatientById, assessPatientRisk } from './services/patient';
import { generateEmbeddings } from './ml/embeddings';
import { FaissStore } from './ml/faiss';
import { RagOrchestrator } from './rag/orchestrator';
import path from 'path';
import { existsSync } from 'fs';

// Find project root
function findProjectRoot(startPath: string): string | null {
  let current = startPath;
  const maxDepth = 5;
  for (let i = 0; i < maxDepth; i++) {
    const scriptsPath = path.join(current, "scripts");
    const backendPath = path.join(current, "backend");
    if (existsSync(scriptsPath) && existsSync(backendPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

// Get project root and set absolute database path
const execDir = path.dirname(process.execPath);
let projectRoot = findProjectRoot(execDir);
if (!projectRoot) projectRoot = findProjectRoot(process.cwd());
if (!projectRoot && process.env.INIT_CWD) projectRoot = findProjectRoot(process.env.INIT_CWD);
if (!projectRoot) projectRoot = process.cwd();

const dbPath = path.join(projectRoot, 'storage.sqlite');

// Initialize the database
const db = initDb(dbPath);

console.log(JSON.stringify({ type: 'log', message: `Sidecar initialized with DB: ${dbPath}` }));

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// IPC Listener over stdin
rl.on('line', async (line) => {
  if (!line.trim()) return;
  
  try {
    const message = JSON.parse(line);
    const { id, command, payload } = message;
    
    // Basic router
    switch (command) {
      case 'ping':
        sendResponse(id, { status: 'ok', timestamp: new Date().toISOString() });
        break;
      case 'health':
        sendResponse(id, { status: 'healthy', db: db.filename });
        break;
      case 'get_patients':
        try {
          const result = getPatients(db, payload);
          sendResponse(id, result);
        } catch (e) {
          sendError(id, `Error getting patients: ${e}`);
        }
        break;
      case 'get_metrics':
        try {
          const result = getMetrics(db);
          sendResponse(id, result);
        } catch (e) {
          sendError(id, `Error getting metrics: ${e}`);
        }
        break;
      case 'get_patient':
        try {
          const result = getPatientById(db, payload.id);
          sendResponse(id, result);
        } catch (e) {
          sendError(id, `Error getting patient: ${e}`);
        }
        break;
      case 'assess_risk':
        try {
          // Check if we should use cached analysis or run new one
          const forceNew = payload.forceNew === true;
          
          if (!forceNew) {
            // Check for existing analysis in history
            const latestAnalysis = db.prepare(`
              SELECT risk_score, explanation, evidence, created_at 
              FROM AnalysisHistory 
              WHERE patient_id = ?
              ORDER BY created_at DESC
              LIMIT 1
            `).get(payload.id) as { risk_score: number; explanation: string; evidence: string; created_at: string } | undefined;

            if (latestAnalysis) {
              // Return cached analysis
              sendResponse(id, {
                riskScore: latestAnalysis.risk_score,
                explanation: latestAnalysis.explanation,
                fragments: JSON.parse(latestAnalysis.evidence || '[]'),
                cached: true,
                createdAt: latestAnalysis.created_at
              });
              break;
            }
          }
          
          // Run new assessment
          const result = await assessPatientRisk(db, payload.id, payload.apiKey, payload.locale);
          sendResponse(id, result);
        } catch (e) {
          sendError(id, `Error assessing risk: ${e}`);
        }
        break;
      case 'get_analysis_history':
        try {
          const history = db.prepare(`
            SELECT risk_score, explanation, evidence, created_at 
            FROM AnalysisHistory 
            WHERE patient_id = ?
            ORDER BY created_at DESC
            LIMIT ?
          `).all(payload.id, payload.limit || 10);
          
          const formatted = history.map((h: any) => ({
            riskScore: h.risk_score,
            explanation: h.explanation,
            fragments: JSON.parse(h.evidence || '[]'),
            createdAt: h.created_at
          }));
          
          sendResponse(id, formatted);
        } catch (e) {
          sendError(id, `Error getting analysis history: ${e}`);
        }
        break;
      case 'generate_embedding':
        try {
          const result = await generateEmbeddings(payload.text);
          sendResponse(id, { embedding: result, dimension: result.length });
        } catch (e) {
          sendError(id, `Error generating embedding: ${e}`);
        }
        break;
      case 'ingest_document':
        try {
          const faissStore = new FaissStore();
          await faissStore.addDocument(payload.id, payload.text);
          sendResponse(id, { status: 'ingested', documentId: payload.id });
        } catch (e) {
          sendError(id, `Error ingesting document: ${e}`);
        }
        break;
      case 'search_similar':
        try {
          const faissStore = new FaissStore();
          const results = await faissStore.search(payload.query, payload.k || 5);
          sendResponse(id, { results });
        } catch (e) {
          sendError(id, `Error searching: ${e}`);
        }
        break;
      case 'rag_assess':
        try {
          const orchestrator = new RagOrchestrator(db, payload.apiKey);
          const result = await orchestrator.assessRisk(payload.notes, payload.locale || 'en');
          sendResponse(id, result);
        } catch (e) {
          sendError(id, `Error in RAG assessment: ${e}`);
        }
        break;
      case 'get_index_info':
        try {
          const faissStore = new FaissStore();
          const info = await faissStore.getIndexInfo();
          sendResponse(id, info);
        } catch (e) {
          sendError(id, `Error getting index info: ${e}`);
        }
        break;
      default:
        sendError(id, `Unknown command: ${command}`);
    }
  } catch (error) {
    console.error(JSON.stringify({ type: 'error', message: `Failed to parse message: ${line}`, error: String(error) }));
  }
});

function sendResponse(id: string, data: any) {
  console.log(JSON.stringify({ id, success: true, data }));
}

function sendError(id: string, error: string) {
  console.log(JSON.stringify({ id, success: false, error }));
}

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});
