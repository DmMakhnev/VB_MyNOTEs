import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun,
  Moon,
  Wifi,
  Battery,
  Layers,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Session, ScenarioType, ScreenMode } from './types';
import {
  getStoredSessions,
  saveStoredSessions,
  getLastActiveSessionId,
  setLastActiveSessionId,
  INITIAL_SESSIONS,
} from './services/storage';
import { StartScreen } from './components/StartScreen';
import { SessionWorkbench } from './components/SessionWorkbench';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sessions, setSessions] = useState<Session[]>(getStoredSessions);
  const [lastActiveId, setLastActiveId] = useState<string>(getLastActiveSessionId);
  const [screenMode, setScreenMode] = useState<ScreenMode>('start');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Sync theme
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Persist sessions whenever they change
  useEffect(() => {
    saveStoredSessions(sessions);
  }, [sessions]);

  const [initialWorkbenchTab, setInitialWorkbenchTab] = useState<
    'main_text' | 'ai_result' | 'documents'
  >('main_text');

  // Open existing session
  const handleOpenSession = (
    sessionId: string,
    initialTab: 'main_text' | 'ai_result' | 'documents' = 'main_text'
  ) => {
    setActiveSessionId(sessionId);
    setLastActiveId(sessionId);
    setLastActiveSessionId(sessionId);
    setInitialWorkbenchTab(initialTab);
    setScreenMode('session');
  };

  // Create new session (either generic or from a scenario)
  const handleCreateNewSession = (scenario: ScenarioType, customTitle?: string) => {
    const scenarioTitles: Record<ScenarioType, string> = {
      notes: 'Мои заметки',
      import: 'Импорт файлов',
      dictaphone: 'Диктофон',
      meeting: 'Диктофон',
      translation: 'Синхронный перевод',
      dialogue: 'Общение',
      phrasebook: 'Текстовый разговорник',
    };

    const newSession: Session = {
      id: `session-${Date.now()}`,
      title: customTitle || `${scenarioTitles[scenario]} #${sessions.length + 1}`,
      scenario,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
      totalDurationSeconds: 0,
      sections:
        scenario === 'translation'
          ? [
              {
                id: `sec-init-1`,
                timestamp: '00:00',
                speaker: 'Вы',
                language: 'ru',
                text: 'Здравствуйте! Готов к синхронному переводу.',
                direction: 'out',
              },
            ]
          : scenario === 'dialogue'
          ? [
              {
                id: `sec-init-1`,
                timestamp: '00:00',
                speaker: 'Ассистент',
                text: 'Здравствуйте! Готов к общению. Нажмите «Записать», чтобы задать вопрос или начать беседу.',
                direction: 'in',
              },
            ]
          : scenario === 'dictaphone' || scenario === 'meeting'
          ? [
              {
                id: `sec-init-1`,
                timestamp: '00:00',
                speaker: 'Спикер 1',
                text: 'Запись начата. Фиксируем тезисы совещания или лекции.',
                direction: 'out',
              },
            ]
          : scenario === 'phrasebook'
          ? [
              {
                id: `sec-init-1`,
                timestamp: '00:00',
                text: 'Здравствуйте! Рад нашему знакомству. (Hello! Nice to meet you.)',
                direction: 'out',
              },
            ]
          : scenario === 'import'
          ? []
          : [
              {
                id: `sec-init-1`,
                timestamp: '00:00',
                text: 'Заметка начата. Нажмите «Записать» для диктовки мыслей.',
                direction: 'out',
              },
            ],
    };

    const updated = [newSession, ...sessions];
    setSessions(updated);
    setLastActiveId(newSession.id);
    setLastActiveSessionId(newSession.id);
    setActiveSessionId(newSession.id);
    setScreenMode('session');
  };

  // Update session content
  const handleUpdateSession = (updatedSession: Session) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
    setLastActiveId(updatedSession.id);
    setLastActiveSessionId(updatedSession.id);
  };

  // Update session title
  const handleUpdateSessionTitle = (sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, title: newTitle, updatedAt: 'Только что' } : s
      )
    );
  };

  // Delete session
  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (lastActiveId === sessionId && remaining.length > 0) {
        setLastActiveId(remaining[0].id);
        setLastActiveSessionId(remaining[0].id);
      }
      return remaining;
    });
    if (activeSessionId === sessionId) {
      setScreenMode('start');
      setActiveSessionId(null);
    }
  };

  // Reset to initial demo sessions
  const handleResetToDemo = () => {
    setSessions(INITIAL_SESSIONS);
    setLastActiveId(INITIAL_SESSIONS[0].id);
    setLastActiveSessionId(INITIAL_SESSIONS[0].id);
    setScreenMode('start');
    setActiveSessionId(null);
  };

  const currentActiveSession =
    sessions.find((s) => s.id === activeSessionId) ||
    sessions.find((s) => s.id === lastActiveId) ||
    sessions[0];

  return (
    <div
      className={`${theme} min-h-screen w-full flex flex-col items-center justify-center p-2 sm:p-4 bg-neutral-200/70 dark:bg-neutral-950 font-sans transition-colors duration-200`}
    >
      {/* Top Presentation Bar: Theme switcher & Quick inspection helpers */}
      <header className="w-full max-w-[390px] mb-3 flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              VoiceBridge
            </span>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-300/60 dark:bg-neutral-800 px-2 py-0.5 rounded-full font-medium">
              Сессионный UI 390px
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Reset demo data button */}
            <button
              id="reset-demo-button"
              type="button"
              onClick={handleResetToDemo}
              className="p-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all cursor-pointer"
              title="Сбросить к начальным сессиям"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Theme switch button */}
            <button
              id="theme-toggle-button"
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 shadow-xs hover:bg-neutral-50 dark:hover:bg-neutral-800/80 active:scale-95 cursor-pointer transition-all"
              title="Переключить тему"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-neutral-700" />
                  <span className="font-medium">Тёмная</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">Светлая</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Scenario & Screen View Navigator */}
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-2xl p-1.5 border border-neutral-300/80 dark:border-neutral-800 shadow-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-2 pt-0.5">
            <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-neutral-400" />
              Быстрая навигация для проверки:
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              {screenMode === 'start' ? 'Старт' : 'Сессия'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => setScreenMode('start')}
              className={`py-1 px-1 text-[11px] rounded-lg font-medium transition-all text-center truncate cursor-pointer ${
                screenMode === 'start'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Стартовая
            </button>

            <button
              type="button"
              onClick={() => {
                if (lastActiveId) handleOpenSession(lastActiveId);
                else if (sessions[0]) handleOpenSession(sessions[0].id);
              }}
              className={`py-1 px-1 text-[11px] rounded-lg font-medium transition-all text-center truncate cursor-pointer ${
                screenMode === 'session' && activeSessionId === lastActiveId
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Последняя
            </button>

            <button
              type="button"
              onClick={() => {
                const dlgSession = sessions.find((s) => s.scenario === 'dialogue');
                if (dlgSession) handleOpenSession(dlgSession.id);
                else handleCreateNewSession('dialogue');
              }}
              className={`py-1 px-1 text-[11px] rounded-lg font-medium transition-all text-center truncate cursor-pointer ${
                screenMode === 'session' &&
                currentActiveSession?.scenario === 'dialogue'
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Общение
            </button>

            <button
              type="button"
              onClick={() => {
                const dictSession = sessions.find((s) => s.scenario === 'dictaphone' || s.scenario === 'meeting');
                if (dictSession) handleOpenSession(dictSession.id);
                else handleCreateNewSession('dictaphone');
              }}
              className={`py-1 px-1 text-[11px] rounded-lg font-medium transition-all text-center truncate cursor-pointer ${
                screenMode === 'session' &&
                (currentActiveSession?.scenario === 'dictaphone' || currentActiveSession?.scenario === 'meeting')
                  ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              Диктофон
            </button>
          </div>
        </div>
      </header>

      {/* 390px Mobile Viewport Container */}
      <main
        id="mobile-viewport"
        className="w-[390px] h-[780px] bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-[44px] shadow-2xl shadow-neutral-950/20 border-[8px] border-neutral-800/90 dark:border-neutral-800 flex flex-col relative overflow-hidden transition-colors duration-200 shrink-0"
      >
        {/* iOS Status Bar */}
        <div className="h-11 px-7 flex items-center justify-between shrink-0 select-none pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
              9:41
            </span>
          </div>

          {/* Dynamic Island / Speaker Pill */}
          <div className="w-24 h-4 bg-neutral-900 dark:bg-neutral-800 rounded-full flex items-center justify-end px-2">
            <span className="w-2 h-2 rounded-full bg-neutral-700/80 dark:bg-neutral-700" />
          </div>

          <div className="flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Screen Content Container */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {screenMode === 'start' ? (
              <motion.div
                key="screen-start"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16 }}
                className="h-full w-full"
              >
                <StartScreen
                  sessions={sessions}
                  lastActiveSessionId={lastActiveId}
                  onOpenSession={handleOpenSession}
                  onCreateNewSession={handleCreateNewSession}
                  onUpdateSessionTitle={handleUpdateSessionTitle}
                  onDeleteSession={handleDeleteSession}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`screen-session-${currentActiveSession?.id}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.16 }}
                className="h-full w-full"
              >
                {currentActiveSession && (
                  <SessionWorkbench
                    session={currentActiveSession}
                    onBackToStart={() => setScreenMode('start')}
                    onUpdateSession={handleUpdateSession}
                    initialTab={initialWorkbenchTab}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* iOS Home Indicator */}
        <div className="h-4 flex items-center justify-center pb-1 bg-white/95 dark:bg-neutral-950/95 shrink-0">
          <div className="w-32 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
        </div>
      </main>
    </div>
  );
}
