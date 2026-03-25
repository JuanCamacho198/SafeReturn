// Prompt module for building clinical prompts for Groq API
#![allow(dead_code)]
use serde::{Deserialize, Serialize};

/// Patient demographics structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Demographics {
    pub age: u32,
    pub gender: String,
    pub ethnicity: String,
    pub insurance: String,
}

/// Diagnosis structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnosis {
    pub icd10: String,
    pub description: String,
    pub primary: bool,
}

/// Medication structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Medication {
    pub name: String,
    pub dosage: String,
    pub frequency: String,
    pub route: String,
}

/// Lab result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LabResult {
    pub name: String,
    pub value: f64,
    pub unit: String,
    pub reference_range: Vec<f64>,
    pub flag: String,
    pub panel: String,
}

/// Outcomes structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Outcomes {
    pub readmitted: bool,
    pub days_to_readmission: Option<u32>,
    pub discharge_disposition: String,
}

/// Full patient data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Patient {
    pub patient_id: String,
    pub demographics: Demographics,
    pub diagnoses: Vec<Diagnosis>,
    pub medications: Vec<Medication>,
    pub lab_results: Vec<LabResult>,
    pub outcomes: Outcomes,
}

/// Build a clinical prompt for the Groq API
/// Includes all patient data and requests structured JSON output
pub fn build_clinical_prompt(patient: &Patient) -> String {
    let mut prompt = String::new();
    
    // Demographics
    prompt.push_str("## Patient Demographics\n");
    prompt.push_str(&format!("- Age: {}\n", patient.demographics.age));
    prompt.push_str(&format!("- Gender: {}\n", patient.demographics.gender));
    prompt.push_str(&format!("- Ethnicity: {}\n", patient.demographics.ethnicity));
    prompt.push_str(&format!("- Insurance: {}\n\n", patient.demographics.insurance));
    
    // Diagnoses
    prompt.push_str("## Diagnoses\n");
    for diag in &patient.diagnoses {
        let primary_marker = if diag.primary { " (primary)" } else { "" };
        prompt.push_str(&format!("- {}: {}{}\n", diag.icd10, diag.description, primary_marker));
    }
    prompt.push('\n');
    
    // Medications
    prompt.push_str("## Current Medications\n");
    for med in &patient.medications {
        prompt.push_str(&format!("- {} {} ({})\n", med.name, med.dosage, med.frequency));
    }
    prompt.push('\n');
    
    // Lab Results - show abnormal ones prominently
    prompt.push_str("## Lab Results\n");
    for lab in &patient.lab_results {
        let flag_marker = if lab.flag != "normal" {
            format!(" [{}]", lab.flag.to_uppercase())
        } else {
            String::new()
        };
        let ref_range = if lab.reference_range.len() >= 2 {
            format!("({}-{})", lab.reference_range[0], lab.reference_range[1])
        } else {
            String::new()
        };
        prompt.push_str(&format!("- {}: {}{} {}{}\n", lab.name, lab.value, lab.unit, ref_range, flag_marker));
    }
    prompt.push('\n');
    
    // Outcomes (readmission history)
    prompt.push_str("## Historical Outcomes\n");
    prompt.push_str(&format!(
        "- Readmitted: {}\n",
        if patient.outcomes.readmitted {
            format!(
                "Yes ({} days to readmission)",
                patient.outcomes.days_to_readmission.unwrap_or(0)
            )
        } else {
            "No".to_string()
        }
    ));
    prompt.push_str(&format!("- Discharge Disposition: {}\n\n", patient.outcomes.discharge_disposition));
    
    // Instructions for the LLM
    prompt.push_str("## Task\n");
    prompt.push_str("Analyze this patient's clinical data and assess their 30-day readmission risk.\n");
    prompt.push_str("Consider:\n");
    prompt.push_str("1. Number and severity of diagnoses\n");
    prompt.push_str("2. Number and complexity of medications\n");
    prompt.push_str("3. Abnormal lab values\n");
    prompt.push_str("4. Prior readmission history\n");
    prompt.push_str("5. Age and comorbidities\n\n");
    prompt.push_str("Provide your response as a JSON object with these exact fields:\n");
    prompt.push_str("- risk_score: number between 0.0 and 1.0\n");
    prompt.push_str("- explanation: string (1-2 sentences explaining the risk)\n");
    prompt.push_str("- fragments: array of strings (key evidence that contributes to risk)\n");
    prompt.push_str("\nExample output:\n");
    prompt.push_str(r#"{"risk_score": 0.72, "explanation": "High risk due to prior readmission and multiple comorbidities including CHF and diabetes with complications.", "fragments": ["Prior readmission within 30 days", "CHF diagnosis", "Diabetes with complications", "On 5 different medications"]}"#);
    
    prompt
}

/// Get the system prompt for the Groq API
pub fn get_system_prompt() -> String {
    String::from("You are a clinical risk assessment assistant specializing in predicting 30-day hospital readmission risk. Analyze patient data carefully and provide evidence-based risk assessments. Always respond with valid JSON.")
}
