use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri;

/// Newest-first cap. Keeps the file small and bounded without needing pruning UI.
const MAX_ENTRIES: usize = 200;

fn history_path() -> PathBuf {
    let mut path = dirs_next::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("foundryglance");
    path.push("history.json");
    path
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportHistoryEntry {
    pub id: String,
    /// Unix epoch milliseconds, stamped by the frontend at import time.
    pub imported_at: i64,
    pub sources: Vec<String>,
    pub families: Vec<String>,
    pub font_count: u32,
    pub label: String,
}

#[tauri::command]
pub fn load_history() -> Vec<ImportHistoryEntry> {
    let path = history_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(entries) = serde_json::from_str::<Vec<ImportHistoryEntry>>(&content) {
                return entries;
            }
        }
    }
    Vec::new()
}

#[tauri::command]
pub fn save_history(entries: Vec<ImportHistoryEntry>) -> Result<(), String> {
    let path = history_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
    }

    let mut entries = entries;
    entries.truncate(MAX_ENTRIES);

    let content = serde_json::to_string_pretty(&entries)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Failed to write history: {}", e))
}

#[tauri::command]
pub fn clear_history() -> Result<(), String> {
    save_history(Vec::new())
}
