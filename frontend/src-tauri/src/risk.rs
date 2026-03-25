use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{Command, CommandEvent};

/// Risk assessment result structure
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskAssessment {
    pub risk_score: f64,
    pub explanation: String,
    pub fragments: Vec<String>,
    #[serde(default)]
    pub is_fallback: bool,
}

#[derive(Debug, Deserialize)]
struct SidecarResponse {
    id: String,
    success: bool,
    data: Option<RiskAssessment>,
    error: Option<String>,
}

/// Call the sidecar to assess risk
pub async fn assess_risk_with_sidecar(
    app: tauri::AppHandle,
    patient_id: String,
    api_key: Option<String>,
) -> Result<RiskAssessment, String> {
    let sidecar_command: Command = app.shell().sidecar("backend-sidecar").map_err(|e| e.to_string())?;

    // Try multiple database locations
    let db_path = if let Ok(app_data_dir) = app.path().app_data_dir() {
        let db_in_app_data = app_data_dir.join("storage.sqlite");
        if db_in_app_data.exists() {
            db_in_app_data
        } else {
            // Fallback: use the root storage.sqlite next to the exe
            if let Ok(exe_path) = std::env::current_exe() {
                exe_path.parent().map(|p| p.join("storage.sqlite")).unwrap_or_else(|| std::path::PathBuf::from("storage.sqlite"))
            } else {
                std::path::PathBuf::from("storage.sqlite")
            }
        }
    } else {
        std::path::PathBuf::from("storage.sqlite")
    };
    
    let (mut rx, mut child) = sidecar_command
        .env("DB_PATH", db_path.to_string_lossy().as_ref())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let request = serde_json::json!({
        "id": "req-1",
        "command": "assess_risk",
        "payload": {
            "id": patient_id,
            "apiKey": api_key
        }
    });

    let request_str = request.to_string() + "\n";
    child.write(request_str.as_bytes()).map_err(|e| format!("Failed to write to sidecar: {}", e))?;

    let mut result: Result<RiskAssessment, String> = Err("No response from sidecar".to_string());

    // Wait for response
    // We expect a JSON line on stdout
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                // The sidecar logs other things too (e.g., "Sidecar initialized"). 
                // We need to look for our response id "req-1"
                
                if let Ok(response) = serde_json::from_str::<SidecarResponse>(&line_str) {
                    if response.id == "req-1" {
                        if response.success {
                            if let Some(data) = response.data {
                                result = Ok(data);
                            } else {
                                result = Err("Sidecar returned success but no data".to_string());
                            }
                        } else {
                            result = Err(response.error.unwrap_or_else(|| "Unknown sidecar error".to_string()));
                        }
                        break; // Found our response
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                eprintln!("Sidecar stderr: {}", String::from_utf8_lossy(&line));
            }
            CommandEvent::Error(e) => {
                result = Err(format!("Sidecar communication error: {}", e));
                break;
            }
            CommandEvent::Terminated(payload) => {
                 result = Err(format!("Sidecar terminated unexpectedly with code {:?}", payload.code));
                 break;
            }
            _ => {}
        }
    }
    
    // Close the sidecar
    // child.kill(); // The Drop trait might handle it, or we can explicit kill.
    // In V2, child.kill() is correct.
    let _ = child.kill();

    result
}
