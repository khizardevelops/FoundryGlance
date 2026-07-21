use std::fs;
use std::path::Path;
use serde::Serialize;
use tauri;

use crate::parser::{self, ScannedFont};

#[derive(Debug, Clone, Serialize)]
pub struct FontFamilyResult {
    pub name: String,
    pub fonts: Vec<ScannedFont>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScanResult {
    pub families: Vec<FontFamilyResult>,
    pub font_count: usize,
    pub folder_name: String,
}

#[tauri::command]
pub fn scan_directory(path: String) -> Result<ScanResult, String> {
    let dir = Path::new(&path);
    if !dir.exists() || !dir.is_dir() {
        return Err("Directory does not exist".to_string());
    }

    let mut font_files = Vec::new();
    scan_recursive(dir, &mut font_files)?;

    // Group by family name
    let mut family_map: std::collections::HashMap<String, Vec<ScannedFont>> =
        std::collections::HashMap::new();

    for font in font_files {
        family_map
            .entry(font.family_name.clone())
            .or_default()
            .push(font);
    }

    let mut families: Vec<FontFamilyResult> = family_map
        .into_iter()
        .map(|(name, fonts)| FontFamilyResult { name, fonts })
        .collect();

    families.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    let font_count: usize = families.iter().map(|f| f.fonts.len()).sum();
    let folder_name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.clone());

    Ok(ScanResult {
        families,
        font_count,
        folder_name,
    })
}

fn scan_recursive(dir: &Path, results: &mut Vec<ScannedFont>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();

        if path.is_dir() {
            scan_recursive(&path, results)?;
        } else if let Some(ext) = path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();
            if ext_lower == "ttf" || ext_lower == "otf" {
                let filename = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                match read_and_parse_font(&path) {
                    Ok(Some(meta)) => {
                        results.push(ScannedFont {
                            path: path.to_string_lossy().to_string(),
                            family_name: meta.family_name,
                            subfamily: meta.subfamily,
                            weight: meta.weight,
                            is_italic: meta.is_italic,
                            filename,
                        });
                    }
                    Ok(None) => {}
                    Err(_) => {}
                }
            }
        }
    }

    Ok(())
}

fn read_and_parse_font(
    path: &Path,
) -> Result<Option<parser::FontMetadata>, String> {
    let file = fs::File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let metadata = file
        .metadata()
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    let file_size = metadata.len();

    let read_size = std::cmp::min(file_size, 131072) as usize;
    use std::io::Read;
    let mut file = file;
    let mut buffer = vec![0u8; read_size];
    file.read_exact(&mut buffer)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    Ok(parser::parse_font_metadata(&buffer))
}

#[tauri::command]
pub fn read_font_bytes(path: String) -> Result<Vec<u8>, String> {
    fs::read(&path).map_err(|e| format!("Failed to read font file: {}", e))
}
