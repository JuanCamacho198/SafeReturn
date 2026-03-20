import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';

export const initDb = (dbPath: string = 'database.sqlite') => {
  const db = new Database(dbPath, { create: true });
  
  // Enable Write-Ahead Logging for better performance
  db.exec('PRAGMA journal_mode = WAL;');
  
  // Read and execute schema
  const schemaPath = join(import.meta.dir, 'schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf8');
  
  // bun:sqlite allows executing multiple statements
  db.exec(schemaSql);
  
  console.log(`Database initialized at ${dbPath}`);
  
  return db;
};

export default initDb;
