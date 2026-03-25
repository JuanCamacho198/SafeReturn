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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_setting,
            load_setting,
            delete_setting
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
