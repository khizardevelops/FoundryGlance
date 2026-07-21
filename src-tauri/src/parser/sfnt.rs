use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize)]
pub struct FontMetadata {
    pub family_name: String,
    pub subfamily: String,
    pub weight: u16,
    pub is_italic: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct ScannedFont {
    pub path: String,
    pub family_name: String,
    pub subfamily: String,
    pub weight: u16,
    pub is_italic: bool,
    pub filename: String,
}

pub fn parse_font_metadata(bytes: &[u8]) -> Option<FontMetadata> {
    if bytes.len() < 12 {
        return None;
    }

    let num_tables = u16::from_be_bytes([bytes[4], bytes[5]]) as usize;

    let mut name_offset_pos: Option<usize> = None;
    let mut os2_offset_pos: Option<usize> = None;
    let mut head_offset_pos: Option<usize> = None;

    for i in 0..num_tables {
        let entry_base = 12 + i * 16;
        if entry_base + 16 > bytes.len() {
            break;
        }

        if entry_base + 4 > bytes.len() {
            break;
        }
        let tag = &bytes[entry_base..entry_base + 4];

        if tag == b"name" {
            name_offset_pos = Some(entry_base + 8);
        } else if tag == b"OS/2" {
            os2_offset_pos = Some(entry_base + 8);
        } else if tag == b"head" {
            head_offset_pos = Some(entry_base + 8);
        }
    }

    let mut weight: u16 = 400;
    let mut is_italic = false;

    if let Some(pos) = os2_offset_pos {
        if pos + 4 <= bytes.len() {
            let os2_table_start = u32::from_be_bytes([
                bytes[pos],
                bytes[pos + 1],
                bytes[pos + 2],
                bytes[pos + 3],
            ]) as usize;

            if os2_table_start + 6 <= bytes.len() {
                let os_weight =
                    u16::from_be_bytes([bytes[os2_table_start + 4], bytes[os2_table_start + 5]]);
                if (1..=1000).contains(&os_weight) {
                    weight = os_weight;
                }

                if os2_table_start + 64 <= bytes.len() {
                    let fs_selection = u16::from_be_bytes([
                        bytes[os2_table_start + 62],
                        bytes[os2_table_start + 63],
                    ]);
                    is_italic = (fs_selection & 1) != 0;
                }
            }
        }
    }

    if !is_italic {
        if let Some(pos) = head_offset_pos {
            if pos + 4 <= bytes.len() {
                let head_table_start = u32::from_be_bytes([
                    bytes[pos],
                    bytes[pos + 1],
                    bytes[pos + 2],
                    bytes[pos + 3],
                ]) as usize;

                if head_table_start + 46 <= bytes.len() {
                    let mac_style = u16::from_be_bytes([
                        bytes[head_table_start + 44],
                        bytes[head_table_start + 45],
                    ]);
                    is_italic = (mac_style & 2) != 0;
                }
            }
        }
    }

    let names = name_offset_pos.and_then(|pos| parse_name_table(bytes, pos));

    let family_name = names
        .as_ref()
        .and_then(|n| {
            n.get(&16)
                .filter(|s| !s.is_empty())
                .or_else(|| n.get(&1))
                .cloned()
        })
        .unwrap_or_else(|| "Unknown".to_string());

    let subfamily = names
        .as_ref()
        .and_then(|n| {
            n.get(&17)
                .filter(|s| !s.is_empty())
                .or_else(|| n.get(&2))
                .cloned()
        })
        .unwrap_or_else(|| "Regular".to_string());

    if weight == 400 {
        weight = weight_from_subfamily(&subfamily);
    }
    if !is_italic {
        is_italic = italic_from_subfamily(&subfamily);
    }

    Some(FontMetadata {
        family_name,
        subfamily,
        weight,
        is_italic,
    })
}

fn parse_name_table(bytes: &[u8], offset_pos: usize) -> Option<HashMap<u16, String>> {
    if offset_pos + 4 > bytes.len() {
        return None;
    }

    let table_start = u32::from_be_bytes([
        bytes[offset_pos],
        bytes[offset_pos + 1],
        bytes[offset_pos + 2],
        bytes[offset_pos + 3],
    ]) as usize;

    if table_start + 6 > bytes.len() {
        return None;
    }

    let count = u16::from_be_bytes([bytes[table_start + 2], bytes[table_start + 3]]) as usize;
    let string_offset =
        u16::from_be_bytes([bytes[table_start + 4], bytes[table_start + 5]]) as usize;

    let mut result = HashMap::new();

    for i in 0..count {
        let record_base = table_start + 6 + i * 12;
        if record_base + 12 > bytes.len() {
            break;
        }

        let platform_id = u16::from_be_bytes([bytes[record_base], bytes[record_base + 1]]);
        let name_id = u16::from_be_bytes([bytes[record_base + 6], bytes[record_base + 7]]);
        let str_len = u16::from_be_bytes([bytes[record_base + 8], bytes[record_base + 9]]) as usize;
        let off =
            u16::from_be_bytes([bytes[record_base + 10], bytes[record_base + 11]]) as usize;

        let str_start = table_start + string_offset + off;
        let str_end = str_start + str_len;
        if str_end > bytes.len() {
            continue;
        }

        let str_bytes = &bytes[str_start..str_end];
        let decoded = decode_string(str_bytes, platform_id);

        if !decoded.is_empty() && !result.contains_key(&name_id) {
            result.insert(name_id, decoded);
        }
    }

    Some(result)
}

fn decode_string(bytes: &[u8], platform_id: u16) -> String {
    if platform_id == 0 || platform_id == 3 {
        return read_utf16be(bytes);
    }

    bytes
        .iter()
        .filter(|&&b| b > 0)
        .map(|&b| b as char)
        .collect()
}

fn read_utf16be(bytes: &[u8]) -> String {
    if bytes.len() < 2 {
        return String::new();
    }

    let mut chars = Vec::new();
    let mut i = 0;
    while i + 1 < bytes.len() {
        let code = ((bytes[i] as u16) << 8) | (bytes[i + 1] as u16);
        if code != 0 {
            chars.push(char::from_u32(code as u32).unwrap_or('\u{FFFD}'));
        }
        i += 2;
    }
    chars.into_iter().collect()
}

fn weight_from_subfamily(subfamily: &str) -> u16 {
    let lower = subfamily.to_lowercase();
    if lower.contains("thin") && !lower.contains("extra") {
        return 100;
    }
    if lower.contains("hairline") {
        return 100;
    }
    if lower.contains("extra") && lower.contains("light") {
        return 200;
    }
    if lower.contains("ultra") && lower.contains("light") {
        return 200;
    }
    if lower.contains("light") {
        return 300;
    }
    if lower.contains("normal") {
        return 400;
    }
    if lower.contains("regular") {
        return 400;
    }
    if lower.contains("medium") {
        return 500;
    }
    if lower.contains("semi") && lower.contains("bold") {
        return 600;
    }
    if lower.contains("demi") && lower.contains("bold") {
        return 600;
    }
    if lower.contains("extra") && lower.contains("bold") {
        return 800;
    }
    if lower.contains("ultra") && lower.contains("bold") {
        return 800;
    }
    if lower.contains("black") {
        return 900;
    }
    if lower.contains("heavy") {
        return 900;
    }
    if lower.contains("bold") {
        return 700;
    }
    400
}

fn italic_from_subfamily(subfamily: &str) -> bool {
    let lower = subfamily.to_lowercase();
    lower.contains("italic") || lower.contains("oblique")
}
