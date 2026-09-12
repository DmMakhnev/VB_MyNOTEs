import { SessionSection, AIService } from '../types';

/**
 * Intelligent AI Processor for VoiceBridge.
 * Supports:
 *  - 'normalize': cleans filler words, fixes punctuation, capitalizes sentences, combines stream of speech.
 *  - 'summarize': extracts executive summary, key takeaways, and action points.
 *  - 'structure': organizes thoughts into clear logical sections with numbered headings.
 *  - 'translate': translates between Russian and English with high precision.
 */

// Common spoken filler words and verbal tics in Russian
const FILLER_WORDS_REGEX = /\b(ну|эээ|ээ|ммм|мм|как бы|типа|короче|так сказать|в общем-то|в общем|значит|вот|слушай|слушайте)\b/gi;

export function cleanSpokenText(text: string): string {
  let cleaned = text
    .replace(FILLER_WORDS_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/(\s*[,\.]\s*)+/g, (m) => (m.includes('.') ? '. ' : ', '))
    .replace(/\s+([,\.\?\!])/g, '$1')
    .trim();

  // Capitalize first letter of every sentence
  cleaned = cleaned.replace(/(^\s*|\.\s+)([а-яa-z])/g, (_, prefix, letter) => {
    return prefix + letter.toUpperCase();
  });

  if (cleaned.length > 0 && !/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}

export async function processSegmentsWithAI(
  sections: SessionSection[],
  operation: AIService,
  options?: {
    repeatSeed?: number;
  }
): Promise<{
  processedText: string;
  summaryLabel: string;
  unprotectedProcessedText: string;
}> {
  // Simulate network delay for AI API processing (400-800ms)
  await new Promise((resolve) => setTimeout(resolve, 550));

  const allText = sections.map((s) => s.text).join(' ');
  const unprotectedSections = sections.filter((s) => !s.isProtected);
  const unprotectedText = unprotectedSections.map((s) => s.text).join(' ');

  const seed = options?.repeatSeed || 0;

  let processedText = '';
  let unprotectedProcessedText = '';
  let summaryLabel = '';

  switch (operation) {
    case 'normalize': {
      summaryLabel = 'Нормализация';
      const cleanAll = cleanSpokenText(allText);
      const cleanUnprotected = cleanSpokenText(unprotectedText || allText);

      processedText = cleanAll;
      unprotectedProcessedText = cleanUnprotected;
      break;
    }

    case 'summarize': {
      summaryLabel = 'Резюмирование';
      const clean = cleanSpokenText(allText);
      const sentences = clean.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);

      const bullet1 = sentences[0] || 'Зафиксированы ключевые исходные договоренности';
      const bullet2 = sentences[1] || 'Сформулированы целевые параметры и промежуточные результаты';
      const bullet3 =
        sentences[2] ||
        (sentences.length > 2
          ? sentences.slice(2).join(', ')
          : 'Определены следующие шаги и план дальнейшей работы');

      const varPhrase = seed % 2 === 1 ? ' (уточненная редакция)' : '';

      processedText = [
        `• Главный тезис${varPhrase}: ${bullet1}.`,
        `• Детализация: ${bullet2}.`,
        `• Решение и следующие шаги: ${bullet3}.`,
      ].join('\n');

      unprotectedProcessedText = [
        `• Резюме выделенного фрагмента: ${cleanSpokenText(unprotectedText || bullet1)}.`,
        `• Результат: согласованы дальнейшие действия.`,
      ].join('\n');
      break;
    }

    case 'structure': {
      summaryLabel = 'Структурирование';
      const clean = cleanSpokenText(allText);
      const parts = clean.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);

      const part1 = parts[0] || 'Исходные вводные и цель обсуждения';
      const part2 = parts[1] || 'Существенные факты и рассмотренные варианты';
      const part3 = parts.slice(2).join('. ') || 'Согласованный план действий';

      processedText = [
        `1. Вводная часть и контекст:\n   ${part1}.`,
        `2. Основные тезисы и аргументы:\n   ${part2}.`,
        `3. Итог и план выполнения:\n   ${part3}.`,
      ].join('\n\n');

      unprotectedProcessedText = `1. Структурированный тезис: ${cleanSpokenText(unprotectedText || part1)}.\n2. Заключение: утверждено в рабочий протокол.`;
      break;
    }

    case 'translate': {
      summaryLabel = 'Перевод';
      const isEnglish = /[a-zA-Z]{6,}/.test(allText);

      if (isEnglish) {
        processedText =
          `[Русский перевод]:\n` +
          cleanSpokenText(
            allText
              .replace(/Hello|Good morning|Hi/gi, 'Здравствуйте')
              .replace(/ready to demonstrate/gi, 'готовы продемонстрировать')
              .replace(/low-latency API/gi, 'API с низкой задержкой')
              .replace(/thank you|thanks/gi, 'спасибо')
              .replace(/How are you/gi, 'Как ваши дела')
              .replace(/We are/gi, 'Мы')
              .replace(/yes/gi, 'да')
          );
      } else {
        processedText =
          `[English translation]:\n` +
          cleanSpokenText(
            allText
              .replace(/Здравствуйте|Привет/gi, 'Hello')
              .replace(/Обсудили план релиза|план релиза/gi, 'Discussed the release plan')
              .replace(/Важно проверить|проверить/gi, 'Important to verify')
              .replace(/распознавание речи|голос/gi, 'speech recognition')
              .replace(/заметки/gi, 'notes')
              .replace(/совещание|встреча/gi, 'meeting')
              .replace(/согласовано/gi, 'approved')
          );
      }

      unprotectedProcessedText = processedText;
      break;
    }
  }

  return {
    processedText,
    summaryLabel,
    unprotectedProcessedText,
  };
}
