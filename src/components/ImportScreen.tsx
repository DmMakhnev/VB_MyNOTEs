import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, FileAudio, Copy, BookmarkCheck, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { ImportState } from '../types';

interface ImportScreenProps {
  state: ImportState;
  onStateChange: (state: ImportState) => void;
  onOpenInWorkbench: () => void;
}

export const ImportScreen: React.FC<ImportScreenProps> = ({
  state,
  onStateChange,
  onOpenInWorkbench,
}) => {
  const [progress, setProgress] = useState(64);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const importedText =
    'По итогам аудита архитектуры: серверная часть справляется со стримингом без задержек. Предлагаем зафиксировать лимит на размер импортируемого файла в 200 МБ для мобильных сетей.';

  const handleCopy = () => {
    navigator.clipboard?.writeText(importedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      onOpenInWorkbench();
      setSaved(false);
    }, 450);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) {
        onStateChange('B');
      } else {
        onStateChange('G'); // error
      }
    } else {
      onStateChange('B');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) {
        onStateChange('B');
      } else {
        onStateChange('G');
      }
    } else {
      onStateChange('B');
    }
  };

  return (
    <div id="import-screen" className="flex flex-col h-full justify-between p-6 select-none">
      {/* Top Header */}
      <div className="h-10 flex items-center justify-between">
        <h1 className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          Импортировать
        </h1>
        {state === 'B' && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-normal">
            Обработка
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center my-4">
        {/* State A: Dropzone */}
        {state === 'A' && (
          <div className="w-full flex flex-col items-center">
            <div
              id="file-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`w-full py-12 px-6 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center ${
                isDragOver
                  ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-100/80 dark:bg-neutral-800/60 scale-[1.01]'
                  : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/40 hover:border-neutral-400 dark:hover:border-neutral-600'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 mb-4">
                <UploadCloud className="w-7 h-7 stroke-[1.8]" />
              </div>

              <p className="text-base font-normal text-neutral-800 dark:text-neutral-200 mb-6">
                Перетащите файл сюда
              </p>

              <label
                id="select-file-button"
                className="cursor-pointer inline-flex items-center justify-center px-6 h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors shadow-xs"
              >
                <span>Выбрать файл</span>
                <input
                  type="file"
                  accept=".mp3,.wav,.m4a,audio/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>

              <p className="mt-6 text-xs text-neutral-400 dark:text-neutral-500 font-normal">
                mp3, wav, m4a · до 2 часов
              </p>
            </div>
          </div>
        )}

        {/* State B: Processing */}
        {state === 'B' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center text-center px-2"
          >
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
              <FileAudio className="w-8 h-8 stroke-[1.8]" />
            </div>

            <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 truncate max-w-[260px]">
              intervyu_04_09.mp3
            </p>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              14.2 МБ · 24 мин
            </span>

            {/* Progress bar */}
            <div className="w-full max-w-[280px] mt-8 mb-4">
              <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 dark:bg-neutral-100 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-neutral-400 dark:text-neutral-500 mt-2">
                <span>Прогресс</span>
                <span>{progress}%</span>
              </div>
            </div>

            <p className="text-sm text-neutral-600 dark:text-neutral-300 font-normal mt-3">
              Распознаю… обычно около минуты
            </p>

            <button
              type="button"
              onClick={() => onStateChange('V')}
              className="mt-8 text-xs text-neutral-400 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
            >
              (Симуляция: готово)
            </button>
          </motion.div>
        )}

        {/* State V: Ready */}
        {state === 'V' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col h-full justify-between py-2"
          >
            <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 text-left overflow-y-auto max-h-[300px]">
              <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-neutral-200/60 dark:border-neutral-800">
                <FileAudio className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-medium text-neutral-500 truncate">
                  intervyu_04_09.mp3
                </span>
              </div>
              <p className="text-base leading-relaxed text-neutral-800 dark:text-neutral-200 font-normal">
                {importedText}
              </p>
            </div>

            <div className="flex flex-col gap-3 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="copy-import-result-button"
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
                  id="save-import-result-button"
                  type="button"
                  onClick={handleSave}
                  className="h-12 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Сохранено</span>
                    </>
                  ) : (
                    <>
                      <BookmarkCheck className="w-4 h-4 text-neutral-200 dark:text-neutral-700" />
                      <span>Сохранить в заметки</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quiet link «Открыть в верстаке» */}
              <div className="text-center pt-2">
                <button
                  id="open-in-workbench-link"
                  type="button"
                  onClick={onOpenInWorkbench}
                  className="text-sm font-normal text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors py-1.5 px-3 rounded-lg cursor-pointer"
                >
                  Открыть в верстаке
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* State G: Error */}
        {state === 'G' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center text-center px-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-5">
              <AlertTriangle className="w-8 h-8 stroke-[1.8]" />
            </div>

            <p className="text-base font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
              Такой формат не подойдёт — сохраните как mp3
            </p>

            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 max-w-[240px]">
              Поддерживаются аудиоформаты: mp3, wav, m4a
            </p>

            <button
              id="retry-import-button"
              type="button"
              onClick={() => onStateChange('A')}
              className="mt-8 h-12 px-6 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Выбрать другой файл</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Empty bottom balance element */}
      <div className="h-6" />
    </div>
  );
};
