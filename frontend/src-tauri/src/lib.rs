mod prompt;
mod risk;

use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;
use tauri_plugin_store::StoreExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_setting(app: tauri::AppHandle, key: String, value: String) -> Result<(), String> {
    let path = PathBuf::from("settings.json");
    let store = app.store(&path).map_err(|e| e.to_string())?;
    store.set(key, json!(value));
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_setting(app: tauri::AppHandle, key: String) -> Result<Option<String>, String> {
    let path = PathBuf::from("settings.json");
    let store = app.store(&path).map_err(|e| e.to_string())?;
    let value = store.get(key).map(|v| v.as_str().unwrap_or("").to_string());
    Ok(value)
}

#[tauri::command]
fn delete_setting(app: tauri::AppHandle, key: String) -> Result<(), String> {
    let path = PathBuf::from("settings.json");
    let store = app.store(&path).map_err(|e| e.to_string())?;
    store.delete(key);
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

/// Payload for assess_risk command
#[derive(Debug, Deserialize)]
pub struct AssessRiskPayload {
    id: String,
    #[serde(default)]
    api_key: Option<String>,
}

/// Risk assessment result returned to frontend
#[derive(Debug, Serialize)]
pub struct RiskAssessmentResult {
    pub risk_score: f64,
    pub explanation: String,
    pub fragments: Vec<String>,
    #[serde(default)]
    pub is_fallback: bool,
}

/// Tauri command to assess patient risk using Groq API
#[tauri::command]
async fn assess_risk(app: tauri::AppHandle, payload: AssessRiskPayload) -> Result<RiskAssessmentResult, String> {
    // Get API key - from payload or from settings
    let api_key = if let Some(key) = payload.api_key {
        key
    } else {
        let path = PathBuf::from("settings.json");
        let store = app.store(&path).map_err(|e| e.to_string())?;
        match store.get("groq_api_key") {
            Some(value) => value.as_str().unwrap_or("").to_string(),
            None => return Err("Groq API key not configured. Please add it in Settings.".to_string()),
        }
    };
    
    if api_key.is_empty() {
        return Err("Groq API key not configured. Please add it in Settings.".to_string());
    }
    
    // Call sidecar for risk assessment
    // The sidecar handles loading patient data from the DB and running the RAG pipeline
    match risk::assess_risk_with_sidecar(app, payload.id, Some(api_key)).await {
        Ok(assessment) => {
            Ok(RiskAssessmentResult {
                risk_score: assessment.risk_score,
                explanation: assessment.explanation,
                fragments: assessment.fragments,
                is_fallback: assessment.is_fallback,
            })
        },
        Err(e) => {
            eprintln!("Sidecar error: {}", e);
            Err(format!("Risk assessment failed: {}", e))
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_setting,
            load_setting,
            delete_setting,
            assess_risk
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
