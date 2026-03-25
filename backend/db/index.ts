import { Database } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute, resolve } from 'path';

const findSchema = (): string => {
  const possiblePaths = [
    // 1. Next to the executable (Tauri sidecar packaged)
    join(dirname(process.execPath), 'schema.sql'),
    // 2. In a resources folder next to executable (common convention)
    join(dirname(process.execPath), 'resources', 'schema.sql'),
    // 3. Current directory (relative to this file, for dev)
    join(import.meta.dir, 'schema.sql'),
    // 4. Project root fallback (useful for dev/monorepo)
    // Assuming we are in backend/db, go up two levels
    join(process.cwd(), 'backend', 'db', 'schema.sql'),
    join(process.cwd(), 'schema.sql'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
        return path;
    }
  }
  
  // Return the default relative path so the error message shows where we looked last,
  // or throw a descriptive error immediately.
  throw new Error(`schema.sql not found. Checked: ${possiblePaths.map(p => `'${p}'`).join(', ')}`);
};

export const initDb = (dbPath: string = 'database.sqlite') => {
  const db = new Database(dbPath, { create: true });
  
  // Enable Write-Ahead Logging for better performance
  db.exec('PRAGMA journal_mode = WAL;');
  
  // Read and execute schema
  const schemaPath = findSchema();
  try {
    const schemaSql = readFileSync(schemaPath, 'utf8');
    
    // bun:sqlite allows executing multiple statements
    db.exec(schemaSql);
    
    console.log(`Database initialized at ${dbPath} using schema from ${schemaPath}`);
  } catch (err) {
    console.error(`Failed to initialize database schema from ${schemaPath}:`, err);
    throw err;
  }
  
  return db;
};

export default initDb;
