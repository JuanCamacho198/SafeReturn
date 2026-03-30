import { Database } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute, resolve } from 'path';

// Find project root by looking for known directories
function findProjectRoot(startPath: string): string | null {
  let current = startPath;
  const maxDepth = 5;
  
  for (let i = 0; i < maxDepth; i++) {
    const scriptsPath = join(current, "scripts");
    const backendPath = join(current, "backend");
    const schemaPath = join(current, "backend", "db", "schema.sql");
    
    if (existsSync(scriptsPath) && existsSync(schemaPath)) {
      return current;
    }
    
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  
  return null;
}

const findSchema = (): string => {
  // 0. Environment variable override (Passed from Rust sidecar)
  if (process.env.SCHEMA_PATH && existsSync(process.env.SCHEMA_PATH)) {
    return process.env.SCHEMA_PATH;
  }

  const execDir = dirname(process.execPath);
  
  // Auto-detect project root
  let projectRoot = findProjectRoot(execDir);
  if (!projectRoot) {
    projectRoot = findProjectRoot(process.cwd());
  }
  if (!projectRoot && process.env.INIT_CWD) {
    projectRoot = findProjectRoot(process.env.INIT_CWD);
  }
  if (!projectRoot) {
    projectRoot = process.cwd();
  }

  const possiblePaths = [
    // 1. Auto-detected project root paths
    join(projectRoot, 'backend', 'db', 'schema.sql'),
    join(projectRoot, 'schema.sql'),
    
    // 2. Next to the executable (Tauri sidecar packaged)
    join(execDir, 'schema.sql'),
    // 3. In a resources folder next to executable
    join(execDir, 'resources', 'schema.sql'),
    // 4. Up one level
    join(execDir, '..', 'schema.sql'),
    // 5. Up one level into resources
    join(execDir, '..', 'resources', 'schema.sql'),

    // Dev/Source paths
    // 6. Current directory (relative to this file, for dev)
    join(import.meta.dir, 'schema.sql'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
        console.log("Found schema at:", path);
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
