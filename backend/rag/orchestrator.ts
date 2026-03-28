import { generateEmbeddings } from "../ml/embeddings";
import { VectorStore } from "../ml/vector_store";
import { GroqLLM } from "../ml/llm";
import type { Database } from "bun:sqlite";
import { createHash } from "crypto";

export interface PatientDemographics {
  age: number;
  gender: string;
}

export interface Comorbidity {
  name: string;
  duration?: string;
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface LabResult {
  name: string;
  value: number;
  unit?: string;
  flag?: string;
}

export interface VitalSigns {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
}

export interface PreviousReadmission {
  date: string;
  reason?: string;
}

export interface PatientContext {
  demographics: PatientDemographics;
  comorbidities?: Comorbidity[];
  medications?: Medication[];
  labResults?: LabResult[];
  vitalSigns?: VitalSigns;
  previousReadmissions?: PreviousReadmission[];
}

export interface RiskAssessmentResult {
  riskScore: number;
  explanation: string;
  fragments: string[];
}

interface AnalysisHistoryRow {
  id: string;
  patient_id: string | null;
  encounter_id: string | null;
  input_data_hash: string | null;
  risk_score: number | null;
  explanation: string | null;
  evidence: string | null;
  created_at: string | null;
}

export class RagOrchestrator {
  vectorStore: VectorStore;
  llm: GroqLLM;
  db: Database;

  constructor(db: Database, apiKey?: string) {
    this.vectorStore = new VectorStore(db);
    this.llm = new GroqLLM(apiKey);
    this.db = db;
  }

