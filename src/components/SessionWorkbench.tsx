import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  Mic,
  Square,
  Play,
  Pause,
  Volume2,
  Undo2,
  Redo2,
  Check,
  CheckSquare,
  Square as SquareEmpty,
  Scissors,
  Trash2,
  X,
  FileAudio,
  Languages,
  AudioLines,
  Sparkles,
  RotateCcw,
  Plus,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
  Copy,
  FileText,
  Eye,
  History,
  ArrowRight,
  ArrowLeft,
  Upload,
  Settings,
  Download,
  Share2,
} from 'lucide-react';
import {
  Session,
  SessionSection,
  SessionDocument,
  AIService,
  SegmentDirection,
} from '../types';
import { SpeechHelper } from '../services/speech';
import { processSegmentsWithAI, cleanSpokenText } from '../services/aiProcessor';
import { parseImportedFile, ParsedDocumentResult } from '../services/documentParser';
import { parseUploadedFile } from '../services/docParser';

interface SessionWorkbenchProps {
  session: Session;
  onBackToStart: () => void;
  onUpdateSession: (updated: Session) => void;
  initialTab?: TabType;
}

interface HistorySnapshot {
  sections: SessionSection[];
  label: string;
  time: string;
}

type TabType = 'main_text' | 'ai_result' | 'documents';

