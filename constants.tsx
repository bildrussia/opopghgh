
import React from 'react';
import { 
  MessageSquare, Code, GraduationCap, Palette, Database, 
  Scale, Brain, Heart, Briefcase, Languages, FileEdit, 
  Newspaper, Scroll, Rocket, Sparkles, User, Settings, Info,
  Plus, Trash2, History, Zap, Shield, Eye, Copy, RefreshCw, MessageCircle, Volume2, PlayCircle, Loader2, Lock, Mic, Trash
} from 'lucide-react';
import { Language, Preset } from './types';

export const PRESETS: Preset[] = [
  {
    id: 'general',
    name: {
      RU: 'Общий ассистент', EN: 'General Assistant', DE: 'Allgemeiner Assistent', FR: 'Assistant général',
      ES: 'Asistente general', IT: 'Assistente generale', JP: '総合アシスタント', CN: '通用助手',
      KR: '일반 어시스턴트', AR: 'مساعد عام', TR: 'Genel Asistan', PT: 'Assistente Geral'
    },
    icon: 'MessageSquare',
    systemPrompt: 'You are Zenith AI, a helpful general assistant. Be concise and professional. Current date: February 2026.',
    color: '#6366f1'
  },
  {
    id: 'coding',
    name: {
      RU: 'Архитектор кода', EN: 'Coding Architect', DE: 'Code-Architekt', FR: 'Architecte de code',
      ES: 'Arquitecto de código', IT: 'Architetto del codice', JP: 'コーディングアーキテクト', CN: '编程架构师',
      KR: '코딩 아키텍트', AR: 'مهندس البرمجيات', TR: 'Kod Mimarı', PT: 'Arquiteto de Código'
    },
    icon: 'Code',
    systemPrompt: 'You are an expert software architect. Provide clean, optimized code with explanations.',
    color: '#3b82f6'
  },
  {
    id: 'creative',
    name: {
      RU: 'Креативная муза', EN: 'Creative Muse', DE: 'Kreative Muse', FR: 'Muse créative',
      ES: 'Musa creativa', IT: 'Musa creativa', JP: 'クリエイティブミューズ', CN: '创意缪斯',
      KR: '창의적 뮤즈', AR: 'ملهمة إبداعية', TR: 'Yaratıcı İlham', PT: 'Muse Criativa'
    },
    icon: 'Palette',
    systemPrompt: 'You are an artistic visionary. You can help with design and even describe images to generate.',
    color: '#ec4899'
  },
  {
    id: 'zen',
    name: {
      RU: 'Zen Режим', EN: 'Zen Mode', DE: 'Zen-Modus', FR: 'Mode Zen',
      ES: 'Modo Zen', IT: 'Modalità Zen', JP: '禅モード', CN: '禅模式',
      KR: '젠 모드', AR: 'وضع زن', TR: 'Zen Modu', PT: 'Modo Zen'
    },
    icon: 'Sparkles',
    systemPrompt: 'You are a Zen master. Minimalistic speech. Focus on clarity and peace.',
    color: '#ffffff'
  }
];

