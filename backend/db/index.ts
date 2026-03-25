import { Database } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute, resolve } from 'path';

const findSchema = (): string => {
  // 0. Environment variable override (Passed from Rust sidecar)
  if (process.env.SCHEMA_PATH && existsSync(process.env.SCHEMA_PATH)) {
    return process.env.SCHEMA_PATH;
  }

  const execDir = dirname(process.execPath);

  const possiblePaths = [
    // 1. Next to the executable (Tauri sidecar packaged)
    join(execDir, 'schema.sql'),
    // 2. In a resources folder next to executable (common convention)
    join(execDir, 'resources', 'schema.sql'),
    // 3. Up one level (e.g. from binaries/ folder to sidecar root)
    join(execDir, '..', 'schema.sql'),
    // 4. Up one level into resources (e.g. from binaries/ to resources/)
    join(execDir, '..', 'resources', 'schema.sql'),

    // Dev/Source paths
    // 5. Current directory (relative to this file, for dev)
    join(import.meta.dir, 'schema.sql'),
    // 6. Project root fallback (useful for dev/monorepo)
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
  throw new Error(`schema.sql not found.\nProcess ExecPath: ${process.execPath}\nChecked paths:\n${possiblePaths.map(p => `- ${p}`).join('\n')}`);
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
