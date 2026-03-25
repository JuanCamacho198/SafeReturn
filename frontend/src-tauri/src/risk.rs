// Risk assessment module - core logic for calling Groq API and fallback
use crate::prompt::{self, Patient};
use serde::{Deserialize, Serialize};
use std::fs;

/// Risk assessment result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskAssessment {
    pub risk_score: f64,
    pub explanation: String,
    pub fragments: Vec<String>,
    #[serde(default)]
    pub is_fallback: bool,
}

/// Groq API request structure
#[derive(Debug, Serialize)]
struct GroqRequest {
    model: String,
    messages: Vec<GroqMessage>,
    temperature: f64,
    max_tokens: u32,
    response_format: GroqResponseFormat,
}

/// Groq message structure
#[derive(Debug, Serialize)]
struct GroqMessage {
    role: String,
    content: String,
}

/// Groq response format structure
#[derive(Debug, Serialize)]
struct GroqResponseFormat {
    #[serde(rename = "type")]
    format_type: String,
}

/// Groq API response structure
#[derive(Debug, Deserialize)]
struct GroqResponse {
    choices: Vec<GroqChoice>,
}

/// Groq choice structure
#[derive(Debug, Deserialize)]
struct GroqChoice {
    message: GroqMessageContent,
}

/// Groq message content structure
#[derive(Debug, Deserialize)]
struct GroqMessageContent {
    content: String,
}

/// Load patient data from synthetic_patients.json
pub fn load_patient_data(patient_id: &str) -> Result<Patient, String> {
    let path = std::path::Path::new("frontend/src/lib/synthetic_patients.json");
    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read patient data: {}", e))?;
    
    let patients: Vec<Patient> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse patient data: {}", e))?;
    
    patients
        .into_iter()
        .find(|p| p.patient_id == patient_id)
        .ok_or_else(|| format!("Patient not found: {}", patient_id))
}

/// Call the Groq API with the constructed prompt
pub async fn call_groq_api(api_key: &str, prompt: &str) -> Result<RiskAssessment, String> {
    let client = reqwest::Client::new();
    
    let system_prompt = prompt::get_system_prompt();
    
    let request = GroqRequest {
        model: "llama-3.1-70b-versatile".to_string(),
        messages: vec![
            GroqMessage {
                role: "system".to_string(),
                content: system_prompt,
            },
            GroqMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
            },
        ],
        temperature: 0.1,
        max_tokens: 512,
        response_format: GroqResponseFormat {
            format_type: "json_object".to_string(),
        },
    };
    
    let response = client
        .post("https://api.groq.com/openai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request)
        .send()
        .await
        .map_err(|e| format!("API request failed: {}", e))?;
    
    // Check for HTTP errors
    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        
        return match status.as_u16() {
            429 => Err("API rate limit exceeded. Please try again later.".to_string()),
            402 => Err("API quota exhausted. Please check your Groq account.".to_string()),
            _ => Err(format!("API error ({}): {}", status, error_text)),
        };
    }
    
    let groq_response: GroqResponse = response
        .json()
        .map_err(|e| format!("Failed to parse API response: {}", e))?;
    
    let content = groq_response
        .choices
        .first()
        .ok_or_else(|| "No response from API".to_string())?
        .message
        .content
        .clone();
    
    parse_groq_response(&content)
}

/// Parse the Groq API JSON response
pub fn parse_groq_response(response: &str) -> Result<RiskAssessment, String> {
    // Try to parse the JSON response
    #[derive(Deserialize)]
    struct RawResponse {
        risk_score: f64,
        explanation: String,
        fragments: Vec<String>,
    }
    
    match serde_json::from_str::<RawResponse>(response) {
        Ok(raw) => Ok(RiskAssessment {
            risk_score: raw.risk_score.clamp(0.0, 1.0),
            explanation: raw.explanation,
            fragments: raw.fragments,
            is_fallback: false,
        }),
        Err(e) => Err(format!("Failed to parse response as JSON: {}. Raw response: {}", e, response)),
    }
}

/// Fallback assessment using clinical rules based on patient data
pub fn fallback_assessment(patient: &Patient) -> RiskAssessment {
    let mut risk_score: f64 = 0.3; // Base risk
    let mut fragments = Vec::new();
    
    // Check prior readmission - highest indicator
    if patient.outcomes.readmitted {
        risk_score += 0.4;
        fragments.push("Prior readmission within 30 days".to_string());
    }
    
    // Check number of diagnoses
    let diagnosis_count = patient.diagnoses.len();
    if diagnosis_count >= 4 {
        risk_score += 0.2;
        fragments.push(format!("Multiple comorbidities ({} diagnoses)", diagnosis_count));
    } else if diagnosis_count >= 2 {
        risk_score += 0.1;
    }
    
    // Check number of medications (polypharmacy risk)
    let med_count = patient.medications.len();
    if med_count >= 5 {
        risk_score += 0.15;
        fragments.push(format!("Polypharmacy ({} medications)", med_count));
    } else if med_count >= 3 {
        risk_score += 0.05;
    }
    
    // Check abnormal lab values
    let abnormal_labs: Vec<_> = patient.lab_results.iter()
        .filter(|l| l.flag != "normal")
        .collect();
    
    if !abnormal_labs.is_empty() {
        risk_score += 0.1;
        fragments.push(format!("{} abnormal lab values", abnormal_labs.len()));
        for lab in abnormal_labs.iter().take(3) {
            fragments.push(format!("{}: {}", lab.name, lab.flag));
        }
    }
    
    // Age factor
    if patient.demographics.age >= 70 {
        risk_score += 0.1;
        fragments.push(format!("Advanced age ({})", patient.demographics.age));
    }
    
    // High-risk diagnoses
    let high_risk_conditions = ["CHF", "Heart Failure", "COPD", "Diabetes", "Renal"];
    for diag in &patient.diagnoses {
        for condition in &high_risk_conditions {
            if diag.description.to_uppercase().contains(condition) {
                risk_score += 0.05;
                if !fragments.contains(&diag.description.clone()) {
                    fragments.push(diag.description.clone());
                }
                break;
            }
        }
    }
    
    // Clamp to 0-1 range
    risk_score = risk_score.clamp(0.0, 1.0);
    
    // Generate explanation based on top factors
    let explanation = if risk_score >= 0.7 {
        "High readmission risk based on prior readmission history, multiple comorbidities, and polypharmacy.".to_string()
    } else if risk_score >= 0.4 {
        "Moderate readmission risk. Consider close follow-up and medication reconciliation.".to_string()
    } else {
        "Low readmission risk based on stable clinical indicators.".to_string()
    };
    
    RiskAssessment {
        risk_score,
        explanation,
        fragments,
        is_fallback: true,
    }
}
