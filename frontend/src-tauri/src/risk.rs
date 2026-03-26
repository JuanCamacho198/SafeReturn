use serde::{Deserialize, Serialize};
use std::path::PathBuf;
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

fn is_windows_not_found_error(message: &str) -> bool {
    let lower = message.to_ascii_lowercase();
    lower.contains("os error 2")
        || lower.contains("cannot find the file specified")
        || lower.contains("no se puede encontrar el archivo especificado")
}

fn candidate_sidecar_paths() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("src-tauri").join("bin").join("backend-sidecar.exe"));
        candidates.push(
            cwd.join("src-tauri")
                .join("binaries")
                .join("backend-sidecar-x86_64-pc-windows-msvc.exe"),
        );
        candidates.push(cwd.join("bin").join("backend-sidecar.exe"));
        candidates.push(
            cwd.join("binaries")
                .join("backend-sidecar-x86_64-pc-windows-msvc.exe"),
        );
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("backend-sidecar.exe"));
            candidates.push(exe_dir.join("bin").join("backend-sidecar.exe"));
        }
    }

    candidates
}

fn sidecar_not_found_error(candidates: &[PathBuf]) -> String {
    let checked_paths = candidates
        .iter()
        .map(|path| path.display().to_string())
        .collect::<Vec<_>>()
        .join(" | ");

    format!(
        "SIDECAR_NOT_FOUND: No se encontro el servicio local de IA (backend-sidecar.exe). Rutas revisadas: [{}]. Ejecuta: cd backend && bun run build:sidecar:tauri-win",
        checked_paths
    )
}

/// Call the sidecar to assess risk
pub async fn assess_risk_with_sidecar(
    app: tauri::AppHandle,
    patient_id: String,
    api_key: Option<String>,
    locale: Option<String>,
) -> Result<RiskAssessment, String> {
    let sidecar_command: Command = app
        .shell()
        .sidecar("backend-sidecar")
        .map_err(|e| format!("Failed to resolve sidecar declaration: {}", e))?;

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
    
    // Find schema.sql path
    let schema_path = {
        let mut path = PathBuf::from("schema.sql");
        
        // 1. Check resource directory (Production / Bundled)
        if let Ok(resource_dir) = app.path().resource_dir() {
            let p = resource_dir.join("schema.sql");
            if p.exists() {
                path = p;
            } else {
                 // Try looking inside a 'resources' subdirectory if flattened logic is different
                 let p2 = resource_dir.join("resources").join("schema.sql");
                 if p2.exists() {
                     path = p2;
                 }
            }
        }
        
        // 2. Fallback: Check relative to executable (Dev / Manual Copy)
        if !path.exists() {
            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_dir) = exe_path.parent() {
                    let p = exe_dir.join("schema.sql");
                    if p.exists() {
                        path = p;
                    } else {
                         // Check bin/schema.sql
                         let p_bin = exe_dir.join("bin").join("schema.sql");
                         if p_bin.exists() {
                             path = p_bin;
                         } else {
                             // Check binaries/schema.sql
                             let p_binaries = exe_dir.join("binaries").join("schema.sql");
                             if p_binaries.exists() {
                                 path = p_binaries;
                             }
                         }
                    }
                }
            }
        }
        
        // 3. Last resort: current dir (Development running from root)
        if !path.exists() {
             if let Ok(cwd) = std::env::current_dir() {
                 let p = cwd.join("src-tauri").join("bin").join("schema.sql");
                 if p.exists() {
                     path = p;
                 } else {
                     // Development mode: also check project root structure
                     let p_root = cwd.join("backend").join("db").join("schema.sql");
                     if p_root.exists() {
                         path = p_root;
                     } else {
                         // Check relative to src-tauri (for tauri dev scenarios)
                         let p_tauri = cwd.join("src-tauri").join("binaries").join("schema.sql");
                         if p_tauri.exists() {
                             path = p_tauri;
                         }
                     }
                 }
             }
        }
        
        path
    };

    let (mut rx, mut child) = match sidecar_command
        .env("DB_PATH", db_path.to_string_lossy().as_ref())
        .env("SCHEMA_PATH", schema_path.to_string_lossy().as_ref())
        .spawn()
    {
        Ok(process) => process,
        Err(primary_error) => {
            let primary_error_msg = primary_error.to_string();
            if is_windows_not_found_error(&primary_error_msg) {
                let candidates = candidate_sidecar_paths();

                if let Some(found_path) = candidates.iter().find(|path| path.exists()) {
                    app.shell()
                        .command(found_path.to_string_lossy().as_ref())
                        .env("DB_PATH", db_path.to_string_lossy().as_ref())
                        .env("SCHEMA_PATH", schema_path.to_string_lossy().as_ref())
                        .spawn()
                        .map_err(|fallback_error| {
                            format!(
                                "Failed to spawn fallback sidecar at {}: {}",
                                found_path.display(),
                                fallback_error
                            )
                        })?
                } else {
                    return Err(sidecar_not_found_error(&candidates));
                }
            } else {
                return Err(format!("Failed to spawn sidecar: {}", primary_error_msg));
            }
        }
    };

    let request = serde_json::json!({
        "id": "req-1",
        "command": "assess_risk",
        "payload": {
            "id": patient_id,
            "apiKey": api_key,
            "locale": locale
        }
    });

    let request_str = request.to_string() + "\n";
    child.write(request_str.as_bytes()).map_err(|e| format!("Failed to write to sidecar: {}", e))?;

    let mut result: Result<RiskAssessment, String> = Err("No response from sidecar".to_string());
    let mut stderr_buffer = String::new();

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
                let text = String::from_utf8_lossy(&line);
                eprintln!("Sidecar stderr: {}", text);
                stderr_buffer.push_str(&text);
            }
            CommandEvent::Error(e) => {
                result = Err(format!("Sidecar communication error: {}", e));
                break;
            }
            CommandEvent::Terminated(payload) => {
                 let code = payload.code.unwrap_or(-1);
                 let stderr_lower = stderr_buffer.to_ascii_lowercase();
                 
                 if stderr_lower.contains("schema.sql") && (stderr_lower.contains("enoent") || stderr_lower.contains("not found")) {
                     result = Err(format!("No se encontró schema.sql del sidecar. Asegúrate de que el archivo existe en resources o junto al ejecutable. Error original: {}", stderr_buffer));
                 } else {
                     result = Err(format!("Sidecar terminated unexpectedly with code {}. Stderr: {}", code, stderr_buffer));
                 }
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
