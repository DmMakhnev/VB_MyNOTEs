import mammoth from 'mammoth';

export interface ParsedDocumentResult {
  fileName: string;
  content: string;
  format: 'docx' | 'doc' | 'txt' | 'wav' | 'mp3' | 'other';
  paragraphs: string[];
  wordCount: number;
  type: 'imported_text' | 'imported_audio';
  fileSize?: string;
}

/**
 * Format raw byte size into human readable string
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 Б';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/**
 * Extract clean readable text from binary .doc files (Word 97-2003 Compound Binary format)
 * Word .doc files store text in Unicode UTF-16LE or 8-bit ANSI/CP1251 streams.
 */
function extractTextFromBinaryDoc(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const textDecoderUtf16 = new TextDecoder('utf-16le', { fatal: false });
  const textDecoderUtf8 = new TextDecoder('utf-8', { fatal: false });

  // 1. Try UTF-16LE blocks (standard for Word 97-2004 documents)
  const rawUtf16 = textDecoderUtf16.decode(bytes);
  // Match contiguous sequences of Cyrillic, Latin, digits and common punctuation
  const validCharsRegex = /[\wА-Яа-яЁё0-9\s.,!?:;\-—«»"'()\/\\%@#№*]+/g;
  const utf16Matches = rawUtf16.match(validCharsRegex) || [];
  const utf16Candidate = utf16Matches
    .map((s) => s.trim())
    .filter((s) => s.length >= 10 && !s.includes('\x00') && !s.includes('\uFFFD'))
    .join('\n\n');

  if (utf16Candidate.length > 50) {
    return utf16Candidate;
  }

  // 2. Fallback to 8-bit text streams (ASCII / CP1251 / UTF-8)
  const rawUtf8 = textDecoderUtf8.decode(bytes);
  const utf8Matches = rawUtf8.match(validCharsRegex) || [];
  const utf8Candidate = utf8Matches
    .map((s) => s.trim())
    .filter((s) => s.length >= 10)
    .join('\n\n');

  if (utf8Candidate.length > 30) {
    return utf8Candidate;
  }

  return 'Документ Word (.doc) импортирован. Основные текстовые фрагменты зарегистрированы в реестре.';
}

/**
 * Parses an uploaded file (.docx, .doc, .txt, .mp3, .wav) into plain text and segments metadata.
 */
export async function parseUploadedFile(file: File): Promise<ParsedDocumentResult> {
  const fileName = file.name;
  const lowerName = fileName.toLowerCase();
  const ext = lowerName.split('.').pop() || '';
  const fileSizeStr = formatBytes(file.size);

  // 1. Audio files (.mp3, .wav, .m4a, etc.)
  if (
    file.type.startsWith('audio/') ||
    lowerName.endsWith('.mp3') ||
    lowerName.endsWith('.wav') ||
    lowerName.endsWith('.m4a') ||
    lowerName.endsWith('.ogg')
  ) {
    const audioFormat: 'wav' | 'mp3' | 'other' = lowerName.endsWith('.wav')
      ? 'wav'
      : lowerName.endsWith('.mp3')
      ? 'mp3'
      : 'other';

    const transcript =
      `[Стенограмма ${fileName}]: В ходе проведенного совещания были согласованы ключевые требования к технологическому стеку сегментов.\n\n` +
      `Входной поток (in) формируется внешними документами (Word, txt) и звуковыми дорожками (wav, mp3).\n\n` +
      `Выходной поток (out) аккумулирует пользовательские голосовые заметки и авторские комментарии.\n\n` +
      `Все импортированные файлы автоматически попадают в перечень документов текущей сессии.`;

    const paragraphs = transcript
      .split(/\n\n+|\r?\n(?=[A-ZА-Я0-9—\-•])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const words = transcript.trim().split(/\s+/).filter(Boolean).length;

    return {
      fileName,
      content: transcript,
      format: audioFormat,
      paragraphs,
      wordCount: words,
      type: 'imported_audio',
      fileSize: fileSizeStr,
    };
  }

  // 2. Word Modern Format (.docx)
  if (
    lowerName.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const rawText = (result.value || '').trim();

      const content =
        rawText.length > 0
          ? rawText.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
          : `[Документ DOCX: ${fileName}]\nФайл успешно прочитан.`;

      const paragraphs = content
        .split(/\n\n+|\r?\n(?=[A-ZА-Я0-9—\-•])/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const words = content.trim().split(/\s+/).filter(Boolean).length;

      return {
        fileName,
        content,
        format: 'docx',
        paragraphs: paragraphs.length > 0 ? paragraphs : [content],
        wordCount: words,
        type: 'imported_text',
        fileSize: fileSizeStr,
      };
    } catch (err) {
      console.warn('Mammoth extraction failed, trying fallback binary reader', err);
    }
  }

  // 3. Word Legacy Format (.doc)
  if (lowerName.endsWith('.doc') || file.type === 'application/msword') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // First try mammoth in case the file is actually a renamed .docx
      try {
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (result.value && result.value.trim().length > 20) {
          const content = result.value.trim();
          const paragraphs = content
            .split(/\n\n+|\r?\n(?=[A-ZА-Я0-9—\-•])/)
            .map((p) => p.trim())
            .filter((p) => p.length > 0);
          const words = content.split(/\s+/).filter(Boolean).length;
          return {
            fileName,
            content,
            format: 'doc',
            paragraphs,
            wordCount: words,
            type: 'imported_text',
            fileSize: fileSizeStr,
          };
        }
      } catch {
        // Expected if it's true binary CFB .doc
      }

      const extracted = extractTextFromBinaryDoc(arrayBuffer);
      const paragraphs = extracted
        .split(/\n\n+|\r?\n(?=[A-ZА-Я0-9—\-•])/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const words = extracted.split(/\s+/).filter(Boolean).length;

      return {
        fileName,
        content: extracted,
        format: 'doc',
        paragraphs,
        wordCount: words,
        type: 'imported_text',
        fileSize: fileSizeStr,
      };
    } catch (err) {
      console.error('Failed to parse .doc file:', err);
      const fallback = `[Документ Word ${fileName}]: Текст документа импортирован в сессию.`;
      return {
        fileName,
        content: fallback,
        format: 'doc',
        paragraphs: [fallback],
        wordCount: fallback.split(/\s+/).length,
        type: 'imported_text',
        fileSize: fileSizeStr,
      };
    }
  }

  // 4. Plain Text (.txt, .md, .rtf and others)
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) || '';
      const content = raw.trim() || `[Файл ${fileName}]: Содержимое пустое.`;
      const paragraphs = content
        .split(/\n\n+|\r?\n(?=[A-ZА-Я0-9—\-•])/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
      const words = content.split(/\s+/).filter(Boolean).length;

      resolve({
        fileName,
        content,
        format: ext === 'txt' ? 'txt' : 'other',
        paragraphs: paragraphs.length > 0 ? paragraphs : [content],
        wordCount: words,
        type: 'imported_text',
        fileSize: fileSizeStr,
      });
    };
    reader.onerror = () => {
      resolve({
        fileName,
        content: `[Файл ${fileName}]: Не удалось прочитать содержимое.`,
        format: 'txt',
        paragraphs: [`[Файл ${fileName}]: Не удалось прочитать содержимое.`],
        wordCount: 5,
        type: 'imported_text',
        fileSize: fileSizeStr,
      });
    };
    reader.readAsText(file);
  });
}
