export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
}

export interface RiskAssessment {
  riskScore: number;
  explanation: string;
  fragments: string[];
}
