import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Copy, BookmarkCheck, Play, Pause, WifiOff, Check } from 'lucide-react';
import { DictateState } from '../types';

interface DictateScreenProps {
  state: DictateState;
  onStateChange: (state: DictateState) => void;
  onNavigateToNotes: () => void;
}

export const DictateScreen: React.FC<DictateScreenProps> = ({
  state,
  onStateChange,
  onNavigateToNotes,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sample live speech transcript for state B
  const liveTranscript =
    'Обсудили план релиза на четверг. Важно проверить синхронизацию заметок и время отклика ИИ. Дима подготовит сборку к обеду…';

  // Sample finalized text for state G
  const resultText =
    'Обсудили план релиза на четверг. Важно проверить синхронизацию заметок и время отклика ИИ. Дима подготовит финальную сборку к обеду, после чего запускаем закрытое тестирование.';

  const handleCopy = () => {
    navigator.clipboard?.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      onNavigateToNotes();
      setSaved(false);
    }, 450);
  };

  return (
    <div id="dictate-screen" className="flex flex-col h-full justify-between p-6 select-none">
      {/* Top Status Header */}
      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {state === 'B' && (
            <motion.div
              key="status-listening"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium tracking-wide"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Слушаю</span>
            </motion.div>
          )}

          {state === 'V' && (
            <motion.div
              key="status-offline"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-normal text-center leading-tight shadow-xs"
            >
              <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Нет интернета — запись сохранится, текст появится при связи</span>
            </motion.div>
          )}

          {state === 'G' && (
            <motion.div
              key="status-ready"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-xs font-medium"
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Текст готов</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Middle Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        {/* State A: Idle */}
        {state === 'A' && (
          <div className="flex flex-col items-center justify-center text-center">
            <motion.button
              id="start-dictate-button"
              type="button"
              onClick={() => onStateChange('B')}
              whileTap={{ scale: 0.94 }}
              className="w-28 h-28 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-lg shadow-neutral-900/15 dark:shadow-none hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
              aria-label="Нажмите и говорите"
            >
              <Mic className="w-12 h-12 stroke-[1.8]" />
            </motion.button>
            <p className="mt-8 text-neutral-600 dark:text-neutral-300 text-lg font-normal tracking-tight">
              Нажмите и говорите
            </p>
          </div>
        )}

        {/* State B: Recording */}
        {state === 'B' && (
          <div className="w-full flex flex-col items-center justify-between h-full py-4">
            {/* Live Text Area */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex-1 flex flex-col justify-center px-3"
            >
              <p className="text-xl font-normal leading-relaxed text-neutral-900 dark:text-neutral-100 text-left">
                {liveTranscript}
                <span className="inline-block w-1.5 h-5 ml-1 bg-red-500 animate-pulse align-middle" />
              </p>
            </motion.div>

            {/* Stop Action Button */}
            <div className="flex flex-col items-center text-center mt-6">
              <div className="relative">
                <span className="absolute -inset-2.5 rounded-full bg-red-500/20 animate-ping opacity-60" />
                <motion.button
                  id="stop-dictate-button"
                  type="button"
                  onClick={() => onStateChange('G')}
                  whileTap={{ scale: 0.94 }}
                  className="relative w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 hover:bg-red-700 transition-colors cursor-pointer"
                  aria-label="Закончить запись"
                >
                  <Square className="w-9 h-9 fill-current" />
                </motion.button>
              </div>
              <p className="mt-6 text-neutral-600 dark:text-neutral-400 text-base font-normal">
                Говорите… нажмите, чтобы закончить
              </p>
            </div>
          </div>
        )}

        {/* State V: Offline */}
        {state === 'V' && (
          <div className="flex flex-col items-center justify-center text-center">
            <motion.button
              id="offline-dictate-button"
              type="button"
              onClick={() => onStateChange('B')}
              whileTap={{ scale: 0.94 }}
              className="w-28 h-28 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-lg shadow-neutral-900/15 dark:shadow-none hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
              aria-label="Записать офлайн"
            >
              <Mic className="w-12 h-12 stroke-[1.8]" />
            </motion.button>
            <p className="mt-8 text-neutral-600 dark:text-neutral-300 text-lg font-normal tracking-tight">
              Нажмите и говорите
            </p>
            <span className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
              Запись будет сохранена локально
            </span>
          </div>
        )}

        {/* State G: Result */}
        {state === 'G' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col h-full justify-between py-2"
          >
            {/* Note text card */}
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 text-left overflow-y-auto max-h-[300px]">
              <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200 font-normal">
                {resultText}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 mt-6">
              <button
                id="listen-dictate-result-button"
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-full h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-medium text-base flex items-center justify-center gap-2.5 transition-colors hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>Пауза</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    <span>Прослушать</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  id="copy-dictate-result-button"
                  type="button"
                  onClick={handleCopy}
                  className="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span>Скопировать</span>
                    </>
                  )}
                </button>

                <button
                  id="save-dictate-result-button"
                  type="button"
                  onClick={handleSave}
                  className="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>Сохранено</span>
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span>В заметки</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Quiet Link: «Мои заметки» */}
      <div className="pt-2 pb-1 text-center">
        <button
          id="link-to-notes"
          type="button"
          onClick={onNavigateToNotes}
          className="text-sm font-normal text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors py-2 px-4 rounded-lg cursor-pointer"
        >
          Мои заметки
        </button>
      </div>
    </div>
  );
};
