import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  Sparkles,
  Volume2,
  Check,
  RotateCcw,
  Headphones,
  Mic,
  ChevronRight,
} from 'lucide-react';
import { NoteState, AIService } from '../types';

interface NoteScreenProps {
  state: NoteState;
  onStateChange: (state: NoteState) => void;
}

export const NoteScreen: React.FC<NoteScreenProps> = ({ state, onStateChange }) => {
  // Tab: 'text' or 'result'
  const activeTab = state === 'B' ? 'result' : 'text';

  // Player mode: 'record' (Запись) or 'tts' (Озвучка)
  // State V -> 'tts' playing; State G -> 'record' playing
  const [playerMode, setPlayerMode] = useState<'record' | 'tts'>(
    state === 'G' ? 'record' : 'tts'
  );

  const [isPlaying, setIsPlaying] = useState(state === 'V' || state === 'G');
  const [playbackTime, setPlaybackTime] = useState(38);
  const totalDuration = 142; // 2:22

  const [noteTitle, setNoteTitle] = useState('План релиза 2.0');
  const [mainText, setMainText] = useState(
    'Обсудили план релиза на четверг. Важно проверить синхронизацию заметок и время отклика ИИ. Дима подготовит финальную сборку к обеду, после чего запускаем закрытое тестирование с фокус-группой.\n\nОсновной фокус: максимальная простота и скорость одного тапа.'
  );

  const [resultText, setResultText] = useState(
    '• Четверг: релиз обновления\n• До обеда: Дима готовит финальную сборку\n• Задача: проверить синхронизацию и скорость ИИ\n• Этап: запуск закрытого теста с фокус-группой'
  );

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [activeAiService, setActiveAiService] = useState<AIService | null>(null);
  const [replacedSuccess, setReplacedSuccess] = useState(false);

  // Sync state changes with player and tabs
  useEffect(() => {
    if (state === 'V') {
      setPlayerMode('tts');
      setIsPlaying(true);
    } else if (state === 'G') {
      setPlayerMode('record');
      setIsPlaying(true);
    }
  }, [state]);

  const handleTabChange = (tab: 'text' | 'result') => {
    if (tab === 'result') {
      onStateChange('B');
    } else {
      onStateChange('A');
    }
  };

  const handleApplyAIService = (service: AIService) => {
    setActiveAiService(service);
    setIsAiProcessing(true);

    setTimeout(() => {
      if (service === 'summarize') {
        setResultText(
          '• Четверг: релиз обновления\n• До обеда: сборка от Димы\n• Главное: тест синхронизации и фокус-группа'
        );
      } else if (service === 'normalize') {
        setResultText(
          'Обсудили график релиза на четверг. Необходимо проверить синхронизацию заметок и время отклика модели. Финальная сборка будет готова к 13:00, далее начнется закрытое тестирование.'
        );
      } else if (service === 'structure') {
        setResultText(
          '1. Сроки: четверг\n2. Ответственный: Дима (сборка к обеду)\n3. Приоритет: скорость ИИ и синхронизация\n4. Следующий шаг: закрытое тестирование'
        );
      } else if (service === 'translate') {
        setResultText(
          'We discussed the Thursday release plan. Key priority is to verify note sync and AI latency. Dima will prepare the final build by noon, followed by closed beta testing.'
        );
      }
      setIsAiProcessing(false);
      onStateChange('B');
    }, 600);
  };

  const handleReplaceWithResult = () => {
    setMainText(resultText);
    setReplacedSuccess(true);
    setTimeout(() => {
      setReplacedSuccess(false);
      onStateChange('A');
    }, 500);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Selected highlight snippet for states V and G
  const highlightedSnippet = 'Дима подготовит финальную сборку к обеду';

  return (
    <div id="note-screen" className="flex flex-col h-full justify-between select-none relative">
      {/* Top Header: Note Title and Status */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-neutral-200/50 dark:border-neutral-800/60">
        <div className="flex-1 min-w-0 pr-3">
          <input
            id="note-title-input"
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="w-full bg-transparent font-medium text-base text-neutral-900 dark:text-neutral-100 focus:outline-none truncate"
            placeholder="Без названия"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-normal">
            Сохранено
          </span>
        </div>
      </div>

      {/* Tabs: «Текст | Результат» */}
      <div className="px-5 pt-2.5 pb-1">
        <div className="p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 flex items-center">
          <button
            id="tab-text"
            type="button"
            onClick={() => handleTabChange('text')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
              activeTab === 'text'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Текст
          </button>
          <button
            id="tab-result"
            type="button"
            onClick={() => handleTabChange('result')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeTab === 'result'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span>Результат</span>
            {isAiProcessing && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Quick AI Services chips */}
      <div className="px-5 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleApplyAIService('normalize')}
          className="shrink-0 h-7 px-2.5 rounded-lg bg-neutral-100/90 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-normal transition-colors cursor-pointer"
        >
          Нормализовать
        </button>
        <button
          type="button"
          onClick={() => handleApplyAIService('summarize')}
          className="shrink-0 h-7 px-2.5 rounded-lg bg-neutral-100/90 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-normal transition-colors cursor-pointer"
        >
          Резюмировать
        </button>
        <button
          type="button"
          onClick={() => handleApplyAIService('structure')}
          className="shrink-0 h-7 px-2.5 rounded-lg bg-neutral-100/90 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-normal transition-colors cursor-pointer"
        >
          Структурировать
        </button>
        <button
          type="button"
          onClick={() => handleApplyAIService('translate')}
          className="shrink-0 h-7 px-2.5 rounded-lg bg-neutral-100/90 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-normal transition-colors cursor-pointer"
        >
          Перевести
        </button>
      </div>

      {/* Main content body: ONE field full screen height */}
      <div className="flex-1 px-5 py-1 relative flex flex-col min-h-0">
        {/* Tab: Текст (States A, V, G) */}
        {activeTab === 'text' && (
          <div className="w-full h-full flex flex-col relative">
            {/* If in state V or G (Selection active) */}
            {state === 'V' || state === 'G' ? (
              <div className="w-full h-full flex flex-col relative">
                {/* Floating "Прослушать выделенное" button */}
                <div className="mb-2 flex items-center justify-between">
                  <motion.button
                    id="listen-selection-button"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="h-8 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-medium flex items-center gap-1.5 shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Прослушать выделенное</span>
                  </motion.button>

                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                    {state === 'V' ? 'Режим: Озвучка' : 'Режим: Запись'}
                  </span>
                </div>

                {/* Render text with visual selection */}
                <div
                  id="note-text-highlighted"
                  className="w-full flex-1 p-3 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-800 dark:text-neutral-200 text-base leading-relaxed overflow-y-auto"
                >
                  <span>Обсудили план релиза на четверг. Важно проверить синхронизацию заметок и время отклика ИИ. </span>
                  <mark className="bg-amber-200/90 dark:bg-amber-400/30 text-neutral-950 dark:text-amber-100 px-1 py-0.5 rounded font-medium inline">
                    {highlightedSnippet}
                  </mark>
                  <span>, после чего запускаем закрытое тестирование с фокус-группой.</span>
                  <br /><br />
                  <span>Основной фокус: максимальная простота и скорость одного тапа.</span>
                </div>
              </div>
            ) : (
              /* State A: Normal editable single text field */
              <textarea
                id="main-note-textarea"
                value={mainText}
                onChange={(e) => setMainText(e.target.value)}
                placeholder="Текст вашей заметки…"
                className="w-full h-full resize-none p-3 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-900 dark:text-neutral-100 text-base leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
              />
            )}
          </div>
        )}

        {/* Tab: Результат (State B) */}
        {activeTab === 'result' && (
          <div className="w-full h-full flex flex-col justify-between">
            <textarea
              id="result-note-textarea"
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              placeholder="Результат обработки ИИ появится здесь…"
              className="w-full flex-1 resize-none p-3 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/40 text-neutral-900 dark:text-neutral-100 text-base leading-relaxed focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
            />

            <div className="py-2">
              <button
                id="replace-text-with-result-button"
                type="button"
                onClick={handleReplaceWithResult}
                className="w-full h-11 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {replacedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Текст заменён</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Заменить текст результатом</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Player: doesn't cover text */}
      <div
        id="sticky-bottom-player"
        className="mx-4 mb-2 mt-1 p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Play/Pause Button */}
          <button
            id="player-play-pause-button"
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
            aria-label={isPlaying ? 'Пауза' : 'Играть'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Mode Switcher: «Запись | Озвучка» */}
          <div className="flex items-center p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs shrink-0">
            <button
              id="player-mode-record"
              type="button"
              onClick={() => {
                setPlayerMode('record');
                if (state === 'V') onStateChange('G');
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                playerMode === 'record'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Запись
            </button>
            <button
              id="player-mode-tts"
              type="button"
              onClick={() => {
                setPlayerMode('tts');
                if (state === 'G') onStateChange('V');
              }}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                playerMode === 'tts'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              Озвучка
            </button>
          </div>

          {/* Timestamps */}
          <div className="text-right text-[11px] text-neutral-400 dark:text-neutral-500 font-mono shrink-0">
            {formatTime(playbackTime)} / {formatTime(totalDuration)}
          </div>
        </div>

        {/* Progress scrub bar */}
        <div className="mt-2.5 px-0.5">
          <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden cursor-pointer">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                isPlaying ? 'bg-neutral-900 dark:bg-neutral-100' : 'bg-neutral-500 dark:bg-neutral-400'
              }`}
              style={{ width: `${(playbackTime / totalDuration) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