// Add missing language keys to satisfy the Record<Language, any> type requirement.
export const TRANSLATIONS: Record<Language, any> = {
  [Language.RU]: {
    stop: 'СТОП', send: 'Отправить', settings: 'Настройки', profile: 'Профиль',
    search: 'Сообщение...', voiceMode: 'Голос', analyze: 'Анализ', copy: 'Копировать',
    retry: 'Переделать', reply: 'Ответить', copyCode: 'Копировать код',
    auth: 'Вход в Zenith', username: 'Имя пользователя', password: 'Пароль', login: 'Войти',
    stats: 'Статистика', requests: 'Запросов', favMode: 'Любимый режим',
    corePrompt: 'Глобальная инструкция', save: 'Сохранить',
    notifSaved: 'Настройки сохранены', notifCopied: 'Код скопирован',
    newChat: 'Новый чат', deleteChat: 'Удалить', history: 'История',
    onboardingTitle: 'Zenith AI',
    onboardingText: 'Персональная нейронная рабочая станция нового поколения.',
    onboardingStart: 'Инициализировать связь', selectLang: 'Выберите язык',
    chatTitle: 'Нейросеть', settingsTitle: 'Настройки', profileTitle: 'Профиль',
    addPhoto: 'Фото', genImage: 'Создать арт', updateBase: 'База 2026',
    interfaceGuide: 'Инструкция', uploading: 'Загрузка...',
    listen: 'Слушать', typing: 'Формирование ответа...',
    slideCancel: 'Проведите для отмены', releaseSend: 'Отпустите для отправки',
    locked: 'Запись закреплена'
  },
  [Language.EN]: {
    stop: 'STOP', send: 'Send', settings: 'Settings', profile: 'Profile',
    search: 'Message...', voiceMode: 'Voice', analyze: 'Analyze', copy: 'Copy',
    retry: 'Retry', reply: 'Reply', copyCode: 'Copy Code',
    auth: 'Zenith Gateway', username: 'Username', password: 'Password', login: 'Login',
    stats: 'Statistics', requests: 'Requests', favMode: 'Favorite Mode',
    corePrompt: 'Core Instruction', save: 'Save',
    notifSaved: 'Settings saved', notifCopied: 'Code copied',
    newChat: 'New Chat', deleteChat: 'Delete', history: 'History',
    onboardingTitle: 'Zenith AI',
    onboardingText: 'Next-generation personal neural workstation.',
    onboardingStart: 'Initialize Link', selectLang: 'Select Language',
    chatTitle: 'Neural Net', settingsTitle: 'Settings', profileTitle: 'Profile',
    addPhoto: 'Photo', genImage: 'Generate Art', updateBase: 'Base 2026',
    interfaceGuide: 'Manual', uploading: 'Uploading...',
    listen: 'Listen', typing: 'Neural stream active...',
    slideCancel: 'Slide to cancel', releaseSend: 'Release to send',
    locked: 'Recording locked'
  },
  [Language.DE]: { stop: 'STOPP', send: 'Senden', settings: 'Einstellungen', profile: 'Profil', search: 'Nachricht...', chatTitle: 'Neuralnetz', settingsTitle: 'Einstellungen', profileTitle: 'Profil', newChat: 'Neuer Chat', history: 'Verlauf', onboardingTitle: 'Zenith AI', onboardingText: 'Persönliche neuronale Workstation der nächsten Generation.', onboardingStart: 'Verbindung initialisieren', selectLang: 'Sprache wählen', typing: 'Neuraler Stream aktiv...' },
  [Language.FR]: { stop: 'ARRÊT', send: 'Envoyer', settings: 'Paramètres', profile: 'Profil', search: 'Message...', chatTitle: 'Réseau Neuronal', settingsTitle: 'Paramètres', profileTitle: 'Profil', newChat: 'Nouveau Chat', history: 'Historique', onboardingTitle: 'Zenith AI', onboardingText: 'Station de travail neurale personnelle de nouvelle génération.', onboardingStart: 'Initialiser le lien', selectLang: 'Choisir la langue', typing: 'Flux neural actif...' },
  [Language.ES]: { stop: 'PARAR', send: 'Enviar', settings: 'Ajustes', profile: 'Perfil', search: 'Mensaje...', chatTitle: 'Red Neuronal', settingsTitle: 'Ajustes', profileTitle: 'Perfil', newChat: 'Nuevo Chat', history: 'Historial', onboardingTitle: 'Zenith AI', onboardingText: 'Estación de trabajo neuronal personal de próxima generación.', onboardingStart: 'Inicializar enlace', selectLang: 'Seleccionar idioma', typing: 'Flujo neural activo...' },
  [Language.IT]: { stop: 'STOP', send: 'Invia', settings: 'Impostazioni', profile: 'Profilo', search: 'Messaggio...', chatTitle: 'Rete Neurale', settingsTitle: 'Impostazioni', profileTitle: 'Profilo', newChat: 'Nuova Chat', history: 'Cronologia', onboardingTitle: 'Zenith AI', onboardingText: 'Stazione di lavoro neurale personale di prossima generazione.', onboardingStart: 'Inizializza collegamento', selectLang: 'Seleziona lingua', typing: 'Flusso neurale attivo...' },
  [Language.JP]: { stop: '停止', send: '送信', settings: '設定', profile: 'プロフィール', search: 'メッセージ...', chatTitle: 'ニューラルネット', settingsTitle: '設定', profileTitle: 'プロフィール', newChat: '新しいチャット', history: '履歴', onboardingTitle: 'Zenith AI', onboardingText: '次世代のパーソナル・ニューラル・ワークステーション。', onboardingStart: 'リンクを初期化', selectLang: '言語を選択', typing: 'ニューラルストリームアクティブ...' },
  [Language.CN]: { stop: '停止', send: '发送', settings: '设置', profile: '个人资料', search: '消息...', chatTitle: '神经网络', settingsTitle: '设置', profileTitle: '个人资料', newChat: '新对话', history: '历史', onboardingTitle: 'Zenith AI', onboardingText: '下一代个人神经工作站。', onboardingStart: '初始化链接', selectLang: '选择语言', typing: '神经流活动中...' },
  [Language.KR]: { stop: '중지', send: '전송', settings: '설정', profile: '프로필', search: '메시지...', chatTitle: '신경망', settingsTitle: '설정', profileTitle: '프로필', newChat: '새 채팅', history: '기록', onboardingTitle: 'Zenith AI', onboardingText: '차세대 개인 신경 워크스테이션.', onboardingStart: '링크 초기화', selectLang: '언어 선택', typing: '신경 스트림 활성...' },
  [Language.AR]: { stop: 'إيقاف', send: 'إرسال', settings: 'الإعدادات', profile: 'الملف الشخصي', search: 'رسالة...', chatTitle: 'الشبكة العصبية', settingsTitle: 'الإعدادات', profileTitle: 'الملف الشخصي', newChat: 'دردشة جديدة', history: 'السجل', onboardingTitle: 'Zenith AI', onboardingText: 'محطة عمل عصبية شخصية من الجيل القادم.', onboardingStart: 'تهيئة الرابط', selectLang: 'اختر اللغة', typing: 'البث العصبي نشط...' },
  [Language.TR]: { stop: 'DURDUR', send: 'Gönder', settings: 'Ayarlar', profile: 'Profil', search: 'Mesaj...', chatTitle: 'Nöral Ağ', settingsTitle: 'Ayarlar', profileTitle: 'Profil', newChat: 'Yeni Sohbet', history: 'Geçmiş', onboardingTitle: 'Zenith AI', onboardingText: 'Yeni nesil kişisel nöral iş istasyonu.', onboardingStart: 'Bağlantıyı Başlat', selectLang: 'Dil Seçin', typing: 'Nöral akış aktif...' },
  [Language.PT]: { stop: 'PARAR', send: 'Enviar', settings: 'Configurações', profile: 'Perfil', search: 'Mensagem...', chatTitle: 'Rede Neural', settingsTitle: 'Configurações', profileTitle: 'Perfil', newChat: 'Novo Chat', history: 'Histórico', onboardingTitle: 'Zenith AI', onboardingText: 'Estação de trabalho neural pessoal de próxima geração.', onboardingStart: 'Inicializar link', selectLang: 'Selecionar idioma', typing: 'Fluxo neural ativo...' }
};

