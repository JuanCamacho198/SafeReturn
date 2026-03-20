import { initDb } from './db';
import { createInterface } from 'readline';

// Initialize the database
const db = initDb('storage.sqlite');

console.log(JSON.stringify({ type: 'log', message: 'Sidecar initialized' }));

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