  private hashInput(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private formatPatientContext(context: PatientContext): string {
    let formatted = "";

    const { demographics, comorbidities, medications, labResults, vitalSigns, previousReadmissions } = context;

    formatted += `PATIENT DEMOGRAPHICS:
- Age: ${demographics.age} years
- Gender: ${demographics.gender}
`;

    if (comorbidities && comorbidities.length > 0) {
      formatted += `
COMORBIDITIES:
${comorbidities.map(c => `- ${c.name}${c.duration ? ` (${c.duration})` : ''}`).join('\n')}
`;
    }

    if (medications && medications.length > 0) {
      formatted += `
CURRENT MEDICATIONS:
${medications.map(m => `- ${m.name}${m.dosage ? ` ${m.dosage}` : ''}${m.frequency ? ` ${m.frequency}` : ''}`).join('\n')}
`;
    }

    if (labResults && labResults.length > 0) {
      formatted += `
LAB RESULTS:
${labResults.map(l => `- ${l.name}: ${l.value}${l.unit ? ` ${l.unit}` : ''}${l.flag ? ` [${l.flag}]` : ''}`).join('\n')}
`;
    }

    if (vitalSigns) {
      let vitalsStr = `
VITAL SIGNS:
`;
      if (vitalSigns.bloodPressureSystolic && vitalSigns.bloodPressureDiastolic) {
        vitalsStr += `- Blood Pressure: ${vitalSigns.bloodPressureSystolic}/${vitalSigns.bloodPressureDiastolic} mmHg\n`;
      }
      if (vitalSigns.heartRate) {
        vitalsStr += `- Heart Rate: ${vitalSigns.heartRate} bpm\n`;
      }
      if (vitalSigns.temperature) {
        vitalsStr += `- Temperature: ${vitalSigns.temperature} °C\n`;
      }
      if (vitalSigns.respiratoryRate) {
        vitalsStr += `- Respiratory Rate: ${vitalSigns.respiratoryRate} breaths/min\n`;
      }
      if (vitalSigns.oxygenSaturation) {
        vitalsStr += `- Oxygen Saturation: ${vitalSigns.oxygenSaturation}%\n`;
      }
      formatted += vitalsStr;
    }

    if (previousReadmissions && previousReadmissions.length > 0) {
      formatted += `
PREVIOUS READMISSION HISTORY:
${previousReadmissions.map(r => `- ${r.date}${r.reason ? `: ${r.reason}` : ''}`).join('\n')}
`;
    }

    return formatted;
  }

  private saveAnalysisHistory(
    patientId: string | null,
    encounterId: string | null,
    inputDataHash: string,
    riskScore: number,
    explanation: string,
    evidence: string[]
  ): void {
    const id = createHash('sha256').update(`${inputDataHash}${Date.now()}`).digest('hex').substring(0, 16);

    try {
      const insertStmt = this.db.prepare(`
        INSERT INTO AnalysisHistory (id, patient_id, encounter_id, input_data_hash, risk_score, explanation, evidence)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        id,
        patientId,
        encounterId,
        inputDataHash,
        riskScore,
        explanation,
        JSON.stringify(evidence)
      );

      console.log(`Analysis history saved with id: ${id}`);
    } catch (err) {
      console.error("Failed to save analysis history:", err);
    }
  }

  async shouldReanalyze(patientId: string): Promise<{ shouldReanalyze: boolean; reason: string }> {
    try {
      // Get last analysis for this patient
      const lastAnalysis = this.db.prepare(`
        SELECT created_at, input_data_hash, risk_score 
        FROM AnalysisHistory 
        WHERE patient_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(patientId) as AnalysisHistoryRow | undefined;

      if (!lastAnalysis) {
        return { shouldReanalyze: true, reason: "No previous analysis found" };
      }

      // Check if last analysis is older than 7 days
      const lastDate = new Date(lastAnalysis.created_at!);
      const now = new Date();
      const daysDiff = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 7) {
        return { shouldReanalyze: true, reason: `Last analysis was ${Math.round(daysDiff)} days ago` };
      }

      // Check if there are new encounters
      const newEncounters = this.db.prepare(`
        SELECT COUNT(*) as count FROM Encounters 
        WHERE patient_id = ? AND created_at > ?
      `).get(patientId, lastAnalysis.created_at!) as { count: number };

      if (newEncounters.count > 0) {
        return { shouldReanalyze: true, reason: `${newEncounters.count} new encounter(s) added` };
      }

      // Check if medications changed
      const lastMedCount = this.db.prepare(`
        SELECT COUNT(*) as count FROM Medications WHERE patient_id = ?
      `).get(patientId) as { count: number };

      // If no significant changes
      return { shouldReanalyze: false, reason: "No significant changes detected" };

    } catch (err) {
      console.error("Error in shouldReanalyze:", err);
      return { shouldReanalyze: true, reason: "Error checking for changes" };
    }
  }

  async getAnalysisHistory(patientId: string, limit: number = 10): Promise<AnalysisHistoryRow[]> {
    try {
      return this.db.prepare(`
        SELECT * FROM AnalysisHistory 
        WHERE patient_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(patientId, limit) as AnalysisHistoryRow[];
    } catch (err) {
      console.error("Error getting analysis history:", err);
      return [];
    }
  }

  async assessRisk(
    patientNotes: string,
    locale: string = "en",
    patientContext?: PatientContext,
    patientId?: string,
    encounterId?: string
  ): Promise<RiskAssessmentResult> {
    const embedding = await generateEmbeddings(patientNotes);
    
    const context = await this.vectorStore.search({ vector: embedding });
    
    const contextString = context.map((c, i) => `Case ${i+1}: ${c.textChunk}`).join('\n\n');

    let patientContextString = "";
    if (patientContext) {
      patientContextString = this.formatPatientContext(patientContext);
    }

    const prompt = `
You are a clinical risk assessment expert. Analyze the following patient information and similar historical cases to predict the 30-day readmission risk.

${patientContextString}

similar_cases:
${contextString}

current_patient_notes:
${patientNotes}

Task:
1. Analyze the risk factors in the current patient notes and patient context.
2. Consider demographics, comorbidities, medications, lab results, vital signs, and previous readmissions.
3. Compare with outcomes in similar cases.
4. Determine a risk score from 0.0 (low risk) to 1.0 (high risk).
5. Select key fragments from the text that support your decision.

Output MUST be a valid JSON object with this exact structure:
{
  "riskScore": number, // 0.0 to 1.0
  "explanation": "string", // Concise clinical explanation
  "evidence": ["string"] // Exact quotes or specific facts from the notes/context
}

IMPORTANT: Write the content of the "explanation" string and the "evidence" array strictly in the ISO language code: '${locale}'. Keep the JSON keys in English as specified above.

Return ONLY the raw JSON string. No markdown, no code blocks.
`;

    const result = await this.llm.predict(prompt);
    
    try {
      const cleanedResult = result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedResult);

      const riskScore = typeof parsed.riskScore === 'number' 
          ? Math.max(0, Math.min(1, parsed.riskScore)) 
          : 0.5;
      
      const explanation = typeof parsed.explanation === 'string' 
          ? parsed.explanation 
          : "Risk assessment generated, but explanation format was invalid.";

      const fragments = Array.isArray(parsed.evidence) 
          ? parsed.evidence.filter((e: unknown) => typeof e === 'string') 
          : [];

      const inputDataHash = this.hashInput(patientNotes + JSON.stringify(patientContext || {}));
      this.saveAnalysisHistory(
        patientId || null,
        encounterId || null,
        inputDataHash,
        riskScore,
        explanation,
        fragments
      );

      return {
        riskScore,
        explanation,
        fragments
      };

    } catch (e) {
      console.error("Failed to parse LLM risk assessment response:", result, e);
      return {
        riskScore: 0.5,
        explanation: "Automated risk assessment failed to parse. Please review patient notes manually.",
        fragments: []
      };
    }
  }
}
