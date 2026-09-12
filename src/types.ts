export type ScenarioType =
  | 'notes'
  | 'import'
  | 'dictaphone'
  | 'meeting'
  | 'translation'
  | 'dialogue'
  | 'phrasebook';

export type SegmentDirection = 'in' | 'out';

export interface SessionSection {
  id: string;
  timestamp: string; // e.g. "10:24" or duration timestamp
  speaker?: string; // e.g. "Вы", "Собеседник" for translation
  language?: 'ru' | 'en';
  text: string;
  isProtected?: boolean; // Защищённый сегмент (замочек) — не изменять при пост-обработке
  direction?: SegmentDirection; // Направление сегмента: 'out' (пользователь, заметки, запись) или 'in' (импорт, внешнее)
  isEdited?: boolean; // Признак 'red' (редактированный): ручное изменение текста или воздействие сервисов постобработки
}

export interface SessionDocument {
  id: string;
  title: string;
  type: 'main' | 'ai_result' | 'imported_audio' | 'imported_text' | 'custom';
  content: string;
  createdAt: string;
  operation?: string; // e.g. 'Нормализовать', 'Резюмировать', 'Структурировать', 'Перевести'
  wordCount: number;
  format?: 'doc' | 'docx' | 'txt' | 'wav' | 'mp3' | string;
  fileSize?: string;
}

export interface SessionVersionSnapshot {
  id: string;
  label: string;
  timestamp: string;
  sections: SessionSection[];
  resultText?: string;
}

export interface Session {
  id: string;
  title: string;
  scenario: ScenarioType;
  updatedAt: string; // readable date or relative e.g. "Только что", "Вчера в 17:40"
  timestampMs: number;
  sections: SessionSection[];
  resultText?: string;
  lastProcessedOperation?: 'normalize' | 'summarize' | 'structure' | 'translate';
  lastProcessedSectionIds?: string[];
  totalDurationSeconds: number;
  audioFileName?: string;
  documents?: SessionDocument[];
}

export type ScreenMode = 'start' | 'session';

export type SpeechTtsTarget = {
  type: 'all' | 'selection' | 'section';
  sectionId?: string;
  text: string;
};

export type RecordingTarget = {
  mode: 'append' | 'insert';
  insertSectionId?: string;
  insertPositionIndex?: number;
};

// Compatibility types for legacy components
export type ScreenType = 'dictate' | 'import' | 'note';
export type DictateState = 'A' | 'B' | 'V' | 'G';
export type ImportState = 'A' | 'B' | 'V' | 'G';
export type NoteState = 'A' | 'B' | 'V' | 'G';
export type AIService = 'normalize' | 'summarize' | 'structure' | 'translate';
export interface NoteData {
  id: string;
  title: string;
  status: string;
  rawText: string;
  resultText: string;
  duration: number;
  currentTime: number;
}
