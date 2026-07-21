use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri;

fn settings_path() -> PathBuf {
    let mut path = dirs_next::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("foundryglance");
    path.push("settings.json");
    path
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub default_font_size: f64,
    pub custom_texts: std::collections::HashMap<String, String>,
    pub accent_color: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_font_size: 28.0,
            custom_texts: std::collections::HashMap::new(),
            accent_color: "#007aff".to_string(),
        }
    }
}

#[tauri::command]
pub fn load_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        match fs::read_to_string(&path) {
            Ok(content) => {
                if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
                    return settings;
                }
            }
            Err(_) => {}
        }
    }
    AppSettings::default()
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let content =
        serde_json::to_string_pretty(&settings).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
pub fn reset_settings() -> Result<(), String> {
    save_settings(AppSettings::default())
}
