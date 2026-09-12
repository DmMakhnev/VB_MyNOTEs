import { Session } from '../types';

const STORAGE_KEY = 'voicebridge_sessions_v2';
const LAST_SESSION_KEY = 'voicebridge_last_active_session_id';

export const INITIAL_SESSIONS: Session[] = [
  {
    id: 'session-1',
    title: 'План релиза 2.0',
    scenario: 'notes',
    updatedAt: '5 мин назад',
    timestampMs: Date.now() - 5 * 60 * 1000,
    totalDurationSeconds: 142,
    sections: [
      {
        id: 'sec-1',
        timestamp: '00:15',
        text: 'Обсудили план релиза на четверг. Важно проверить синхронизацию заметок и время отклика ИИ.',
        isProtected: true, // Демонстрационный защищенный сегмент
        direction: 'out',
      },
      {
        id: 'sec-2',
        timestamp: '01:05',
        text: 'Дима подготовит финальную сборку к обеду, после чего запускаем закрытое тестирование с фокус-группой.',
        direction: 'out',
        isEdited: true, // Демонстрационный признак 'red' (редактированный)
      },
      {
        id: 'sec-3',
        timestamp: '02:18',
        text: 'Основной фокус: максимальная простота интерфейса и скорость запуска записи в один тап.',
        direction: 'out',
      },
    ],
    resultText:
      '• Четверг: релиз обновления 2.0\n• До обеда: Дима готовит финальную сборку\n• Фокус: простота интерфейса и моментальная запись',
    documents: [
      {
        id: 'doc-1',
        title: 'Резюме релиза (ИИ)',
        type: 'ai_result',
        operation: 'Резюмировать',
        content:
          '• Четверг: релиз обновления 2.0\n• До обеда: Дима готовит финальную сборку\n• Фокус: простота интерфейса и моментальная запись',
        createdAt: 'Сегодня в 10:30',
        wordCount: 18,
      },
      {
        id: 'doc-2',
        title: 'Аудиозапись созвона (исходник)',
        type: 'imported_audio',
        content: 'Аудиофайл релизного синка: 02:22 мин, 3 ключевых сегмента.',
        createdAt: 'Сегодня в 10:15',
        wordCount: 8,
      },
    ],
  },
  {
    id: 'session-2',
    title: 'Интервью с продакт-менеджером',
    scenario: 'import',
    updatedAt: 'Вчера в 15:30',
    timestampMs: Date.now() - 24 * 60 * 60 * 1000,
    totalDurationSeconds: 480,
    audioFileName: 'interview_audio_sep.mp3',
    sections: [
      {
        id: 'sec-201',
        timestamp: '00:00',
        text: 'По итогам аудита архитектуры: распознавание голоса и синхронизация в фоне работают стабильно.',
        direction: 'in', // Импортированный сегмент (входящий поток)
      },
      {
        id: 'sec-202',
        timestamp: '03:40',
        text: 'Пользователи просят возможность дописывать аудиозаписи в существующие сессии и вставлять заметки двойным тапом в нужный абзац.',
        direction: 'in', // Первичное направление 'in' сохраняется
        isEdited: true, // Признак 'red' (редактированный / исправленный)
      },
      {
        id: 'sec-203',
        timestamp: '04:12',
        speaker: 'Вы',
        text: 'Комментарий к интервью: критично реализовать визуальные индикаторы in/out и red для стека постобработки.',
        direction: 'out', // Дозаписанный комментарий пользователя в сессии импорта
      },
    ],
    resultText:
      '• Подтверждена стабильность фонового распознавания\n• Запрос пользователей: дописывание сессий и вставка записей двойным тапом',
    documents: [
      {
        id: 'doc-201',
        title: 'interview_audio_sep.mp3',
        type: 'imported_audio',
        format: 'mp3',
        content: 'Импортированное аудио интервью продакт-менеджера (480 сек).',
        createdAt: 'Вчера в 15:30',
        wordCount: 6,
        fileSize: '4.8 МБ',
      },
      {
        id: 'doc-202',
        title: 'tech_task_brief.docx',
        type: 'imported_text',
        format: 'docx',
        content:
          'Техническое задание на мобильный интерфейс стенограмм. Входящие файлы Word (doc, docx), текстовые файлы (txt) и звуковые дорожки (wav, mp3) импортируются как единые документы сессии с сохранением направления in.',
        createdAt: 'Вчера в 15:20',
        wordCount: 28,
        fileSize: '42 КБ',
      },
    ],
  },
  {
    id: 'session-3',
    title: 'Переговоры с международным партнером',
    scenario: 'translation',
    updatedAt: '3 дня назад',
    timestampMs: Date.now() - 3 * 24 * 60 * 60 * 1000,
    totalDurationSeconds: 210,
    sections: [
      {
        id: 'sec-301',
        timestamp: '00:05',
        speaker: 'Вы',
        language: 'ru',
        text: 'Здравствуйте! Мы хотим обсудить интеграцию голосовых моделей нового поколения.',
        direction: 'out',
      },
      {
        id: 'sec-302',
        timestamp: '00:32',
        speaker: 'Alex',
        language: 'en',
        text: 'Hello! We are ready to demonstrate the new multilingual low-latency API.',
        direction: 'in',
      },
      {
        id: 'sec-303',
        timestamp: '01:15',
        speaker: 'Вы',
        language: 'ru',
        text: 'Отлично, нам критически важна офлайн-буферизация при обрыве связи.',
        direction: 'out',
      },
    ],
    resultText:
      '• Достигнута договоренность о тестировании API с низкой задержкой\n• Ключевое требование: поддержка офлайн-буферизации',
  },
  {
    id: 'session-4',
    title: 'Диалог с голосовым ассистентом',
    scenario: 'dialogue',
    updatedAt: '1 сентября',
    timestampMs: Date.now() - 5 * 24 * 60 * 60 * 1000,
    totalDurationSeconds: 120,
    sections: [
      {
        id: 'sec-401',
        timestamp: '00:05',
        speaker: 'Вы',
        text: 'Какие главные принципы удобного голосового блокнота?',
        direction: 'out',
      },
      {
        id: 'sec-402',
        timestamp: '00:20',
        speaker: 'Ассистент',
        text: 'Главные принципы: постоянная доступность сессии, возможность дополнять её в любой момент и мгновенная озвучка нужного фрагмента.',
        direction: 'in',
      },
    ],
  },
  {
    id: 'session-5',
    title: 'Запись планерки разработки',
    scenario: 'dictaphone',
    updatedAt: '28 августа',
    timestampMs: Date.now() - 8 * 24 * 60 * 60 * 1000,
    totalDurationSeconds: 640,
    sections: [
      {
        id: 'sec-501',
        timestamp: '00:02',
        speaker: 'Тимлид',
        text: 'Синхронизация: переработали верхнюю половину стартового экрана — новая сессия начинается выбором одного из 6 сценариев.',
        direction: 'out',
      },
      {
        id: 'sec-502',
        timestamp: '04:15',
        speaker: 'Разработка',
        text: 'Кнопки отката версии (Undo/Redo) позволяют отматывать изменения как в Word.',
        direction: 'out',
      },
    ],
  },
  {
    id: 'session-6',
    title: 'Деловые фразы на встрече',
    scenario: 'phrasebook',
    updatedAt: '20 августа',
    timestampMs: Date.now() - 14 * 24 * 60 * 60 * 1000,
    totalDurationSeconds: 45,
    sections: [
      {
        id: 'sec-601',
        timestamp: '00:01',
        text: 'Good morning, everyone. Let’s review our agenda for today’s release sprint.',
        direction: 'out',
      },
      {
        id: 'sec-602',
        timestamp: '00:15',
        text: 'Could you please clarify the target delivery timeline for the audio synthesis module?',
        direction: 'out',
      },
      {
        id: 'sec-603',
        timestamp: '00:30',
        text: 'Thank you for your feedback. We will proceed with the proposed implementation.',
        direction: 'out',
      },
    ],
  },
];

export function getStoredSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((sess: Session) => ({
          ...sess,
          sections: (sess.sections || []).map((sec) => ({
            ...sec,
            direction:
              sec.direction ||
              (sess.scenario === 'import' && (!sec.speaker || sec.speaker !== 'Вы')
                ? 'in'
                : sec.speaker === 'Alex' || sec.speaker === 'Ассистент'
                ? 'in'
                : 'out'),
          })),
        }));
      }
    }
  } catch (err) {
    console.error('Error reading sessions from localStorage', err);
  }
  return INITIAL_SESSIONS;
}

export function saveStoredSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving sessions to localStorage', err);
  }
}

export function getLastActiveSessionId(): string {
  try {
    const id = localStorage.getItem(LAST_SESSION_KEY);
    if (id) return id;
  } catch {}
  return 'session-1';
}

export function setLastActiveSessionId(id: string) {
  try {
    localStorage.setItem(LAST_SESSION_KEY, id);
  } catch {}
}
