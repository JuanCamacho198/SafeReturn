import { writeFileSync } from "fs";

export class ExportService {
  /**
   * Generates a CSV report for patient risk assessments
   */
  async exportToCSV(patients: any[], filePath: string): Promise<boolean> {
    try {
      const header = "PatientID,Name,Condition,RiskScore\n";
      const rows = patients.map(p => `${p.id},"${p.name}","${p.condition}",${p.riskScore || 'N/A'}`).join("\n");
      writeFileSync(filePath, header + rows, 'utf-8');
      return true;
    } catch (e) {
      console.error("Export to CSV failed", e);
      return false;
    }
  }

  /**
   * Generates a JSON report including LLM explanations and RAG context
   */
  async exportToJSON(patients: any[], filePath: string): Promise<boolean> {
    try {
      writeFileSync(filePath, JSON.stringify(patients, null, 2), 'utf-8');
      return true;
    } catch (e) {
      console.error("Export to JSON failed", e);
      return false;
    }
  }
}
