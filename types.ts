
export enum Language {
  RU = 'RU', EN = 'EN', DE = 'DE', FR = 'FR', ES = 'ES',
  IT = 'IT', JP = 'JP', CN = 'CN', KR = 'KR', AR = 'AR',
  TR = 'TR', PT = 'PT'
}

export interface User {
  nickname: string;
  avatar: string;
  onboardingSeen: boolean;
  stats: {
    totalRequests: number;
    favMode: string;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'text' | 'code' | 'image' | 'generation';
  imageUrl?: string;
}

export interface Chat {
  id: string;
  title: string;
  presetId: string;
  messages: Message[];
  lastModified: number;
}

export interface Preset {
  id: string;
  name: Record<Language, string>;
  icon: string;
  systemPrompt: string;
  color: string;
}

export interface AppSettings {
  language: Language;
  accentColor: string;
  darkMode: boolean;
  backgroundType: string;
  coreInstruction: string;
  voiceId: string;
  voiceSpeed: number;
  voicePitch: number;
}
