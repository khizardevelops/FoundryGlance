import type { FontFamily, FontFile, ScanResult } from '$lib/types';

type FontMetadata = {
  family_name: string;
  subfamily: string;
  weight: number;
  is_italic: boolean;
};

export async function scanBrowserFontFiles(files: Iterable<File>, fallbackName = 'Selected fonts'): Promise<ScanResult> {
  const fontFiles = Array.from(files).filter((file) => /\.(ttf|otf)$/i.test(file.name));
  const scanned: FontFile[] = [];

  for (const file of fontFiles) {
    const bytes = new Uint8Array(await file.slice(0, 131072).arrayBuffer());
    const meta = parseFontMetadata(bytes);
    if (!meta) continue;

    scanned.push({
      path: `browser:${file.webkitRelativePath || file.name}`,
      file,
      filename: file.name,
      ...meta,
    });
  }

  const familyMap = new Map<string, FontFile[]>();
  for (const font of scanned) {
    const fonts = familyMap.get(font.family_name) ?? [];
    fonts.push(font);
    familyMap.set(font.family_name, fonts);
  }

  const families: FontFamily[] = Array.from(familyMap, ([name, fonts]) => ({ name, fonts }))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  return {
    families,
    font_count: scanned.length,
    folder_name: folderName(fontFiles[0], fallbackName),
  };
}

export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(dataTransfer.items)
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean) as FileSystemEntry[];

  if (!entries.length) return Array.from(dataTransfer.files);

  const files = await Promise.all(entries.map(readEntry));
  return files.flat();
}

function folderName(file: File | undefined, fallback: string): string {
  const relativePath = file?.webkitRelativePath;
  if (!relativePath) return fallback;
  return relativePath.split('/')[0] || fallback;
}

async function readEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FileSystemFileEntry).file((file) => resolve([file]), () => resolve([]));
    });
  }

  if (!entry.isDirectory) return [];

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const entries = await readAllDirectoryEntries(reader);
  const files = await Promise.all(entries.map(readEntry));
  return files.flat();
}

function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];

  return new Promise((resolve) => {
    const read = () => {
      reader.readEntries((entries) => {
        if (!entries.length) {
          resolve(all);
          return;
        }
        all.push(...entries);
        read();
      }, () => resolve(all));
    };
    read();
  });
}

function parseFontMetadata(bytes: Uint8Array): FontMetadata | null {
  if (bytes.length < 12) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const numTables = view.getUint16(4);
  const tables = new Map<string, number>();

  for (let i = 0; i < numTables; i += 1) {
    const entryBase = 12 + i * 16;
    if (entryBase + 16 > bytes.length) break;

    const tag = String.fromCharCode(...bytes.slice(entryBase, entryBase + 4));
    tables.set(tag, view.getUint32(entryBase + 8));
  }

  const names = parseNameTable(bytes, tables.get('name'));
  let weight = parseWeight(bytes, tables.get('OS/2')) ?? 400;
  let isItalic = parseOs2Italic(bytes, tables.get('OS/2')) || parseHeadItalic(bytes, tables.get('head'));

  const familyName = names.get(16) || names.get(1) || 'Unknown';
  const subfamily = names.get(17) || names.get(2) || 'Regular';

  if (weight === 400) weight = weightFromSubfamily(subfamily);
  if (!isItalic) isItalic = italicFromSubfamily(subfamily);

  return {
    family_name: familyName,
    subfamily,
    weight,
    is_italic: isItalic,
  };
}

function parseNameTable(bytes: Uint8Array, tableStart: number | undefined): Map<number, string> {
  const result = new Map<number, string>();
  if (tableStart === undefined || tableStart + 6 > bytes.length) return result;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(tableStart + 2);
  const stringOffset = view.getUint16(tableStart + 4);

  for (let i = 0; i < count; i += 1) {
    const recordBase = tableStart + 6 + i * 12;
    if (recordBase + 12 > bytes.length) break;

    const platformId = view.getUint16(recordBase);
    const nameId = view.getUint16(recordBase + 6);
    const length = view.getUint16(recordBase + 8);
    const offset = view.getUint16(recordBase + 10);
    const start = tableStart + stringOffset + offset;
    const end = start + length;
    if (end > bytes.length || result.has(nameId)) continue;

    const decoded = decodeName(bytes.slice(start, end), platformId);
    if (decoded) result.set(nameId, decoded);
  }

  return result;
}

function decodeName(bytes: Uint8Array, platformId: number): string {
  if (platformId === 0 || platformId === 3) {
    const codes: number[] = [];
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const code = (bytes[i] << 8) | bytes[i + 1];
      if (code) codes.push(code);
    }
    return String.fromCharCode(...codes);
  }

  return Array.from(bytes)
    .filter((byte) => byte > 0)
    .map((byte) => String.fromCharCode(byte))
    .join('');
}

function parseWeight(bytes: Uint8Array, tableStart: number | undefined): number | null {
  if (tableStart === undefined || tableStart + 6 > bytes.length) return null;
  const weight = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(tableStart + 4);
  return weight >= 1 && weight <= 1000 ? weight : null;
}

function parseOs2Italic(bytes: Uint8Array, tableStart: number | undefined): boolean {
  if (tableStart === undefined || tableStart + 64 > bytes.length) return false;
  return (new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(tableStart + 62) & 1) !== 0;
}

function parseHeadItalic(bytes: Uint8Array, tableStart: number | undefined): boolean {
  if (tableStart === undefined || tableStart + 46 > bytes.length) return false;
  return (new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(tableStart + 44) & 2) !== 0;
}

function weightFromSubfamily(subfamily: string): number {
  const lower = subfamily.toLowerCase();
  if ((lower.includes('thin') && !lower.includes('extra')) || lower.includes('hairline')) return 100;
  if ((lower.includes('extra') || lower.includes('ultra')) && lower.includes('light')) return 200;
  if (lower.includes('light')) return 300;
  if (lower.includes('normal') || lower.includes('regular')) return 400;
  if (lower.includes('medium')) return 500;
  if ((lower.includes('semi') || lower.includes('demi')) && lower.includes('bold')) return 600;
  if ((lower.includes('extra') || lower.includes('ultra')) && lower.includes('bold')) return 800;
  if (lower.includes('black') || lower.includes('heavy')) return 900;
  if (lower.includes('bold')) return 700;
  return 400;
}

function italicFromSubfamily(subfamily: string): boolean {
  const lower = subfamily.toLowerCase();
  return lower.includes('italic') || lower.includes('oblique');
}
