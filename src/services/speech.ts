// Web Speech API helper for TTS and STT

export const SpeechHelper = {
  isTTSAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  speak(
    text: string,
    options: {
      lang?: string;
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: () => void;
    } = {}
  ): SpeechSynthesisUtterance | null {
    if (!this.isTTSAvailable()) {
      options.onEnd?.();
      return null;
    }

    try {
      window.speechSynthesis.cancel(); // cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'ru-RU';
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;

      utterance.onstart = () => {
        options.onStart?.();
      };
      utterance.onend = () => {
        options.onEnd?.();
      };
      utterance.onerror = () => {
        options.onError?.();
      };

      window.speechSynthesis.speak(utterance);
      return utterance;
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      options.onError?.();
      return null;
    }
  },

  stop(): void {
    if (this.isTTSAvailable()) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        console.warn('Speech stop error:', e);
      }
    }
  },

  pause(): void {
    if (this.isTTSAvailable()) {
      try {
        window.speechSynthesis.pause();
      } catch (e) {}
    }
  },

  resume(): void {
    if (this.isTTSAvailable()) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
    }
  },
};
