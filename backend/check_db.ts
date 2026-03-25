import { Database } from "bun:sqlite";

const db = new Database("storage.sqlite");
const patient = db.query("SELECT id FROM Patients LIMIT 1").get();
console.log(JSON.stringify(patient));