export const SessionWorkbench: React.FC<SessionWorkbenchProps> = ({
  session,
  onBackToStart,
  onUpdateSession,
  initialTab,
}) => {
  // 3 Tabs: 'main_text' (Основной текст) | 'ai_result' (Результат обработки) | 'documents' (Документы сессии)
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'main_text');
  const tabList: TabType[] = ['main_text', 'ai_result', 'documents'];

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, session.id]);

  // Inline Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(session.title);

  // Undo / Redo version history stack (like in Word)
  const [history, setHistory] = useState<HistorySnapshot[]>([
    {
      sections: session.sections,
      label: 'Исходная сессия',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

  // Multiselect segments: single tap toggles selection
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);

  // Double-tap in-place editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [cursorPos, setCursorPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  // Long press tracking for segment protection
  const longPressTimerRef = useRef<any>(null);
  const isLongPressActiveRef = useRef(false);

  // Active toolbar modes: 'idle' | 'speaking' | 'recording'
  const [toolbarMode, setToolbarMode] = useState<'idle' | 'speaking' | 'recording'>('idle');

  // Speech (TTS) states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [spokenTextLabel, setSpokenTextLabel] = useState<string>('');

  // Live recording states
  const [liveTranscript, setLiveTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const isDictatingIntoCursorRef = useRef(false);

  // Post-processing operation selection (default: 'normalize')
  const [currentOperation, setCurrentOperation] = useState<AIService>('normalize');
  const [isOperationMenuOpen, setIsOperationMenuOpen] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiToastMessage, setAiToastMessage] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Modal for viewing documents in 'documents' tab
  const [selectedDocForModal, setSelectedDocForModal] = useState<SessionDocument | null>(null);
  const [showMainTextDocModal, setShowMainTextDocModal] = useState(false);

  // Settings modal and pre-flags
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [autoSpeakResult, setAutoSpeakResult] = useState<boolean>(() => {
    return localStorage.getItem('voicebridge_auto_speak_result') === 'true';
  });
  const [autoApplyResult, setAutoApplyResult] = useState<boolean>(() => {
    return localStorage.getItem('voicebridge_auto_apply_result') !== 'false';
  });

  // Track if current resultText has already been applied to main_text
  const [isResultApplied, setIsResultApplied] = useState<boolean>(true);
  const [lastTargetSectionsForApplication, setLastTargetSectionsForApplication] = useState<SessionSection[]>([]);
  const [lastUnprotectedReplacementText, setLastUnprotectedReplacementText] = useState<string>('');

  // Translation scenario language toggle
  const [speakerLang, setSpeakerLang] = useState<'ru' | 'en'>('ru');

  // Swipe gesture coordinates
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Synchronize title input
  useEffect(() => {
    setTitleInput(session.title);
  }, [session.title]);

  // Clean up speech & timers on unmount
  useEffect(() => {
    return () => {
      SpeechHelper.stop();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to determine the section's direction: 'out' (user notes / recording / comments) or 'in' (documents / imported recognition)
  const getSectionDirection = (sec: SessionSection): SegmentDirection => {
    if (sec.direction) return sec.direction;
    if (session.scenario === 'import') {
      return sec.speaker === 'Вы' ? 'out' : 'in';
    }
    if (sec.speaker === 'Alex' || sec.speaker === 'Собеседник' || sec.speaker === 'Ассистент') {
      return 'in';
    }
    return 'out';
  };

  // Document & Audio file import handler
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportDocument = (
    fileName: string,
    content: string,
    format?: 'doc' | 'docx' | 'txt' | 'wav' | 'mp3' | 'audio' | string,
    fileSize?: string
  ) => {
    const paragraphs = content
      .split(/\n\n+|\r?\n(?=[A-ZА-Я0-9—\-•])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newSections: SessionSection[] =
      paragraphs.length > 0
        ? paragraphs.map((text, idx) => ({
            id: `sec-imp-${Date.now()}-${idx}`,
            timestamp: formatTime(idx * 25),
            text,
            direction: 'in' as SegmentDirection, // Для импорта документов и распознавания - всегда направление 'in'
          }))
        : [
            {
              id: `sec-imp-${Date.now()}`,
              timestamp: '00:00',
              text: content.trim(),
              direction: 'in' as SegmentDirection,
            },
          ];

    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const lowerName = fileName.toLowerCase();
    const isAudio =
      format === 'audio' ||
      format === 'mp3' ||
      format === 'wav' ||
      lowerName.endsWith('.mp3') ||
      lowerName.endsWith('.wav') ||
      lowerName.endsWith('.m4a') ||
      lowerName.endsWith('.ogg');

    const determinedFormat: 'doc' | 'docx' | 'txt' | 'wav' | 'mp3' | string =
      format && format !== 'audio'
        ? format
        : lowerName.endsWith('.docx')
        ? 'docx'
        : lowerName.endsWith('.doc')
        ? 'doc'
        : lowerName.endsWith('.wav')
        ? 'wav'
        : lowerName.endsWith('.mp3')
        ? 'mp3'
        : 'txt';

    const newDoc: SessionDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: fileName,
      type: isAudio ? 'imported_audio' : 'imported_text',
      format: determinedFormat,
      fileSize,
      content,
      createdAt: 'Сегодня в ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      wordCount: words,
    };

    const updatedSections = [...session.sections, ...newSections];
    const updatedDocs = [newDoc, ...(session.documents || [])];

    onUpdateSession({
      ...session,
      sections: updatedSections,
      documents: updatedDocs,
      totalDurationSeconds: session.totalDurationSeconds + newSections.length * 25,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });

    commitNewVersion(updatedSections, `Импорт файла: ${fileName}`);
    setAiToastMessage(`Документ «${fileName}» добавлен в сессию (+${newSections.length} сегм. in)`);
    setTimeout(() => setAiToastMessage(null), 3500);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAiProcessing(true);
      setAiToastMessage(`Импорт файла «${file.name}»…`);
      const parsed = await parseUploadedFile(file);
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} МБ`
          : `${Math.max(1, Math.round(file.size / 1024))} КБ`;

      handleImportDocument(parsed.fileName, parsed.content, parsed.format, sizeStr);
    } catch (err) {
      console.error('File parsing error:', err);
      // Fallback text reading
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          handleImportDocument(file.name, text, 'txt');
        }
      };
      reader.readAsText(file);
    } finally {
      setIsAiProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 1. VERSION SNAPSHOT HISTORY (WORD-LIKE UNDO/REDO)
  // ─────────────────────────────────────────────────────────────
  const commitNewVersion = (newSections: SessionSection[], reasonTitle: string) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    const newSnapshot: HistorySnapshot = {
      sections: newSections,
      label: reasonTitle,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    nextHistory.push(newSnapshot);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);

    onUpdateSession({
      ...session,
      sections: newSections,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });
  };

  // Undo (Стрелка налево-назад: откат к предыдущей версии)
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevSections = history[prevIndex].sections;
      setHistoryIndex(prevIndex);
      onUpdateSession({
        ...session,
        sections: prevSections,
        updatedAt: 'Только что',
        timestampMs: Date.now(),
      });
      // Filter out selection if IDs no longer exist
      setSelectedSectionIds((prev) =>
        prev.filter((id) => prevSections.some((s) => s.id === id))
      );
    }
  };

  // Redo (Стрелка направо-вперед)
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextSections = history[nextIndex].sections;
      setHistoryIndex(nextIndex);
      onUpdateSession({
        ...session,
        sections: nextSections,
        updatedAt: 'Только что',
        timestampMs: Date.now(),
      });
    }
  };

  // Jump to specific snapshot from dropdown
  const handleJumpToSnapshot = (index: number) => {
    setHistoryIndex(index);
    const snap = history[index];
    onUpdateSession({
      ...session,
      sections: snap.sections,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });
    setIsVersionDropdownOpen(false);
  };

  // Save Title
  const handleSaveTitle = () => {
    if (titleInput.trim() && titleInput.trim() !== session.title) {
      onUpdateSession({
        ...session,
        title: titleInput.trim(),
        updatedAt: 'Только что',
        timestampMs: Date.now(),
      });
    }
    setIsEditingTitle(false);
  };

  // ─────────────────────────────────────────────────────────────
  // 2. SEGMENT PROTECTION (ЗАЩИТА СЕГМЕНТА / ЗАМОЧЕК)
  // ─────────────────────────────────────────────────────────────
  const handleToggleProtection = (secId: string) => {
    const updated = session.sections.map((s) => {
      if (s.id === secId) {
        return { ...s, isProtected: !s.isProtected };
      }
      return s;
    });

    const targetSec = session.sections.find((s) => s.id === secId);
    const isNowProtected = !targetSec?.isProtected;
    commitNewVersion(
      updated,
      isNowProtected ? `Защита сегмента #${session.sections.findIndex((s) => s.id === secId) + 1}` : `Снятие защиты #${session.sections.findIndex((s) => s.id === secId) + 1}`
    );

    setAiToastMessage(
      isNowProtected ? '🔒 Сегмент защищен от пост-обработки' : '🔓 Защита снята'
    );
    setTimeout(() => setAiToastMessage(null), 2200);
  };

  // ─────────────────────────────────────────────────────────────
  // 3. SELECTION & TAP GESTURES
  // ─────────────────────────────────────────────────────────────
  const handleSectionClick = (sec: SessionSection) => {
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }

    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Double tap within 320ms opens in-place editor
    if (lastTap && lastTap.id === sec.id && now - lastTap.time < 320) {
      lastTapRef.current = null;
      handleStartEditing(sec);
      return;
    }

    lastTapRef.current = { id: sec.id, time: now };

    // Single tap toggles selection
    setSelectedSectionIds((prev) =>
      prev.includes(sec.id) ? prev.filter((id) => id !== sec.id) : [...prev, sec.id]
    );
  };

  // Long press detection for protection
  const handlePointerDown = (secId: string) => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      handleToggleProtection(secId);
    }, 480);
  };

  const handlePointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Select all / Deselect all
  const isAllSelected =
    session.sections.length > 0 && selectedSectionIds.length === session.sections.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSectionIds([]);
    } else {
      setSelectedSectionIds(session.sections.map((s) => s.id));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 4. SEGMENT REORDERING & SHIFT (СТРЕЛКИ ВВЕРХ / ВНИЗ)
  // ─────────────────────────────────────────────────────────────
  const handleMoveSection = (secId: string, direction: 'up' | 'down') => {
    const index = session.sections.findIndex((s) => s.id === secId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === session.sections.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...session.sections];
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    commitNewVersion(
      newSections,
      `Смещение сегмента #${index + 1} ${direction === 'up' ? 'вверх' : 'вниз'}`
    );
  };

  // ─────────────────────────────────────────────────────────────
  // 5. SEGMENT SPLITTING & DELETION
  // ─────────────────────────────────────────────────────────────
  // Split in half (if not editing)
  const handleSplitInHalf = (secId: string) => {
    const index = session.sections.findIndex((s) => s.id === secId);
    if (index === -1) return;
    const sec = session.sections[index];
    const text = sec.text.trim();
    if (text.length < 4) return;

    const mid = Math.floor(text.length / 2);
    let splitIndex = text.indexOf(' ', mid);
    if (splitIndex === -1) splitIndex = text.lastIndexOf(' ', mid);
    if (splitIndex === -1) splitIndex = mid;

    const part1 = text.slice(0, splitIndex).trim();
    const part2 = text.slice(splitIndex).trim();

    const originalDir = getSectionDirection(sec);
    const sec1: SessionSection = {
      ...sec,
      id: `sec-${Date.now()}-1`,
      text: part1,
      direction: originalDir,
      isEdited: true, // Редактированный / разделенный сегмент (red)
    };
    const sec2: SessionSection = {
      ...sec,
      id: `sec-${Date.now()}-2`,
      text: part2,
      isProtected: false,
      direction: originalDir,
      isEdited: true, // Редактированный / разделенный сегмент (red)
    };

    const newSections = [
      ...session.sections.slice(0, index),
      sec1,
      sec2,
      ...session.sections.slice(index + 1),
    ];

    setSelectedSectionIds([sec1.id]);
    commitNewVersion(newSections, `Разделение пополам (#${index + 1})`);
  };

  // Split at cursor (if in editing mode)
  const handleSplitAtCursor = (secId: string) => {
    const index = session.sections.findIndex((s) => s.id === secId);
    if (index === -1) return;
    const sec = session.sections[index];

    const before = editingText.slice(0, cursorPos).trim();
    const after = editingText.slice(cursorPos).trim();

    const originalDir = getSectionDirection(sec);
    const sec1: SessionSection = {
      ...sec,
      id: `sec-${Date.now()}-1`,
      text: before || '…',
      direction: originalDir,
      isEdited: true, // Редактированный / разделенный сегмент (red)
    };
    const sec2: SessionSection = {
      ...sec,
      id: `sec-${Date.now()}-2`,
      text: after || '…',
      isProtected: false,
      direction: originalDir,
      isEdited: true, // Редактированный / разделенный сегмент (red)
    };

    const newSections = [
      ...session.sections.slice(0, index),
      sec1,
      sec2,
      ...session.sections.slice(index + 1),
    ];

    setEditingSectionId(null);
    setSelectedSectionIds([sec1.id]);
    commitNewVersion(newSections, `Разделение по курсору (#${index + 1})`);
  };

  // Delete segment
  const handleDeleteSection = (secId: string) => {
    const index = session.sections.findIndex((s) => s.id === secId);
    const newSections = session.sections.filter((s) => s.id !== secId);
    setSelectedSectionIds((prev) => prev.filter((id) => id !== secId));
    if (editingSectionId === secId) {
      setEditingSectionId(null);
    }
    commitNewVersion(newSections, `Удаление сегмента #${index + 1}`);
  };

  // Start in-place editing
  const handleStartEditing = (sec: SessionSection) => {
    setEditingSectionId(sec.id);
    setEditingText(sec.text);
    setCursorPos(sec.text.length);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = sec.text.length;
        textareaRef.current.selectionEnd = sec.text.length;
      }
    }, 50);
  };

  // Save in-place editing
  // Первичное направление сегмента (in или out) НЕ меняется при редактировании.
  // Сегмент получает дополнительный признак 'isEdited: true' (red)
  const handleSaveEditing = () => {
    if (!editingSectionId) return;
    const target = session.sections.find((s) => s.id === editingSectionId);
    if (!target) {
      setEditingSectionId(null);
      return;
    }

    if (editingText.trim() !== target.text) {
      const originalDirection = getSectionDirection(target);
      const updated = session.sections.map((s) =>
        s.id === editingSectionId
          ? {
              ...s,
              text: editingText.trim(),
              direction: originalDirection, // Первичное направление НЕ меняется!
              isEdited: true, // Дополнительный признак red (редактированный)
            }
          : s
      );
      commitNewVersion(updated, `Правка текста`);
    }
    setEditingSectionId(null);
  };

  // Dictate text into cursor position
  const handleDictateIntoCursor = () => {
    const samplePhrases = [
      ' [дополнительное уточнение] ',
      ' (согласовано устно) ',
      ' — важный пункт повестки — ',
    ];
    const phrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
    const before = editingText.slice(0, cursorPos);
    const after = editingText.slice(cursorPos);
    const updated = before + phrase + after;
    setEditingText(updated);
    setCursorPos(before.length + phrase.length);
  };

  // ─────────────────────────────────────────────────────────────
  // 6. BOTTOM TOOLBAR: «ОЗВУЧИТЬ» / «ОБРАБОТАТЬ» / «ЗАПИСАТЬ»
  // ─────────────────────────────────────────────────────────────
  const getSelectedTextForSpeech = (): { text: string; label: string } => {
    if (activeTab === 'ai_result' && session.resultText) {
      return { text: session.resultText, label: 'Результат обработки' };
    }

    if (activeTab === 'documents' && selectedDocForModal) {
      return { text: selectedDocForModal.content, label: selectedDocForModal.title };
    }

    if (selectedSectionIds.length > 0) {
      const selectedSecs = session.sections.filter((s) =>
        selectedSectionIds.includes(s.id)
      );
      const joined = selectedSecs.map((s) => s.text).join('. ');
      const label =
        selectedSecs.length === 1
          ? 'Выбранный 1 сегмент'
          : `Выбрано ${selectedSecs.length} сегм.`;
      return { text: joined, label };
    }

    // Default: all sections
    const all = session.sections.map((s) => s.text).join('. ');
    return { text: all, label: 'Все сегменты' };
  };

  const handleSpeakCustomText = (textToSpeak: string, label: string) => {
    if (!textToSpeak.trim()) return;

    SpeechHelper.stop();
    setToolbarMode('speaking');
    setIsSpeaking(true);
    setSpokenTextLabel(label);

    const lang =
      session.scenario === 'translation' && textToSpeak.match(/[a-zA-Z]{5,}/)
        ? 'en-US'
        : 'ru-RU';

    SpeechHelper.speak(textToSpeak, {
      lang,
      rate: speechRate,
      onEnd: () => {
        setIsSpeaking(false);
        setToolbarMode('idle');
      },
      onError: () => {
        setIsSpeaking(false);
        setToolbarMode('idle');
      },
    });
  };

  const handleStartSpeaking = () => {
    const { text, label } = getSelectedTextForSpeech();
    handleSpeakCustomText(text, label);
  };

  const handleStartSpeakingResult = () => {
    if (!session.resultText) return;
    if (isSpeaking && spokenTextLabel.startsWith('Результат')) {
      SpeechHelper.stop();
      setIsSpeaking(false);
      setToolbarMode('idle');
      return;
    }
    const op = session.lastProcessedOperation || currentOperation || 'normalize';
    const opNames: Record<AIService, string> = {
      normalize: 'Нормализация',
      summarize: 'Резюмирование',
      structure: 'Структурирование',
      translate: 'Перевод',
    };
    handleSpeakCustomText(session.resultText, `Результат (${opNames[op]})`);
  };

  const handleStopSpeaking = () => {
    SpeechHelper.stop();
    setIsSpeaking(false);
    setToolbarMode('idle');
  };

  const handleTogglePlayPause = () => {
    if (isSpeaking) {
      SpeechHelper.stop();
      setIsSpeaking(false);
    } else {
      const { text } = getSelectedTextForSpeech();
      setIsSpeaking(true);
      const lang =
        session.scenario === 'translation' && text.match(/[a-zA-Z]{5,}/)
          ? 'en-US'
          : 'ru-RU';
      SpeechHelper.speak(text, {
        lang,
        rate: speechRate,
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  // Start recording
  const handleStartRecording = () => {
    SpeechHelper.stop();
    setIsSpeaking(false);

    setToolbarMode('recording');
    setRecordingSeconds(0);
    setLiveTranscript('Слушаю речь…');

    // Check if recording directly into editing segment cursor
    if (editingSectionId) {
      isDictatingIntoCursorRef.current = true;
    } else {
      isDictatingIntoCursorRef.current = false;
    }

    const phrases =
      session.scenario === 'translation'
        ? ['Говорим на выбранном языке…', 'Синхронный перевод формирует реплику…']
        : session.scenario === 'dictaphone'
        ? ['Фиксируем выступление докладчика…', 'Тезис записывается в протокол…']
        : ['Диктуем новую мысль в заметки…', 'Распознавание речи работает на лету…'];

    let step = 0;
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        const nextSec = prev + 1;
        if (nextSec % 2 === 0 && step < phrases.length) {
          setLiveTranscript(phrases[step]);
          step++;
        }
        return nextSec;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const transcriptToSave =
      liveTranscript !== 'Слушаю речь…'
        ? liveTranscript
        : session.scenario === 'translation'
        ? speakerLang === 'ru'
          ? 'Новая реплика на русском языке зафиксирована.'
          : 'New statement recorded into the translation thread.'
        : 'Новая заметка надиктована и сохранена в сессию.';

    if (isDictatingIntoCursorRef.current && editingSectionId) {
      // Append into current cursor
      const before = editingText.slice(0, cursorPos);
      const after = editingText.slice(cursorPos);
      const updated = before + ' ' + transcriptToSave + ' ' + after;
      setEditingText(updated.trim());
      setCursorPos(before.length + transcriptToSave.length + 1);
      isDictatingIntoCursorRef.current = false;
      setToolbarMode('idle');
      return;
    }

    const newSection: SessionSection = {
      id: `sec-${Date.now()}`,
      timestamp: formatTime(session.totalDurationSeconds + recordingSeconds),
      speaker:
        session.scenario === 'translation'
          ? speakerLang === 'ru'
            ? 'Вы'
            : 'Собеседник'
          : undefined,
      language: speakerLang,
      text: transcriptToSave,
      direction:
        session.scenario === 'translation' && speakerLang !== 'ru'
          ? 'in'
          : 'out', // Для заметок, комментариев и голосовой записи пользователя - всегда 'out'
    };

    const updatedSections = [...session.sections, newSection];
    commitNewVersion(updatedSections, `Добавлен сегмент #${updatedSections.length}`);

    onUpdateSession({
      ...session,
      sections: updatedSections,
      totalDurationSeconds: session.totalDurationSeconds + Math.max(recordingSeconds, 3),
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });

    setToolbarMode('idle');
  };

  // ─────────────────────────────────────────────────────────────
  // 7. «ОБРАБОТАТЬ» POST-PROCESSING (AI MODEL)
  // ─────────────────────────────────────────────────────────────
  const handleRunProcessOperation = async (op: AIService) => {
    // Target sections: selected ones or all if none selected
    const targetSections =
      selectedSectionIds.length > 0
        ? session.sections.filter((s) => selectedSectionIds.includes(s.id))
        : session.sections;

    if (targetSections.length === 0) return;

    const unprotectedTargets = targetSections.filter((s) => !s.isProtected);
    if (unprotectedTargets.length === 0) {
      setAiToastMessage('Все выбранные сегменты защищены от изменений 🔒');
      setTimeout(() => setAiToastMessage(null), 3000);
      return;
    }

    setIsAiProcessing(true);
    setCurrentOperation(op);
    setIsOperationMenuOpen(false);

    try {
      const { processedText, summaryLabel } =
        await processSegmentsWithAI(unprotectedTargets, op, {
          repeatSeed: Date.now(),
        });

      const replacementText = processedText;

      setLastTargetSectionsForApplication(targetSections);
      setLastUnprotectedReplacementText(replacementText);

      const opNames: Record<AIService, string> = {
        normalize: 'Нормализация',
        summarize: 'Резюмирование',
        structure: 'Структурирование',
        translate: 'Перевод',
      };

      const countLabel =
        targetSections.length === session.sections.length
          ? 'всех сегментов'
          : `${targetSections.length} сегм.`;
      const snapshotTitle = `${opNames[op]} (${countLabel})`;

      if (autoApplyResult) {
        // Автоприменение включено: сразу заменяем целевые сегменты в основном тексте
        let newSections = [...session.sections];

        if (unprotectedTargets.length > 0) {
          const primaryDir = getSectionDirection(targetSections[0]);
          const mergedSegment: SessionSection = {
            id: `sec-${Date.now()}-proc`,
            timestamp: targetSections[0].timestamp,
            speaker: targetSections[0].speaker,
            language: targetSections[0].language,
            text: replacementText,
            isProtected: false,
            direction: primaryDir, // Сохраняет первичное направление целевых сегментов
            isEdited: true, // Признак red (подвергался постобработке / редактированный)
          };

          const unprotectedTargetIds = new Set(unprotectedTargets.map((u) => u.id));
          const filtered: SessionSection[] = [];
          let inserted = false;

          for (let i = 0; i < newSections.length; i++) {
            const sec = newSections[i];
            if (unprotectedTargetIds.has(sec.id)) {
              if (!inserted) {
                filtered.push(mergedSegment);
                inserted = true;
              }
            } else {
              filtered.push(sec);
            }
          }
          newSections = filtered;
          setSelectedSectionIds([mergedSegment.id]);
        }

        onUpdateSession({
          ...session,
          sections: newSections,
          resultText: processedText,
          lastProcessedOperation: op,
          lastProcessedSectionIds: targetSections.map((s) => s.id),
          updatedAt: 'Только что',
          timestampMs: Date.now(),
        });

        commitNewVersion(newSections, snapshotTitle);
        setIsResultApplied(true);

        setAiToastMessage(`${opNames[op]}: заменено на месте целевых сегментов (${countLabel})`);
        setTimeout(() => setAiToastMessage(null), 3500);
      } else {
        // Автоприменение выключено: результат отображается только в поле Результат
        onUpdateSession({
          ...session,
          resultText: processedText,
          lastProcessedOperation: op,
          lastProcessedSectionIds: targetSections.map((s) => s.id),
          updatedAt: 'Только что',
          timestampMs: Date.now(),
        });

        setIsResultApplied(false);

        setAiToastMessage(`${opNames[op]}: готово в поле «Результат» (${countLabel})`);
        setTimeout(() => setAiToastMessage(null), 3500);
      }

      // Автоозвучка результата (если включен флаг)
      if (autoSpeakResult) {
        setTimeout(() => {
          handleSpeakCustomText(processedText, `Результат (${opNames[op]})`);
        }, 250);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 8. ACTIONS FOR «РЕЗУЛЬТАТ ОБРАБОТКИ»
  // ─────────────────────────────────────────────────────────────
  // 1. Применить результат к основному тексту взамен целевых частей
  const handleApplyResultToMainText = () => {
    if (!session.resultText || isResultApplied) return;

    const targetIds =
      session.lastProcessedSectionIds ||
      lastTargetSectionsForApplication.map((s) => s.id) ||
      [];

    let targets = session.sections.filter((s) => targetIds.includes(s.id));
    if (targets.length === 0 && lastTargetSectionsForApplication.length > 0) {
      targets = lastTargetSectionsForApplication;
    }
    if (targets.length === 0) {
      targets = session.sections;
    }

    const unprotectedTargets = targets.filter((s) => !s.isProtected);
    const replacementText = lastUnprotectedReplacementText || session.resultText;

    let newSections = [...session.sections];
    if (unprotectedTargets.length > 0) {
      const primaryDir = getSectionDirection(targets[0]);
      const mergedSegment: SessionSection = {
        id: `sec-${Date.now()}-applied`,
        timestamp: targets[0]?.timestamp || '00:00',
        speaker: targets[0]?.speaker,
        language: targets[0]?.language,
        text: replacementText,
        isProtected: false,
        direction: primaryDir, // Сохраняет первичное направление целевых сегментов
        isEdited: true, // Признак red (подвергался постобработке / редактированный)
      };

      const unprotectedTargetIds = new Set(unprotectedTargets.map((u) => u.id));
      const filtered: SessionSection[] = [];
      let inserted = false;

      for (let i = 0; i < newSections.length; i++) {
        const sec = newSections[i];
        if (unprotectedTargetIds.has(sec.id)) {
          if (!inserted) {
            filtered.push(mergedSegment);
            inserted = true;
          }
        } else {
          filtered.push(sec);
        }
      }
      newSections = filtered;
      setSelectedSectionIds([mergedSegment.id]);
    }

    const op = session.lastProcessedOperation || currentOperation || 'normalize';
    const opNames: Record<AIService, string> = {
      normalize: 'Нормализация',
      summarize: 'Резюмирование',
      structure: 'Структурирование',
      translate: 'Перевод',
    };

    const countLabel =
      targets.length === session.sections.length
        ? 'всех сегментов'
        : `${targets.length} сегм.`;
    const snapshotTitle = `Применение: ${opNames[op]} (${countLabel})`;

    onUpdateSession({
      ...session,
      sections: newSections,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });

    commitNewVersion(newSections, snapshotTitle);
    setIsResultApplied(true);

    setAiToastMessage(`Результат применен к основному тексту (${countLabel})`);
    setTimeout(() => setAiToastMessage(null), 3200);
  };

  // 2. Сделать результат основным текстом (полная замена всех сегментов)
  const handleMakeResultMainText = () => {
    if (!session.resultText) return;
    const paragraphs = session.resultText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const primaryDir: SegmentDirection = session.scenario === 'import' ? 'in' : 'out';
    const newSections: SessionSection[] =
      paragraphs.length > 0
        ? paragraphs.map((text, idx) => ({
            id: `sec-${Date.now()}-${idx}`,
            timestamp: `00:${(idx * 15).toString().padStart(2, '0')}`,
            text,
            direction: primaryDir,
            isEdited: true, // red
          }))
        : [
            {
              id: `sec-${Date.now()}`,
              timestamp: '00:00',
              text: session.resultText,
              direction: primaryDir,
              isEdited: true, // red
            },
          ];

    commitNewVersion(newSections, 'Сделать результат основным текстом');
    setSelectedSectionIds([]);
    setIsResultApplied(true);
    setActiveTab('main_text');
    setAiToastMessage('Результат постобработки полностью заменил весь основной текст');
    setTimeout(() => setAiToastMessage(null), 3200);
  };

  // 3. Сохранить отдельным документом
  const handleSaveAsDocument = () => {
    if (!session.resultText) return;
    const opTitles: Record<AIService, string> = {
      normalize: 'Нормализация',
      summarize: 'Резюмирование',
      structure: 'Структурирование',
      translate: 'Перевод',
    };
    const op = session.lastProcessedOperation || currentOperation || 'normalize';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const docTitle = `${opTitles[op]} (${timeStr})`;

    const words = session.resultText.trim().split(/\s+/).length;

    const newDoc: SessionDocument = {
      id: `doc-${Date.now()}`,
      title: docTitle,
      type: 'ai_result',
      operation: opTitles[op],
      content: session.resultText,
      createdAt: 'Сегодня в ' + timeStr,
      wordCount: words,
    };

    const updatedDocs = [newDoc, ...(session.documents || [])];
    onUpdateSession({
      ...session,
      documents: updatedDocs,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });

    setAiToastMessage('Документ сохранен в перечне документов сессии');
    setTimeout(() => setAiToastMessage(null), 3000);
  };

  // 4. Копировать
  const handleCopyResult = async () => {
    if (!session.resultText) return;
    try {
      await navigator.clipboard.writeText(session.resultText);
      setCopyFeedback(true);
      setAiToastMessage('Результат скопирован в буфер обмена');
      setTimeout(() => setCopyFeedback(false), 2000);
      setTimeout(() => setAiToastMessage(null), 2500);
    } catch {
      // Fallback for clipboard
      const textarea = document.createElement('textarea');
      textarea.value = session.resultText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyFeedback(true);
      setAiToastMessage('Результат скопирован в буфер обмена');
      setTimeout(() => setCopyFeedback(false), 2000);
      setTimeout(() => setAiToastMessage(null), 2500);
    }
  };

  // 5. Очистить результат
  const handleClearResult = () => {
    onUpdateSession({
      ...session,
      resultText: undefined,
      lastProcessedOperation: undefined,
      lastProcessedSectionIds: undefined,
      updatedAt: 'Только что',
      timestampMs: Date.now(),
    });
    setIsResultApplied(true);
    setAiToastMessage('Поле результата очищено');
    setTimeout(() => setAiToastMessage(null), 2500);
  };

  // Delete saved document
  const handleDeleteDocument = (docId: string) => {
    const updated = (session.documents || []).filter((d) => d.id !== docId);
    onUpdateSession({
      ...session,
      documents: updated,
    });
    if (selectedDocForModal?.id === docId) {
      setSelectedDocForModal(null);
    }
  };

  // Quick export document text (file download + web share fallback if available)
  const handleExportDocumentText = async (title: string, text: string) => {
    if (!text || text.trim() === '') {
      setAiToastMessage('Документ пуст, нечего экспортировать');
      setTimeout(() => setAiToastMessage(null), 2500);
      return;
    }

    try {
      const sanitizedTitle = (title || 'document')
        .replace(/[/\\?%*:|"<>]/g, '_')
        .replace(/\s+/g, '_')
        .trim();
      const fileName = `${sanitizedTitle || 'document'}.txt`;

      // 1. Create a Blob and trigger standard .txt download
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setAiToastMessage(`Текст экспортирован в файл ${fileName} 📥`);
      setTimeout(() => setAiToastMessage(null), 3000);
    } catch {
      // Fallback: copy to clipboard if download was blocked
      try {
        await navigator.clipboard.writeText(text);
        setAiToastMessage('Текст скопирован в буфер обмена');
        setTimeout(() => setAiToastMessage(null), 2500);
      } catch {
        setAiToastMessage('Ошибка при экспорте документа');
        setTimeout(() => setAiToastMessage(null), 2500);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────
  // 9. SWIPE GESTURES FOR TABS
  // ─────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Detect horizontal swipe
    if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const idx = tabList.indexOf(activeTab);
      if (deltaX < 0 && idx < tabList.length - 1) {
        setActiveTab(tabList[idx + 1]);
      } else if (deltaX > 0 && idx > 0) {
        setActiveTab(tabList[idx - 1]);
      }
    }
  };

  const totalWordsInMainText = session.sections.reduce(
    (acc, s) => acc + s.text.trim().split(/\s+/).filter(Boolean).length,
    0
  );

  const operationLabels: Record<AIService, { label: string; desc: string }> = {
    normalize: { label: 'Нормализовать', desc: 'Удаление паразитов, пунктуация' },
    summarize: { label: 'Резюмировать', desc: 'Ключевые тезисы и выводы' },
    structure: { label: 'Структурировать', desc: 'По пунктам и разделам' },
    translate: { label: 'Перевести', desc: 'Синхронный перевод' },
  };

  return (
    <div
      className="flex flex-col h-full bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 select-none relative"
      onClick={() => {
        if (editingSectionId) handleSaveEditing();
        setIsVersionDropdownOpen(false);
        setIsOperationMenuOpen(false);
      }}
    >
      {/* ─────────────────────────────────────────────────────────────
          HEADER
          - Top row: Back arrow, Session scenario badge, Word-like Versioning (Undo / Dropdown / Redo)
          - Title row: Title (inline editable), Select All button
          - 3 TABS: [Основной текст] [Результат обработки] [Документы сессии]
          ───────────────────────────────────────────────────────────── */}
      <header className="px-3.5 pt-2 pb-2 border-b border-neutral-200/80 dark:border-neutral-850 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md z-30 shrink-0">
        {/* Top row: Back button & Versioning control */}
        <div className="flex items-center justify-between mb-1.5">
          <button
            id="btn-back-to-start"
            type="button"
            onClick={onBackToStart}
            className="flex items-center gap-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors p-1 -ml-1 rounded-lg cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Сессии</span>
          </button>

          {/* Top right actions: Version history control & Settings Gear button */}
          <div className="flex items-center gap-1.5">
            {/* Word-like Version history control */}
            <div
              className="relative flex items-center bg-neutral-100 dark:bg-neutral-850 rounded-lg p-0.5 border border-neutral-200/60 dark:border-neutral-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Undo button */}
              <button
                id="btn-undo-version"
                type="button"
                disabled={historyIndex === 0}
                onClick={handleUndo}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  historyIndex > 0
                    ? 'text-neutral-800 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-750 shadow-xs'
                    : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                }`}
                title="Откатить назад (Undo)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              {/* Version dropdown button */}
              <button
                id="btn-version-dropdown-toggle"
                type="button"
                onClick={() => setIsVersionDropdownOpen((prev) => !prev)}
                className="px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                title="Список версий и снэпшотов сессии"
              >
                <History className="w-3 h-3 text-neutral-400" />
                <span>v{historyIndex + 1}/{history.length}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {/* Redo button */}
              <button
                id="btn-redo-version"
                type="button"
                disabled={historyIndex >= history.length - 1}
                onClick={handleRedo}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  historyIndex < history.length - 1
                    ? 'text-neutral-800 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-750 shadow-xs'
                    : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
                }`}
                title="Повторить вперед (Redo)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              {/* Version dropdown menu */}
              {isVersionDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-1.5 z-50 text-left">
                  <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 px-2.5 py-1 uppercase tracking-wider">
                    История версий (снэпшоты)
                  </div>
                  <div className="max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-0.5">
                    {history.map((snap, idx) => {
                      const isCurrent = idx === historyIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleJumpToSnapshot(idx)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-medium">
                              v{idx + 1}: {snap.label}
                            </div>
                            <div className="text-[10px] opacity-70">
                              {snap.sections.length} сегм. · {snap.time}
                            </div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Gear Button */}
            <button
              id="btn-open-session-settings"
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="h-7 w-7 rounded-lg bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-300 flex items-center justify-center transition-colors cursor-pointer border border-neutral-200/60 dark:border-neutral-800 shrink-0"
              title="Настройки сессии (автоозвучка, автоприменение)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <div
              className="flex items-center gap-1.5 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 rounded-lg text-sm font-semibold text-neutral-900 dark:text-neutral-100 focus:outline-none w-full"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
            >
              <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">
                {session.title}
              </h2>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0">
                (изм.)
              </span>
            </div>
          )}

          {/* Select all button */}
          <button
            id="btn-toggle-select-all"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSelectAll();
            }}
            className={`h-7 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isAllSelected
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800'
                : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Выбрать все сегменты или снять выделение"
          >
            {isAllSelected ? (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Снять</span>
              </>
            ) : (
              <>
                <SquareEmpty className="w-3.5 h-3.5 text-neutral-500" />
                <span>Все ({session.sections.length})</span>
              </>
            )}
          </button>
        </div>

        {/* 3 TABS: [Основной текст] [Результат обработки] [Документы сессии] */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-100 dark:border-neutral-900">
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-850 p-0.5 rounded-xl flex-1 max-w-full overflow-x-auto no-scrollbar">
            {/* Tab 1: Основной текст */}
            <button
              id="tab-main-text"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('main_text');
              }}
              className={`flex-1 min-w-[95px] px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                activeTab === 'main_text'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
              }`}
            >
              <span>Основной текст</span>
              <span className="ml-1 text-[10px] opacity-75 font-normal">
                ({session.sections.length})
              </span>
            </button>

            {/* Tab 2: Результат обработки */}
            <button
              id="tab-ai-result"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('ai_result');
              }}
              className={`flex-1 min-w-[110px] px-2 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer text-center truncate ${
                activeTab === 'ai_result'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
              <span>Результат</span>
              {session.resultText && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              )}
            </button>

            {/* Tab 3: Документы сессии */}
            <button
              id="tab-documents"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('documents');
              }}
              className={`flex-1 min-w-[95px] px-2 py-1 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer text-center truncate ${
                activeTab === 'documents'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
              }`}
            >
              <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
              <span>Документы</span>
              <span className="ml-0.5 text-[10px] opacity-75 font-normal">
                ({(session.documents?.length || 0) + 1})
              </span>
            </button>
          </div>
        </div>

        {/* Swipe hint & selection counter */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 mt-1 px-0.5">
          {selectedSectionIds.length > 0 ? (
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
              Выбрано {selectedSectionIds.length} из {session.sections.length}
            </span>
          ) : (
            <span>Тап: выбор · Двойной тап: правка · Долгий тап: защита 🔒</span>
          )}
          <span className="opacity-70">Листайте свайпом влево/вправо</span>
        </div>

        {/* Translation language toggle */}
        {session.scenario === 'translation' && (
          <div className="mt-1 flex items-center justify-between px-2 py-1 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40">
            <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1">
              <Languages className="w-3 h-3" />
              Синхронный перевод
            </span>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setSpeakerLang('ru')}
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  speakerLang === 'ru'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 dark:text-emerald-300'
                }`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => setSpeakerLang('en')}
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  speakerLang === 'en'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-800 dark:text-emerald-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Floating Toast notification */}
      <AnimatePresence>
        {aiToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-28 left-4 right-4 z-40 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-3.5 py-2.5 rounded-xl text-xs font-medium shadow-lg flex items-center justify-between gap-2"
          >
            <span className="flex-1 leading-snug">{aiToastMessage}</span>
            {activeTab === 'main_text' && session.resultText && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ai_result');
                  setAiToastMessage(null);
                }}
                className="px-2 py-1 rounded-lg bg-white/20 dark:bg-neutral-900/20 hover:bg-white/30 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
              >
                К результату →
              </button>
            )}
            <button
              type="button"
              onClick={() => setAiToastMessage(null)}
              className="p-1 opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          MIDDLE CONTENT AREA (SWIPABLE ACROSS TABS)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-3.5 py-2.5 no-scrollbar relative min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ─────────────────── TAB 1: ОСНОВНОЙ ТЕКСТ ─────────────────── */}
        {activeTab === 'main_text' && (
          <div className="flex flex-col gap-2 pb-24">
            {/* Hidden file input for document & audio import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.md,.doc,.docx,.pdf,audio/*,.mp3,.wav,.m4a"
              className="hidden"
            />

            {/* Scenario = Import banner */}
            {session.scenario === 'import' && (
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/60 mb-0.5">
                <div className="flex items-center gap-2 text-xs text-blue-900 dark:text-blue-200">
                  <FileAudio className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">
                    Импортированные: <strong className="font-bold text-blue-700 dark:text-blue-300">in</strong> · Заметки/запись: <strong className="font-bold text-neutral-800 dark:text-neutral-200">out</strong>
                  </span>
                </div>
                <button
                  id="btn-import-header-action"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                  title="Импортировать файл или аудиозапись"
                >
                  <Upload className="w-3 h-3" />
                  <span>Импорт</span>
                </button>
              </div>
            )}

            {session.sections.length === 0 && (
              <div className="py-8 flex flex-col items-center justify-center text-center px-4 bg-neutral-50/70 dark:bg-neutral-900/40 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 my-2">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                  {session.scenario === 'import' ? (
                    <FileAudio className="w-6 h-6 text-blue-500" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </div>
                <h3 className="font-semibold text-sm text-neutral-800 dark:text-neutral-200">
                  {session.scenario === 'import'
                    ? 'Импорт документов и распознавание'
                    : 'В сессии пока нет записей'}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-[280px]">
                  {session.scenario === 'import'
                    ? 'Импортируйте текст или аудиозапись: созданные сегменты получают направление in, а ваши голосовые комментарии — out.'
                    : 'Нажмите кнопку «Записать» внизу, чтобы надиктовать первый сегмент (направление out).'}
                </p>

                {session.scenario === 'import' && (
                  <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                    <button
                      id="btn-upload-import-file"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Загрузить файл (.txt, .mp3, .wav)</span>
                    </button>
                    <button
                      id="btn-load-demo-import"
                      type="button"
                      onClick={() =>
                        handleImportDocument(
                          'interview_stenogram.mp3',
                          'В ходе технического аудита подтверждена стабильность распознавания речи.\n\nПользователи просят возможность дописывать аудиозаписи в существующие сессии и вставлять комментарии.\n\nСегменты входящего потока (in) изолируются от комментариев пользователя (out).'
                        )
                      }
                      className="w-full py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-200 dark:border-neutral-700"
                    >
                      <span>Загрузить демо-стенограмму (in)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* List of segments */}
            {session.sections.map((sec, index) => {
              const isSelected = selectedSectionIds.includes(sec.id);
              const isEditing = editingSectionId === sec.id;
              const isSecProtected = Boolean(sec.isProtected);
              const secDirection = getSectionDirection(sec);

              return (
                <div
                  key={sec.id}
                  id={`section-item-${sec.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSectionClick(sec);
                  }}
                  onPointerDown={() => handlePointerDown(sec.id)}
                  onPointerUp={handlePointerUpOrLeave}
                  onPointerLeave={handlePointerUpOrLeave}
                  className={`p-3 rounded-2xl transition-all relative group cursor-pointer ${
                    isEditing
                      ? 'bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-100 shadow-md ring-2 ring-neutral-900/10'
                      : isSecProtected && isSelected
                      ? 'bg-amber-50/80 dark:bg-amber-950/40 border-2 border-amber-500 shadow-xs ring-1 ring-amber-400'
                      : isSecProtected
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700/70'
                      : isSelected
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-400 dark:border-indigo-600 shadow-xs'
                      : 'bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/70 hover:border-neutral-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {/* Top metadata bar with:
                      - Checkbox window (tap to select/deselect)
                      - Lock window (tap to protect/unprotect)
                      - Direction badge (out / in)
                      - Edited badge (red)
                      - Timestamp & Speaker
                      - Reorder buttons (↑ / ↓)
                      - Split & Delete buttons */}
                  <div className="flex items-center justify-between mb-1.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Checkbox window */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSectionIds((prev) =>
                            prev.includes(sec.id)
                              ? prev.filter((id) => id !== sec.id)
                              : [...prev, sec.id]
                          );
                        }}
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-transparent'
                        }`}
                        title="Выделить сегмент"
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </button>

                      {/* Lock window */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleProtection(sec.id);
                        }}
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                          isSecProtected
                            ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                            : 'border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-400 hover:text-neutral-700'
                        }`}
                        title={
                          isSecProtected
                            ? 'Сегмент защищен (нажмите для снятия защиты)'
                            : 'Защитить сегмент от изменений'
                        }
                      >
                        {isSecProtected ? (
                          <Lock className="w-2.5 h-2.5" />
                        ) : (
                          <Unlock className="w-2.5 h-2.5 opacity-60" />
                        )}
                      </button>

                      {/* Direction indicator: OUT / IN (верхняя строка сегмента, там, где есть служебное обозначение) */}
                      <span
                        id={`direction-badge-${sec.id}`}
                        className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider flex items-center gap-0.5 border select-none shrink-0 ${
                          secDirection === 'out'
                            ? 'bg-neutral-100 text-neutral-800 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
                            : 'bg-blue-50 text-blue-700 border-blue-200/90 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/80'
                        }`}
                        title={
                          secDirection === 'out'
                            ? 'Направление сегмента: out (исходящий поток: диктовка мыслей, заметки, запись пользователя)'
                            : 'Направление сегмента: in (входящий поток: импортированный документ, распознавание)'
                        }
                      >
                        <span className="text-[10px] leading-none font-bold">
                          {secDirection === 'out' ? '↗' : '↙'}
                        </span>
                        <span>{secDirection}</span>
                      </span>

                      {/* Edited flag: red (сегменты, которые редактировались или подвергались постобработке) */}
                      {sec.isEdited && (
                        <span
                          id={`edited-badge-${sec.id}`}
                          className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900/80 flex items-center gap-1 shadow-2xs select-none shrink-0"
                          title="Признак red: сегмент редактировался пользователем или подвергался постобработке"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          <span>red</span>
                        </span>
                      )}

                      <span className="font-mono text-neutral-600 dark:text-neutral-400">
                        {sec.timestamp}
                      </span>
                      {sec.speaker && (
                        <span className="px-1.5 py-0.2 rounded bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                          {sec.speaker}
                        </span>
                      )}
                      <span className="opacity-75">#{index + 1}</span>

                      {isSecProtected && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-semibold text-[9px] flex items-center gap-0.5">
                          <Lock className="w-2 h-2" />
                          <span>Защищён</span>
                        </span>
                      )}
                    </div>

                    {/* Quick action tools on selected segment */}
                    {isSelected && !isEditing && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Move Up */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveSection(sec.id, 'up')}
                          className={`p-1 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer ${
                            index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-neutral-100'
                          }`}
                          title="Сместить сегмент вверх"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          disabled={index === session.sections.length - 1}
                          onClick={() => handleMoveSection(sec.id, 'down')}
                          className={`p-1 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 cursor-pointer ${
                            index === session.sections.length - 1
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:bg-neutral-100'
                          }`}
                          title="Сместить сегмент вниз"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Split in half */}
                        <button
                          type="button"
                          onClick={() => handleSplitInHalf(sec.id)}
                          className="px-1.5 py-1 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 flex items-center gap-0.5 cursor-pointer text-[10px]"
                          title="Разделить сегмент пополам"
                        >
                          <Scissors className="w-3 h-3" />
                          <span>Пополам</span>
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1 rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200 dark:border-red-900 cursor-pointer"
                          title="Удалить сегмент"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Segment Content: either in-place textarea OR static text */}
                  {isEditing ? (
                    <div
                      className="flex flex-col gap-2 mt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <textarea
                        ref={textareaRef}
                        value={editingText}
                        onChange={(e) => {
                          setEditingText(e.target.value);
                          setCursorPos(e.target.selectionStart);
                        }}
                        onSelect={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          setCursorPos(target.selectionStart);
                        }}
                        rows={3}
                        className="w-full text-sm leading-relaxed p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100"
                        placeholder="Введите или надиктуйте текст…"
                      />

                      {/* Editing Actions row */}
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-200 dark:border-neutral-800">
                        <div className="flex items-center gap-1">
                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            className="h-7 px-2 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Удалить</span>
                          </button>

                          {/* Split at cursor */}
                          <button
                            type="button"
                            onClick={() => handleSplitAtCursor(sec.id)}
                            className="h-7 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                            title="Разделить сегмент по точке курсора"
                          >
                            <Scissors className="w-3 h-3" />
                            <span>По курсору</span>
                          </button>

                          {/* Dictate into cursor */}
                          <button
                            type="button"
                            onClick={handleDictateIntoCursor}
                            className="h-7 px-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium flex items-center gap-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                          >
                            <Mic className="w-3 h-3" />
                            <span>В курсор</span>
                          </button>
                        </div>

                        {/* Direction & Status info during editing */}
                        <div className="flex items-center gap-1 text-[10px] text-neutral-400 dark:text-neutral-500">
                          <span className="font-mono font-semibold text-neutral-600 dark:text-neutral-300">
                            {secDirection}
                          </span>
                          <span>·</span>
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 inline-block" />
                            red
                          </span>
                        </div>

                        {/* Save */}
                        <button
                          id={`btn-save-editing-${sec.id}`}
                          type="button"
                          onClick={handleSaveEditing}
                          className="h-7 px-3 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-neutral-800 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Готово</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-normal">
                      {sec.text}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─────────────────── TAB 2: РЕЗУЛЬТАТ ОБРАБОТКИ ─────────────────── */}
        {activeTab === 'ai_result' && (
          <div className="flex flex-col h-full gap-2 pb-24">
            <div className="flex flex-col gap-1 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                    Результат пост-обработки
                  </h3>
                </div>

                {session.lastProcessedOperation && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 font-semibold text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80">
                    {operationLabels[session.lastProcessedOperation]?.label || 'Обработано'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Изолированный результат последнего действия (только выбранная целевая часть)
              </p>

              {/* Action buttons above the text field:
                  1. Сделать основным
                  2. Сохранить отдельным документом
                  3. Копировать в буфер (иконка)
                  4. Очистка (иконка крестик) */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* 1. Сделать основным */}
                  <button
                    id="btn-make-main-text"
                    type="button"
                    disabled={!session.resultText}
                    onClick={handleMakeResultMainText}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs truncate"
                    title="Содержимое поля результат полностью замещает весь основной текст"
                  >
                    <RotateCcw className="w-3 h-3 shrink-0" />
                    <span className="truncate">Сделать основным</span>
                  </button>

                  {/* 2. Сохранить отдельным документом */}
                  <button
                    id="btn-save-as-document"
                    type="button"
                    disabled={!session.resultText}
                    onClick={handleSaveAsDocument}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer border border-neutral-200/80 dark:border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed truncate"
                    title="Формирует отдельный текстовый документ в папке документы сессии"
                  >
                    <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                    <span className="truncate">Сохранить документом</span>
                  </button>
                </div>

                {/* Right action icons: Copy & Clear */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    id="btn-copy-result-clipboard"
                    type="button"
                    disabled={!session.resultText}
                    onClick={handleCopyResult}
                    className={`h-7 w-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed ${
                      copyFeedback
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                        : 'bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-800'
                    }`}
                    title="Копировать результат в буфер обмена"
                  >
                    {copyFeedback ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    id="btn-clear-result"
                    type="button"
                    disabled={!session.resultText}
                    onClick={handleClearResult}
                    className="h-7 w-7 rounded-xl bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer border border-neutral-200/80 dark:border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Очистить результат (X)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Result Card */}
            <div className="flex-1 p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-left overflow-y-auto min-h-[220px]">
              {isAiProcessing ? (
                <div className="flex flex-col items-center justify-center gap-2 text-xs text-neutral-500 py-12">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                  <span>ИИ формирует результат…</span>
                </div>
              ) : session.resultText ? (
                <div className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 font-normal whitespace-pre-line">
                  {session.resultText}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-neutral-400">
                  <Sparkles className="w-6 h-6 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                  Нажмите кнопку «Обработать» внизу, чтобы запустить нормализацию, резюме или перевод.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────── TAB 3: ДОКУМЕНТЫ СЕССИИ ─────────────────── */}
        {activeTab === 'documents' && (
          <div className="flex flex-col gap-2.5 pb-24">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
                Реестр документов
              </span>
              <span className="text-[10px] text-neutral-500">
                {(session.documents?.length || 0) + 1} элементов
              </span>
            </div>

            {/* Document 1: Main Session Text */}
            <div
              onClick={() => setShowMainTextDocModal(true)}
              className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 transition-all cursor-pointer flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      Основной текст сессии
                    </h4>
                    <span className="text-[10px] text-neutral-400">
                      {session.sections.length} сегм. · {totalWordsInMainText} слов · {session.updatedAt}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    id="btn-export-main-doc"
                    type="button"
                    onClick={() => {
                      const text = session.sections.map((s) => s.text).join('\n\n');
                      handleExportDocumentText(`${session.title}_основной_текст`, text);
                    }}
                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors"
                    title="Быстрый экспорт текста в файл (.txt)"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">Экспорт</span>
                  </button>
                  <button
                    id="btn-view-main-doc"
                    type="button"
                    onClick={() => setShowMainTextDocModal(true)}
                    className="px-2 py-1.5 rounded-lg bg-white dark:bg-neutral-800 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-750"
                    title="Просмотр документа"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Просмотр</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                {session.sections.map((s) => s.text).join(' ') || 'Пока нет надиктованных записей'}
              </p>
            </div>

            {/* Saved AI and Imported Documents */}
            {(session.documents || []).map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocForModal(doc)}
                className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 transition-all cursor-pointer flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      {doc.type === 'imported_audio' ? (
                        <FileAudio className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                        {doc.title}
                      </h4>
                      <span className="text-[10px] text-neutral-400">
                        {doc.wordCount} слов · {doc.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`btn-export-doc-${doc.id}`}
                      type="button"
                      onClick={() => handleExportDocumentText(doc.title, doc.content)}
                      className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center gap-1 text-[11px] font-medium cursor-pointer transition-colors"
                      title="Быстрый экспорт документа в файл (.txt)"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span className="hidden sm:inline">Экспорт</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDocForModal(doc)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                      title="Просмотреть"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 cursor-pointer"
                      title="Удалить документ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5 leading-relaxed">
                  {doc.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM TOOLBAR (ACTIVE TOOLBAR)
          - LEFT: «Озвучить»
          - CENTER: «Обработать» (с выбором режима: Нормализовать / Резюмировать / Структурировать / Перевести)
          - RIGHT: «Записать»
          ───────────────────────────────────────────────────────────── */}
      <footer
        className="h-20 px-3.5 border-t border-neutral-200/70 dark:border-neutral-900 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md flex items-center justify-between shrink-0 select-none z-20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ACTIVE MODE: SPEAKING AUDIO PLAYER */}
        {toolbarMode === 'speaking' ? (
          <div className="w-full flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleTogglePlayPause}
                className="w-10 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer"
              >
                {isSpeaking ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5 truncate">
                  <Volume2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{spokenTextLabel}</span>
                </div>
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  {isSpeaking ? 'Воспроизведение озвучки…' : 'Пауза'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const nextRate =
                    speechRate === 1.0 ? 1.25 : speechRate === 1.25 ? 1.5 : 1.0;
                  setSpeechRate(nextRate);
                  if (isSpeaking) {
                    const { text } = getSelectedTextForSpeech();
                    const lang =
                      session.scenario === 'translation' && text.match(/[a-zA-Z]{5,}/)
                        ? 'en-US'
                        : 'ru-RU';
                    SpeechHelper.speak(text, {
                      lang,
                      rate: nextRate,
                      onEnd: () => setIsSpeaking(false),
                      onError: () => setIsSpeaking(false),
                    });
                  }
                }}
                className="px-2 py-1 rounded-lg text-xs font-mono bg-neutral-100 dark:bg-neutral-850 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 cursor-pointer"
              >
                {speechRate}x
              </button>

              <button
                type="button"
                onClick={handleStopSpeaking}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                title="Остановить"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : toolbarMode === 'recording' ? (
          /* ACTIVE MODE: LIVE RECORDING */
          <div className="w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <span>{editingSectionId ? 'Запись в курсор' : 'Запись сегмента'}</span>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {formatTime(recordingSeconds)}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[190px]">
                  {liveTranscript}
                </div>
              </div>
            </div>

            <motion.button
              id="btn-stop-recording"
              type="button"
              onClick={handleStopRecording}
              whileTap={{ scale: 0.95 }}
              className="h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Закончить</span>
            </motion.button>
          </div>
        ) : activeTab === 'ai_result' ? (
          /* IDLE MODE IN RESULT TAB:
             - LEFT: «Озвучить» (результат)
             - RIGHT: «Применить» (к основному тексту) */
          <div className="w-full grid grid-cols-2 gap-2.5">
            {/* 1. Кнопка «Озвучить» */}
            <button
              id="btn-speak-result-footer"
              type="button"
              disabled={!session.resultText}
              onClick={handleStartSpeakingResult}
              className={`h-11 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !session.resultText
                  ? 'opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-neutral-850 text-neutral-400'
                  : isSpeaking
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
              }`}
              title="Озвучить изолированный результат постобработки"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {isSpeaking ? 'Пауза' : autoSpeakResult ? 'Повторить озвучку' : 'Озвучить'}
              </span>
            </button>

            {/* 2. Кнопка «Применить» */}
            <button
              id="btn-apply-result-footer"
              type="button"
              disabled={!session.resultText || isResultApplied}
              onClick={handleApplyResultToMainText}
              className={`h-11 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                !session.resultText || isResultApplied
                  ? 'bg-neutral-100 dark:bg-neutral-850 text-neutral-400 dark:text-neutral-500 border border-neutral-200/60 dark:border-neutral-800 cursor-not-allowed opacity-80'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer'
              }`}
              title={
                isResultApplied
                  ? 'Результат уже применен к основному тексту'
                  : 'Применить результат постобработки к целевым сегментам основного текста'
              }
            >
              {isResultApplied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Применено</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="truncate">Применить</span>
                </>
              )}
            </button>
          </div>
        ) : activeTab === 'documents' ? (
          /* IDLE MODE IN DOCUMENTS TAB:
             - LEFT: «К основному тексту»
             - RIGHT: «Озвучить сессию» */
          <div className="w-full flex items-center justify-between gap-2.5">
            <button
              id="btn-back-to-main-text"
              type="button"
              onClick={() => setActiveTab('main_text')}
              className="flex-1 h-11 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-200/80 dark:border-neutral-800 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>К основному тексту</span>
            </button>
            <button
              id="btn-speak-whole-session"
              type="button"
              onClick={handleStartSpeaking}
              className="flex-1 h-11 px-3 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Volume2 className="w-4 h-4" />
              <span>Озвучить сессию</span>
            </button>
          </div>
        ) : (
          /* IDLE MODE IN MAIN TEXT TAB: 3 BALANCED ACTION BUTTONS
             - LEFT: «Озвучить»
             - CENTER: «Обработать» (с раскрывающимся меню режимов)
             - RIGHT: «Записать» */
          <div className="w-full flex items-center justify-between gap-2">
            {/* 1. Кнопка «Озвучить» (слева) */}
            <button
              id="btn-speak-selected"
              type="button"
              disabled={Boolean(editingSectionId)}
              onClick={handleStartSpeaking}
              className={`flex-1 min-w-0 h-11 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                editingSectionId
                  ? 'opacity-40 cursor-not-allowed bg-neutral-100 dark:bg-neutral-850 text-neutral-400'
                  : selectedSectionIds.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-neutral-100 dark:bg-neutral-850 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800'
              }`}
              title="Озвучить выбранные сегменты или весь текст"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {selectedSectionIds.length > 0 ? `Озвучить (${selectedSectionIds.length})` : 'Озвучить'}
              </span>
            </button>

            {/* 2. Кнопка «Обработать» (посередине) с выпадающим меню */}
            <div className="relative flex-1 min-w-0 max-w-[170px]">
              <div className="flex items-center h-11 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-md shadow-amber-500/20 overflow-hidden">
                {/* Main click to execute operation */}
                <button
                  id="btn-process-action"
                  type="button"
                  disabled={isAiProcessing || Boolean(editingSectionId)}
                  onClick={() => handleRunProcessOperation(currentOperation)}
                  className={`flex-1 min-w-0 h-full px-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    isAiProcessing || editingSectionId ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={`Выполнить операцию: ${operationLabels[currentOperation].label}`}
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{operationLabels[currentOperation].label}</span>
                </button>

                {/* Dropdown toggle arrow */}
                <button
                  id="btn-process-menu-toggle"
                  type="button"
                  onClick={() => setIsOperationMenuOpen((prev) => !prev)}
                  className="h-full px-1.5 hover:bg-amber-600/70 border-l border-amber-400/40 cursor-pointer flex items-center justify-center shrink-0"
                  title="Выбрать режим обработки ИИ"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Popup menu above button */}
              {isOperationMenuOpen && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-1.5 z-50 text-left">
                  <div className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 px-2.5 py-1 uppercase tracking-wider">
                    Режим обработки ИИ
                  </div>
                  {(['normalize', 'summarize', 'structure', 'translate'] as AIService[]).map(
                    (op) => {
                      const isSel = currentOperation === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => {
                            setCurrentOperation(op);
                            setIsOperationMenuOpen(false);
                            handleRunProcessOperation(op);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex flex-col gap-0.5 transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-amber-500 text-white font-semibold'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{operationLabels[op].label}</span>
                            {isSel && <Check className="w-3.5 h-3.5 shrink-0" />}
                          </div>
                          <span
                            className={`text-[10px] leading-tight ${
                              isSel ? 'text-amber-100' : 'text-neutral-400 dark:text-neutral-500'
                            }`}
                          >
                            {operationLabels[op].desc}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>

            {/* 3. Кнопка «Записать» (справа) */}
            <motion.button
              id="btn-start-recording"
              type="button"
              onClick={handleStartRecording}
              whileTap={{ scale: 0.94 }}
              className={`flex-1 min-w-0 h-11 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0 ${
                editingSectionId
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 cursor-pointer'
                  : 'bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 shadow-md shadow-neutral-900/10 cursor-pointer'
              }`}
              title={
                editingSectionId
                  ? 'Надиктовать речь прямо в позицию курсора'
                  : 'Записать новый сегмент'
              }
            >
              <Mic className="w-4 h-4 stroke-[2.2] shrink-0" />
              <span className="truncate">{editingSectionId ? 'В курсор' : 'Записать'}</span>
            </motion.button>
          </div>
        )}
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DOCUMENT VIEWER (FOR 'ДОКУМЕНТЫ СЕССИИ')
          ───────────────────────────────────────────────────────────── */}
      {(selectedDocForModal || showMainTextDocModal) && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedDocForModal(null);
            setShowMainTextDocModal(false);
          }}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-4 max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-3">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  {showMainTextDocModal ? 'Основной текст сессии' : selectedDocForModal?.title}
                </h3>
                <span className="text-[10px] text-neutral-400">
                  {showMainTextDocModal
                    ? `${session.sections.length} сегментов · ${totalWordsInMainText} слов`
                    : `${selectedDocForModal?.wordCount} слов · ${selectedDocForModal?.createdAt}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDocForModal(null);
                  setShowMainTextDocModal(false);
                }}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 text-xs leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-line py-1">
              {showMainTextDocModal
                ? session.sections.map((s, idx) => `[${s.timestamp}] ${s.text}`).join('\n\n')
                : selectedDocForModal?.content}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800 mt-3">
              {/* Left action: Quick export to .txt */}
              <button
                id="btn-modal-export-document"
                type="button"
                onClick={() => {
                  const title = showMainTextDocModal
                    ? `${session.title}_основной_текст`
                    : selectedDocForModal?.title || 'документ';
                  const textToExport = showMainTextDocModal
                    ? session.sections.map((s, idx) => `[${s.timestamp}] ${s.text}`).join('\n\n')
                    : selectedDocForModal?.content || '';
                  handleExportDocumentText(title, textToExport);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Экспортировать текст документа в файл (.txt)"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Экспорт в .txt</span>
              </button>

              {/* Right actions: Copy & Close */}
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-modal-copy-document"
                  type="button"
                  onClick={async () => {
                    const textToCopy = showMainTextDocModal
                      ? session.sections.map((s) => s.text).join('\n\n')
                      : selectedDocForModal?.content || '';
                    await navigator.clipboard.writeText(textToCopy);
                    setAiToastMessage('Текст скопирован в буфер');
                    setTimeout(() => setAiToastMessage(null), 2000);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Копировать</span>
                </button>
                <button
                  id="btn-modal-close-document"
                  type="button"
                  onClick={() => {
                    setSelectedDocForModal(null);
                    setShowMainTextDocModal(false);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold cursor-pointer hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────
          MODAL: SESSION SETTINGS (АВТООЗВУЧКА, АВТОПРИМЕНЕНИЕ)
          ───────────────────────────────────────────────────────────── */}
      {isSettingsOpen && (
        <div
          id="modal-session-settings-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div
            id="modal-session-settings-card"
            className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-5 flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3.5 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                    Настройки сессии
                  </h3>
                  <p className="text-[10px] text-neutral-400">
                    Параметры постобработки и озвучивания
                  </p>
                </div>
              </div>
              <button
                id="btn-close-settings-modal"
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggles list */}
            <div className="flex flex-col gap-3.5">
              {/* Toggle 1: Автоприменение результата */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex-1 pr-1">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Автоприменение результата
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
                    Сразу применять результат постобработки в «Основной текст» без нажатия кнопки «Применить». Если выключено — результат отображается только во вкладке «Результат».
                  </div>
                </div>
                <button
                  id="toggle-auto-apply-result"
                  type="button"
                  role="switch"
                  aria-checked={autoApplyResult}
                  onClick={() => setAutoApplyResult((prev) => !prev)}
                  className={`w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors cursor-pointer mt-0.5 ${
                    autoApplyResult ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      autoApplyResult ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Автоозвучка результата */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-850/60 border border-neutral-200/60 dark:border-neutral-800">
                <div className="flex-1 pr-1">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Автоозвучка результата
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
                    После получения результата постобработки сразу запускать голосовое воспроизведение синтезом речи (только для поля «Результат»).
                  </div>
                </div>
                <button
                  id="toggle-auto-speak-result"
                  type="button"
                  role="switch"
                  aria-checked={autoSpeakResult}
                  onClick={() => setAutoSpeakResult((prev) => !prev)}
                  className={`w-11 h-6 shrink-0 rounded-full p-0.5 transition-colors cursor-pointer mt-0.5 ${
                    autoSpeakResult ? 'bg-indigo-600' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      autoSpeakResult ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
              <button
                id="btn-save-close-settings"
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-semibold cursor-pointer transition-colors shadow-xs"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
