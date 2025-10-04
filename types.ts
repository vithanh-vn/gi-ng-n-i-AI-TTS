
export type LanguageCode = 'vi-VN' | 'en-US' | 'ja-JP' | 'ko-KR' | 'es-ES' | 'fr-FR' | 'de-DE' | 'cmn-CN' | 'ru-RU' | 'hi-IN';

export interface Language {
  code: LanguageCode;
  name: string;
}

export interface Voice {
  id: string; // Will use voiceURI from SpeechSynthesisVoice or custom ID for APIs
  name: string;
  gender: 'Male' | 'Female' | 'Neutral';
}

export interface SpeakerConfig {
  id: number;
  speakerName: string;
  voiceId: string;
}

export interface ParsedCue {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  speaker?: string;
}

export type VoiceProvider = 'browser' | 'fpt' | 'google' | 'microsoft';

export interface CustomVoice {
  id: string;
  name: string;
}