export const IconMap: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare size={18} />,
  Code: <Code size={18} />,
  GraduationCap: <GraduationCap size={18} />,
  Palette: <Palette size={18} />,
  Database: <Database size={18} />,
  Scale: <Scale size={18} />,
  Brain: <Brain size={18} />,
  Heart: <Heart size={18} />,
  Briefcase: <Briefcase size={18} />,
  Languages: <Languages size={18} />,
  FileEdit: <FileEdit size={18} />,
  Newspaper: <Newspaper size={18} />,
  Scroll: <Scroll size={18} />,
  Rocket: <Rocket size={18} />,
  Sparkles: <Sparkles size={18} />,
  User: <User size={18} />,
  Settings: <Settings size={18} />,
  Info: <Info size={18} />,
  Plus: <Plus size={18} />,
  Trash2: <Trash2 size={16} />,
  History: <History size={18} />,
  Zap: <Zap size={18} />,
  Shield: <Shield size={18} />,
  Eye: <Eye size={18} />,
  Copy: <Copy size={16} />,
  Retry: <RefreshCw size={16} />,
  Reply: <MessageCircle size={16} />,
  Volume2: <Volume2 size={16} />,
  PlayCircle: <PlayCircle size={16} />,
  Loader: <Loader2 size={16} className="animate-spin" />,
  Lock: <Lock size={16} />,
  Mic: <Mic size={20} />,
  Trash: <Trash size={18} />
};
