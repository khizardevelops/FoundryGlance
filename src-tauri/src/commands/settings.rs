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

fn default_font_size() -> f64 {
    28.0
}

fn default_accent_color() -> String {
    "#007aff".to_string()
}

fn default_theme_mode() -> String {
    "system".to_string()
}

/// Every field carries a serde default so a settings.json written by an older
/// build (or a partially hand-edited one) still loads instead of being silently
/// discarded and replaced with defaults.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_font_size")]
    pub default_font_size: f64,
    #[serde(default)]
    pub custom_texts: std::collections::HashMap<String, String>,
    #[serde(default = "default_accent_color")]
    pub accent_color: String,
    /// "light" | "dark" | "system"
    #[serde(default = "default_theme_mode")]
    pub theme_mode: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_font_size: default_font_size(),
            custom_texts: std::collections::HashMap::new(),
            accent_color: default_accent_color(),
            theme_mode: default_theme_mode(),
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
