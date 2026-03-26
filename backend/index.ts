import { initDb } from './db';
import { createInterface } from 'readline';
import { getPatients, getMetrics, getPatientById, assessPatientRisk } from './services/patient';

// Initialize the database
const dbPath = process.env.DB_PATH || 'storage.sqlite';
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
          const result = await assessPatientRisk(db, payload.id, payload.apiKey, payload.locale);
          sendResponse(id, result);
        } catch (e) {
          sendError(id, `Error assessing risk: ${e}`);
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
