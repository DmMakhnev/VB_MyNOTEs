import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  FileAudio,
  Languages,
  MessageSquare,
  AudioLines,
  BookOpen,
  ChevronRight,
  Edit2,
  Check,
  Trash2,
  ArrowRight,
  Folder,
  Clock,
  FileText,
} from 'lucide-react';
import { Session, ScenarioType } from '../types';

interface StartScreenProps {
  sessions: Session[];
  lastActiveSessionId: string;
  onOpenSession: (
    sessionId: string,
    tab?: 'main_text' | 'ai_result' | 'documents'
  ) => void;
  onCreateNewSession: (scenario: ScenarioType, customTitle?: string) => void;
  onUpdateSessionTitle: (sessionId: string, newTitle: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  sessions,
  lastActiveSessionId,
  onOpenSession,
  onCreateNewSession,
  onUpdateSessionTitle,
  onDeleteSession,
}) => {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  // Find last active session (or fallback to the first one in the list)
  const lastActiveSession =
    sessions.find((s) => s.id === lastActiveSessionId) || sessions[0] || null;

  // Other previous sessions (excluding the prominent last active one)
  const otherSessions = sessions.filter((s) => s.id !== lastActiveSession?.id);

  // Helper: calculate session stats, duration, character count & timeline progress
  const getSessionMetrics = (s: Session) => {
    const charCount = s.sections.reduce(
      (acc, sec) => acc + (sec.text ? sec.text.length : 0),
      0
    );
    const wordCount = s.sections.reduce(
      (acc, sec) =>
        acc +
        (sec.text ? sec.text.trim().split(/\s+/).filter(Boolean).length : 0),
      0
    );

    let durationSec = s.totalDurationSeconds || 0;
    if (durationSec === 0 && s.sections.length > 0) {
      const lastSec = s.sections[s.sections.length - 1];
      if (lastSec?.timestamp && lastSec.timestamp.includes(':')) {
        const parts = lastSec.timestamp.split(':');
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseInt(parts[1], 10) || 0;
        durationSec =
          mins * 60 +
          secs +
          (lastSec.text ? Math.min(25, Math.round(lastSec.text.length / 10)) : 10);
      } else {
        durationSec = Math.max(12, Math.round(charCount / 12));
      }
    }

    const formatDuration = (sec: number) => {
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      if (mins === 0) return `${remSec} с`;
      return `${mins} мин ${remSec > 0 ? `${remSec} с` : ''}`.trim();
    };

    const formatTimeCode = (sec: number) => {
      const mins = Math.floor(sec / 60);
      const remSec = sec % 60;
      return `${String(mins).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
    };

    // Benchmark for timeline scale: 180s (3 min) baseline for rich relative scale
    const benchmarkSec = Math.max(180, durationSec);
    const progressPercent = Math.min(
      100,
      Math.max(10, Math.round((durationSec / benchmarkSec) * 100))
    );

    const docCount =
      (s.documents ? s.documents.length : 0) + (s.sections.length > 0 ? 1 : 0);

    return {
      charCount,
      wordCount,
      durationSec,
      durationFormatted: formatDuration(durationSec),
      timeCode: formatTimeCode(durationSec),
      progressPercent,
      docCount,
    };
  };

  const startRename = (s: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(s.id);
    setEditTitleInput(s.title);
  };

  const saveRename = (sessionId: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitleInput.trim()) {
      onUpdateSessionTitle(sessionId, editTitleInput.trim());
    }
    setEditingSessionId(null);
  };

  const getScenarioMeta = (scenario: ScenarioType) => {
    switch (scenario) {
      case 'notes':
        return {
          label: 'Мои заметки',
          desc: 'Диктовка мыслей, идей и заметок',
          icon: Mic,
          tagColor: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
          badgeBg: 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200',
        };
      case 'import':
        return {
          label: 'Импорт файлов',
          desc: 'doc, docx, txt, mp3, wav в текст',
          icon: FileAudio,
          tagColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
          badgeBg: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300',
        };
      case 'dictaphone':
      case 'meeting':
        return {
          label: 'Диктофон',
          desc: 'Запись встреч, совещаний, лекций',
          icon: AudioLines,
          tagColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
          badgeBg: 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300',
        };
      case 'translation':
        return {
          label: 'Синхронный перевод',
          desc: 'Озвучка перевода',
          icon: Languages,
          tagColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
          badgeBg: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300',
        };
      case 'dialogue':
        return {
          label: 'Общение',
          desc: 'Голосовой диалог',
          icon: MessageSquare,
          tagColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300',
          badgeBg: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300',
        };
      case 'phrasebook':
        return {
          label: 'Текстовый разговорник',
          desc: 'Быстрые фразы и шаблоны',
          icon: BookOpen,
          tagColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
          badgeBg: 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300',
        };
    }
  };

  const scenarioList: ScenarioType[] = [
    'notes',
    'import',
    'dictaphone',
    'translation',
    'dialogue',
    'phrasebook',
  ];

  return (
    <div id="start-screen" className="flex flex-col h-full overflow-y-auto no-scrollbar select-none pb-4">
      {/* ─────────────────────────────────────────────────────────────
          ВЕРХНЯЯ ПОЛОВИНА: НАЧАТЬ НОВУЮ СЕССИЮ ВЫБОРОМ СЦЕНАРИЯ
          Плитка из 6 сценариев (2 колонки x 3 строки)
          ───────────────────────────────────────────────────────────── */}
      <section className="px-4 pt-3 pb-3">
        <div className="mb-2">
          <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Начать новую сессию
          </h1>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Выберите сценарий:
          </p>
        </div>

        {/* 6 сценариев в компактной плитке 2x3 */}
        <div className="grid grid-cols-2 gap-2">
          {scenarioList.map((scType) => {
            const meta = getScenarioMeta(scType);
            const Icon = meta.icon;

            return (
              <button
                key={scType}
                id={`scenario-${scType}-button`}
                type="button"
                onClick={() => onCreateNewSession(scType)}
                className="p-2.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-400 dark:hover:border-neutral-700 flex flex-col items-start text-left transition-all cursor-pointer group active:scale-[0.98]"
              >
                <div
                  className={`w-7 h-7 rounded-xl ${meta.badgeBg} flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 leading-tight mb-0.5">
                  {meta.label}
                </span>
                <span className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight line-clamp-1">
                  {meta.desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          НИЖНЯЯ ПОЛОВИНА: ПОСЛЕДНЯЯ СЕССИЯ + ПРЕЖНИЕ СЕССИИ
          ───────────────────────────────────────────────────────────── */}
      {/* 1. Выделенная последняя сессия (активно) */}
      {lastActiveSession && (() => {
        const lastMetrics = getSessionMetrics(lastActiveSession);

        return (
          <section className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Последняя сессия (активно)
              </span>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {lastActiveSession.updatedAt}
              </span>
            </div>

            <div
              id={`last-session-card-${lastActiveSession.id}`}
              onClick={() => onOpenSession(lastActiveSession.id)}
              className="p-3.5 rounded-2xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md shadow-neutral-900/10 relative overflow-hidden cursor-pointer group transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {/* Scenario badge */}
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/15 dark:bg-neutral-900/10 text-[10px] font-medium mb-1.5">
                    {React.createElement(getScenarioMeta(lastActiveSession.scenario).icon, {
                      className: 'w-3 h-3',
                    })}
                    <span>{getScenarioMeta(lastActiveSession.scenario).label}</span>
                  </div>

                  {/* Editable title */}
                  {editingSessionId === lastActiveSession.id ? (
                    <div
                      className="flex items-center gap-1.5 mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitleInput}
                        onChange={(e) => setEditTitleInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename(lastActiveSession.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        autoFocus
                        className="bg-white/20 dark:bg-neutral-900/20 px-2 py-0.5 rounded text-sm font-semibold text-white dark:text-neutral-900 focus:outline-none w-full"
                      />
                      <button
                        type="button"
                        onClick={(e) => saveRename(lastActiveSession.id, e)}
                        className="p-1 rounded bg-emerald-500 text-white cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm tracking-tight truncate">
                        {lastActiveSession.title}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => startRename(lastActiveSession, e)}
                        className="opacity-60 hover:opacity-100 p-1 rounded transition-opacity cursor-pointer"
                        title="Переименовать сессию"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {/* Preview text of the latest section */}
                  <p className="text-[11px] text-white/80 dark:text-neutral-700 line-clamp-2 mt-1 font-normal leading-relaxed">
                    {lastActiveSession.sections[lastActiveSession.sections.length - 1]?.text ||
                      'Сессия готова к надиктовыванию и записи.'}
                  </p>
                </div>

                {/* Top-right action group: Folder (docs) & Continue Arrow */}
                <div className="shrink-0 flex items-center gap-1.5 self-start pt-0.5">
                  <button
                    id={`btn-folder-last-session-${lastActiveSession.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSession(lastActiveSession.id, 'documents');
                    }}
                    className="px-2 py-1 rounded-xl bg-white/15 hover:bg-white/25 dark:bg-neutral-900/15 dark:hover:bg-neutral-900/25 text-amber-300 dark:text-amber-600 flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-xs"
                    title="Открыть документы сессии (реестр)"
                  >
                    <Folder className="w-3.5 h-3.5 fill-amber-300/30 text-amber-300 dark:text-amber-500" />
                    <span className="text-[10px] font-bold">{lastMetrics.docCount}</span>
                  </button>

                  <div className="w-7 h-7 rounded-full bg-white/20 dark:bg-neutral-900/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Progress indicator / Timeline scale for the last active session */}
              <div className="mt-2.5 pt-2 border-t border-white/10 dark:border-neutral-900/10 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] opacity-85 font-medium">
                  <span className="flex items-center gap-1 text-emerald-300 dark:text-emerald-700">
                    <Clock className="w-3 h-3" />
                    <span>{lastMetrics.durationFormatted} ({lastMetrics.timeCode})</span>
                  </span>
                  <span className="flex items-center gap-1 text-indigo-200 dark:text-indigo-800">
                    <FileText className="w-3 h-3" />
                    <span>{lastMetrics.charCount} симв. • {lastMetrics.wordCount} сл.</span>
                  </span>
                </div>

                {/* Visual timeline bar */}
                <div className="w-full h-1.5 bg-white/15 dark:bg-neutral-900/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 rounded-full transition-all duration-300"
                    style={{ width: `${lastMetrics.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Bottom prompt to continue */}
              <div className="mt-2 pt-2 border-t border-white/10 dark:border-neutral-900/10 flex items-center justify-between text-[11px] font-medium opacity-90">
                <span>Продолжить работу с сессией</span>
                <span className="text-[10px] opacity-75">Открыть наработки →</span>
              </div>
            </div>
          </section>
        );
      })()}

      {/* 2. Список предыдущих сессий */}
      <section className="px-4 flex-1">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Предыдущие сессии ({sessions.length})
          </span>
          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
            Не закрываются
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          {otherSessions.map((s) => {
            const meta = getScenarioMeta(s.scenario);
            const isEditing = editingSessionId === s.id;
            const metrics = getSessionMetrics(s);

            return (
              <div
                key={s.id}
                id={`session-item-${s.id}`}
                onClick={() => onOpenSession(s.id)}
                className="p-2.5 rounded-2xl bg-neutral-50/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/70 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer group flex flex-col gap-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.2 rounded ${meta.tagColor} flex items-center gap-1`}
                      >
                        {React.createElement(meta.icon, { className: 'w-2.5 h-2.5' })}
                        <span>{meta.label}</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        {s.updatedAt}
                      </span>
                    </div>

                    {/* Title or Edit Input */}
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1.5 my-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitleInput}
                          onChange={(e) => setEditTitleInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(s.id);
                            if (e.key === 'Escape') setEditingSessionId(null);
                          }}
                          autoFocus
                          className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded text-xs font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none w-full"
                        />
                        <button
                          type="button"
                          onClick={(e) => saveRename(s.id, e)}
                          className="p-1 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 truncate">
                          {s.title}
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => startRename(s, e)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded transition-opacity cursor-pointer"
                          title="Переименовать"
                        >
                          <Edit2 className="w-3 h-3 text-neutral-500" />
                        </button>
                      </div>
                    )}

                    {/* Preview text */}
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                      {s.sections[0]?.text || 'Пустая запись'}
                    </p>
                  </div>

                  {/* Actions: Folder for quick docs list, Delete, and Arrow */}
                  <div className="flex items-center gap-1 shrink-0 self-start mt-0.5">
                    <button
                      id={`btn-folder-session-${s.id}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSession(s.id, 'documents');
                      }}
                      className="px-2 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 flex items-center gap-1 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                      title="Открыть документы сессии (быстрый переход)"
                    >
                      <Folder className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-400/20" />
                      <span className="text-[10px] font-bold">{metrics.docCount}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
                      title="Удалить сессию"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors" />
                  </div>
                </div>

                {/* Progress indicator / Timeline scale */}
                <div className="pt-1.5 border-t border-neutral-200/60 dark:border-neutral-800/70 flex flex-col gap-1">
                  {/* Timeline bar */}
                  <div className="w-full h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${metrics.progressPercent}%` }}
                    />
                  </div>

                  {/* Duration and character count badges */}
                  <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{metrics.durationFormatted} ({metrics.timeCode})</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{metrics.charCount} симв. • {s.sections.length} разд.</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
