export interface FontFile {
  path: string;
  file?: File;
  family_name: string;
  subfamily: string;
  weight: number;
  weight_min?: number;
  weight_max?: number;
  is_italic: boolean;
  filename: string;
}

export interface ExternalFontStylesheet {
  url: string;
  css: string;
}

export interface FontFamily {
  name: string;
  fonts: FontFile[];
  external_stylesheet?: ExternalFontStylesheet;
}

export interface ScanResult {
  families: FontFamily[];
  font_count: number;
  folder_name: string;
}

export interface LanguageSample {
  id: string;
  name: string;
  direction: string;
  tester: string;
  poster_md: string;
  is_rtl: boolean;
}

export interface AppSettings {
  default_font_size: number;
  custom_texts: Record<string, string>;
  accent_color: string;
}

export type ViewMode = 'card' | 'list';
export type ThemeMode = 'light' | 'dark';
export type TextAlign = 'left' | 'center' | 'right';
