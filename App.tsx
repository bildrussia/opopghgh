
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Send, StopCircle, Mic, Image as ImageIcon, X, 
  Settings as SettingsIcon, LogOut, 
  Copy, Menu, Volume2, Rocket, Plus, Trash2,
  Zap, Info, Camera, Languages, Palette, LayoutGrid,
  RefreshCw, MessageCircle, Check, Code as CodeIcon,
  PlayCircle, Loader2, Lock, Trash, ChevronLeft, Sparkles, FlipHorizontal
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Language, User, Message, Preset, Chat } from './types';
import { PRESETS, TRANSLATIONS, IconMap } from './constants';

// --- Audio Helper Functions ---
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  // --- Core State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [onboardingVisible, setOnboardingVisible] = useState<boolean>(false);
  const [user, setUser] = useState<User>({
    nickname: 'Operator',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    onboardingSeen: false,
    stats: { totalRequests: 0, favMode: 'General' }
  });

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);
  const [inputText, setInputText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(window.innerWidth > 1024);
  const [currentTab, setCurrentTab] = useState<'chat' | 'profile' | 'settings'>('chat');
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [accentColor, setAccentColor] = useState<string>('#6366f1');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [voiceProcessingId, setVoiceProcessingId] = useState<string | null>(null);

  // Advanced Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Image Generation Mode
  const [isGenerationMode, setIsGenerationMode] = useState<boolean>(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Derive activeChat from state
  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

  // --- Initialization ---
  useEffect(() => {
    const savedAuth = localStorage.getItem('zenith_auth');
    if (savedAuth === 'true') setIsAuthenticated(true);
    
    const savedUser = localStorage.getItem('zenith_user');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (!parsed.onboardingSeen) setOnboardingVisible(true);
    } else {
        setOnboardingVisible(true);
    }

    const savedChats = localStorage.getItem('zenith_chats');
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
          const lastActiveId = localStorage.getItem('zenith_active_chat_id');
          const found = parsedChats.find((c: Chat) => c.id === lastActiveId);
          setActiveChatId(found ? found.id : parsedChats[0].id);
      }
    }

    const savedSettings = localStorage.getItem('zenith_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setLanguage(parsed.language);
      setAccentColor(parsed.accentColor);
      document.documentElement.style.setProperty('--accent-color', parsed.accentColor);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    localStorage.setItem('zenith_chats', JSON.stringify(chats));
    localStorage.setItem('zenith_user', JSON.stringify(user));
    if (activeChatId) localStorage.setItem('zenith_active_chat_id', activeChatId);
    
    const settings = { language, accentColor };
    localStorage.setItem('zenith_settings', JSON.stringify(settings));
  }, [chats, user, activeChatId, language, accentColor, isGenerating]);

  const t = (key: string) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS[Language.EN][key] || key;
  };

  // --- Camera Logic ---
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setIsCameraOpen(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      alert("Camera access denied. Please check permissions.");
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setUploadedImage(canvas.toDataURL('image/jpeg'));
        closeCamera();
      }
    }
  };

  // Helper function to create a new chat
  const createNewChat = (preset: Preset = activePreset) => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: `${preset.name[language]} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      presetId: preset.id,
      messages: [],
      lastModified: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setActivePreset(preset);
    setCurrentTab('chat');
  };

  // Helper function to delete a chat
  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  // Helper function to handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImage(reader.result as string);
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // --- Voice Messaging Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (stopRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioMessage(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      stopRef.current = false;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      stopRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const handleAudioMessage = async (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = async () => {
      const base64Audio = (reader.result as string).split(',')[1];
      handleSendMessage(`[Audio Message]`, base64Audio);
    };
  };

  const handleSendMessage = async (textOverride?: string, audioBase64?: string) => {
    let content = textOverride || inputText;
    if (!content.trim() && !uploadedImage && !audioBase64 || isGenerating) return;

    if (!activeChatId) {
        createNewChat();
        return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content === '[Audio Message]' ? t('voiceMode') : content,
      timestamp: Date.now(),
      imageUrl: uploadedImage || undefined
    };

    setChats(prev => prev.map(c => c.id === activeChatId ? {
      ...c, 
      messages: [...c.messages, newMessage],
      lastModified: Date.now()
    } : c));

    setInputText('');
    setUploadedImage(null);
    setIsGenerating(true);
    stopRef.current = false;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentHistory = activeChat?.messages || [];
      
      const parts: any[] = [{ text: isGenerationMode ? `GENERATE IMAGE: ${content}` : content }];
      if (newMessage.imageUrl) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: newMessage.imageUrl.split(',')[1] } });
      }
      if (audioBase64) {
          parts.push({ inlineData: { mimeType: 'audio/webm', data: audioBase64 } });
      }

      const isImageRequest = isGenerationMode || content.toLowerCase().includes('create') || content.toLowerCase().includes('draw') || content.toLowerCase().includes('нарисуй');
      const modelName = isImageRequest ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          ...currentHistory.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: parts }
        ],
        config: {
            systemInstruction: isImageRequest 
              ? "You are an AI Image Generator. When asked to create or draw something, provide the image data. Always reply with the image part." 
              : `${activePreset.systemPrompt}. February 2026 cutoff. You are an expert AI workstation.`,
            temperature: 0.8
        }
      });

      if (stopRef.current) return;

      const responseParts = response.candidates?.[0]?.content?.parts || [];
      const aiMsgs: Message[] = responseParts.map((p, i) => {
        if (p.inlineData) return { id: `${Date.now()}-${i}`, role: 'assistant', content: 'Neural Stream Visualization:', timestamp: Date.now(), type: 'generation', imageUrl: `data:image/png;base64,${p.inlineData.data}` };
        if (p.text) return { id: `${Date.now()}-${i}`, role: 'assistant', content: p.text, timestamp: Date.now() };
        return null;
      }).filter(Boolean) as Message[];

      if (aiMsgs.length > 0) {
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages: [...c.messages, ...aiMsgs] } : c));
      }
      setUser(prev => ({ ...prev, stats: { ...prev.stats, totalRequests: prev.stats.totalRequests + 1 } }));
      setIsGenerationMode(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVoice = async (msg: Message) => {
    if (voiceProcessingId === msg.id) return;
    setVoiceProcessingId(msg.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: msg.content }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new AudioContext({sampleRate: 24000});
        const ctx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        source.onended = () => setVoiceProcessingId(null);
      } else setVoiceProcessingId(null);
    } catch (err) {
      console.error(err);
      setVoiceProcessingId(null);
    }
  };

  const handleMicToggle = () => {
    if (isRecording) {
      stopAndSendRecording();
    } else {
      startRecording();
    }
  };

  // --- Components ---
  const Onboarding = () => (
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="max-w-xl w-full glass-effect p-12 rounded-[3.5rem] border border-white/10 text-center space-y-10 animate-in zoom-in duration-700 shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-2xl relative">
          <Zap size={40} className="accent-text" />
          <div className="absolute inset-0 bg-white/5 animate-pulse rounded-[2.5rem]" />
        </div>
        <div className="space-y-4">
          <h2 className="text-5xl font-black uppercase tracking-tighter">{t('onboardingTitle')}</h2>
          <p className="text-white/50 font-medium leading-relaxed px-4">{t('onboardingText')}</p>
        </div>
        <div className="space-y-8 pt-4">
          <div className="space-y-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase">{t('selectLang')}</span>
            <div className="grid grid-cols-2 gap-3">
               {[Language.EN, Language.RU].map(l => (
                 <button 
                   key={l} 
                   onClick={() => setLanguage(l)}
                   className={`p-5 rounded-3xl border transition-all font-black text-xs ${language === l ? 'bg-white text-black border-white scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/40'}`}
                 >
                   {l}
                 </button>
               ))}
            </div>
          </div>
          <button 
            onClick={() => {
              setUser(prev => ({ ...prev, onboardingSeen: true }));
              setOnboardingVisible(false);
            }} 
            className="w-full py-6 text-white font-black rounded-[2rem] transition-all hover:scale-[1.02] active:scale-95 shadow-2xl accent-bg"
          >
            {t('onboardingStart')}
          </button>
        </div>
      </div>
    </div>
  );

  const MessageBubble = ({ msg }: { msg: Message }) => {
      const parts = msg.content.split(/(```[\s\S]*?```)/g);
      const copyText = () => { navigator.clipboard.writeText(msg.content); alert(t('notifCopied')); };
      
      return (
          <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-6 duration-700 message-container relative group`}>
              <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`p-5 md:p-6 rounded-[2.5rem] text-sm md:text-base leading-relaxed relative ${
                      msg.role === 'user' ? 'text-white rounded-tr-none accent-bg' : 'glass-effect bg-black/60 border-white/5 rounded-tl-none shadow-xl'
                  }`} style={{ backgroundColor: msg.role === 'user' ? 'var(--accent-color)' : undefined }}>
                      {msg.imageUrl && (
                          <img src={msg.imageUrl} className="max-w-full rounded-2xl mb-4 shadow-xl border border-white/10" alt="Neural" />
                      )}
                      <div className="whitespace-pre-wrap font-medium">
                          {parts.map((part, i) => (
                              part.startsWith('```') ? (
                                <div key={i} className="my-4 overflow-hidden rounded-2xl bg-[#0d1117] border border-white/10 shadow-2xl">
                                    <div className="px-4 py-2 border-b border-white/10 flex justify-between items-center bg-white/5">
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-white/40">{part.match(/```(\w+)?/)?.[1] || 'code'}</span>
                                        <button onClick={() => { navigator.clipboard.writeText(part.replace(/```\w*\n?/, '').replace(/```$/, '').trim()); alert(t('notifCopied')); }} className="text-white/40 hover:text-white transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase"><Copy size={12} /> {t('copyCode')}</button>
                                    </div>
                                    <pre className="p-4 overflow-x-auto text-xs font-mono text-indigo-300"><code>{part.replace(/```\w*\n?/, '').replace(/```$/, '').trim()}</code></pre>
                                </div>
                              ) : <span key={i}>{part}</span>
                          ))}
                      </div>
                      
                      <div className={`message-menu absolute ${msg.role === 'user' ? '-left-12 md:-left-24' : '-right-12 md:-right-24'} top-0 flex flex-col gap-2 p-1.5 glass-effect rounded-2xl border-white/10 shadow-2xl z-10`}>
                          <button onClick={copyText} title={t('copy')} className="p-2 hover:bg-white/10 rounded-xl transition-all"><Copy size={14}/></button>
                          {msg.role === 'assistant' && (
                            <button onClick={() => handleGenerateVoice(msg)} title={t('listen')} className="p-2 hover:bg-white/10 rounded-xl transition-all text-indigo-400">
                                {voiceProcessingId === msg.id ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14}/>}
                            </button>
                          )}
                      </div>
                  </div>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mx-4">
                      {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </span>
              </div>
          </div>
      );
  };

  const SidebarButton = ({ children, onClick, active, label }: any) => (
    <div className="sidebar-btn-container w-full flex justify-center">
        <button
            onClick={onClick}
            className={`group flex items-center transition-all duration-300 relative ${
              isSidebarOpen 
              ? 'w-full gap-4 p-4 rounded-3xl' 
              : 'w-12 h-12 justify-center rounded-2xl p-0'
            } ${active ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}
        >
            <div className="sidebar-icon-wrapper text-white/40 transition-colors shrink-0 flex items-center justify-center min-w-[20px]" style={{ color: active ? 'var(--accent-color)' : undefined }}>
                {children}
            </div>
            {isSidebarOpen && (
                <div className="flex flex-col items-start overflow-hidden transition-opacity duration-500 opacity-100 w-full text-left">
                    <span className="text-xs font-black uppercase tracking-tight truncate w-full">{label}</span>
                </div>
            )}
        </button>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#050505] p-0 md:p-4 lg:p-6 gap-0 md:gap-4 lg:gap-6">
      {onboardingVisible && <Onboarding />}

      {/* Camera Interface Overlay */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center justify-center p-4 md:p-10 animate-in fade-in duration-500">
           <video ref={videoRef} autoPlay playsInline className="w-full max-w-2xl h-auto rounded-[3rem] shadow-[0_0_50px_rgba(255,255,255,0.1)] border border-white/10 mb-8" />
           <div className="flex items-center gap-6">
              <button onClick={closeCamera} className="p-6 bg-white/5 border border-white/10 rounded-full text-white/50 hover:bg-white/10 transition-all"><X size={32}/></button>
              <button onClick={capturePhoto} className="p-10 bg-white rounded-full text-black hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_#fff]"><Camera size={40}/></button>
              <button className="p-6 bg-white/5 border border-white/10 rounded-full text-white/50 hover:bg-white/10 transition-all"><RefreshCw size={32}/></button>
           </div>
        </div>
      )}

      {/* Sidebar Overlay for Mobile */}
      {window.innerWidth < 1024 && isSidebarOpen && (
        <div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`glass-effect-heavy fixed lg:relative z-[150] flex flex-col transition-all duration-700 ease-out h-full border-none lg:rounded-[3rem] ${isSidebarOpen ? 'w-full md:w-80 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-20'} overflow-hidden shadow-2xl`}>
        <div className="p-8 flex items-center justify-between border-b border-white/5">
          {isSidebarOpen && <span className="font-black tracking-tighter text-3xl accent-text">ZENITH</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all text-white/60">
            {isSidebarOpen ? <ChevronLeft size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto scroll-hide p-4 space-y-8">
            <div className="space-y-3 flex justify-center">
                <button onClick={() => createNewChat()} className={`flex items-center transition-all rounded-[2rem] font-black hover:scale-[1.03] active:scale-95 shadow-xl accent-bg ${isSidebarOpen ? 'w-full gap-4 p-4' : 'w-12 h-12 justify-center p-0'}`} style={{ backgroundColor: 'var(--accent-color)', color: '#fff' }}>
                    <Plus size={20} /> {isSidebarOpen && t('newChat')}
                </button>
            </div>

            <div className="space-y-3">
                {isSidebarOpen && <span className="text-[10px] font-bold tracking-widest text-white/20 uppercase ml-4">{t('history')}</span>}
                <div className="space-y-2">
                    {chats.map(chat => (
                        <button key={chat.id} onClick={() => { setActiveChatId(chat.id); setCurrentTab('chat'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`w-full group flex items-center justify-between transition-all ${isSidebarOpen ? 'p-4 rounded-3xl' : 'p-0 w-12 h-12 justify-center rounded-2xl mx-auto'} ${activeChatId === chat.id ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="min-w-[10px] h-[10px] rounded-full shrink-0" style={{ backgroundColor: PRESETS.find(p => p.id === chat.presetId)?.color || '#fff' }} />
                                {isSidebarOpen && <span className="text-sm font-bold truncate text-left">{chat.title}</span>}
                            </div>
                            {isSidebarOpen && <button onClick={(e) => deleteChat(chat.id, e as any)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-500/20 text-red-400 rounded-xl transition-all shrink-0"><Trash2 size={16} /></button>}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="space-y-3">
                {isSidebarOpen && <span className="text-[10px] font-bold tracking-widest text-white/20 uppercase ml-4">Presets</span>}
                <div className="flex flex-col gap-2">
                    {PRESETS.map(preset => (
                        <SidebarButton key={preset.id} onClick={() => createNewChat(preset)} active={activePreset.id === preset.id} label={preset.name[language]}>
                            {IconMap[preset.icon]}
                        </SidebarButton>
                    ))}
                </div>
            </div>
        </div>

        <div className="p-6 border-t border-white/5 space-y-3">
             <button onClick={() => setCurrentTab('profile')} className={`flex items-center transition-all ${isSidebarOpen ? 'w-full gap-4 p-3 rounded-2xl' : 'w-12 h-12 justify-center rounded-xl mx-auto'} ${currentTab === 'profile' ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                <img src={user.avatar} className="w-8 h-8 rounded-full ring-1 ring-white/20 shrink-0" alt="Av" />
                {isSidebarOpen && <span className="text-sm font-bold truncate">{user.nickname}</span>}
             </button>
             <button onClick={() => setCurrentTab('settings')} className={`flex items-center transition-all ${isSidebarOpen ? 'w-full gap-4 p-3 rounded-2xl' : 'w-12 h-12 justify-center rounded-xl mx-auto'} ${currentTab === 'settings' ? 'bg-white/10 ring-1 ring-white/10' : 'hover:bg-white/5'}`}>
                <div className="w-8 flex items-center justify-center shrink-0"><SettingsIcon size={18} className="text-white/50" /></div>
                {isSidebarOpen && <span className="text-sm font-bold">{t('settings')}</span>}
             </button>
        </div>
      </aside>

      {/* Main Display */}
      <main className="flex-1 flex flex-col glass-effect relative overflow-hidden md:rounded-[3.5rem] border-none shadow-2xl h-full">
        <header className="px-6 md:px-10 py-4 md:py-6 border-b border-white/5 flex items-center justify-between sticky top-0 z-[100] glass-effect-heavy">
           <div className="flex items-center gap-4">
               <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-white/5 rounded-xl transition-colors"><Menu size={22} /></button>
               <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter leading-none">
                   {currentTab === 'chat' ? (activeChat?.title?.split(' - ')[0] || t('chatTitle')) : t(currentTab + 'Title')}
               </h2>
           </div>
           <div className="flex items-center gap-2">
                <div className="hidden md:flex bg-black/40 p-1 rounded-2xl border border-white/5">
                    {['chat', 'settings'].map(tab => (
                        <button key={tab} onClick={() => setCurrentTab(tab as any)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${currentTab === tab ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>
                            {t(tab === 'chat' ? 'chatTitle' : 'settingsTitle')}
                        </button>
                    ))}
                </div>
                <button onClick={() => createNewChat()} className="p-2 md:hidden bg-white/5 rounded-xl"><Plus size={20}/></button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scroll-hide">
            {currentTab === 'chat' && (
                <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 pb-40">
                    {!activeChatId || chats.length === 0 ? (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in zoom-in duration-1000">
                             <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center relative shadow-2xl">
                                <Rocket size={48} className="accent-text" />
                             </div>
                             <h3 className="text-3xl font-black uppercase tracking-tighter">{t('onboardingTitle')}</h3>
                             <button onClick={() => createNewChat()} className="px-10 py-5 text-white font-black rounded-3xl transition-all shadow-2xl accent-bg">
                                {t('newChat')}
                             </button>
                        </div>
                    ) : (
                        <>
                          {activeChat?.messages.length === 0 && (
                            <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-1000 pointer-events-none">
                              <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center relative shadow-2xl">
                                <Sparkles size={32} className="text-white/20" />
                                <div className="absolute inset-0 bg-white/5 animate-pulse rounded-[2rem]" />
                              </div>
                              <div className="space-y-2">
                                <h3 className="text-lg font-black uppercase tracking-[0.2em] text-white/30">ZENITH CORE: READY</h3>
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/10">Neural link established. Awaiting input.</p>
                              </div>
                            </div>
                          )}
                          {activeChat?.messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                          {isGenerating && (
                            <div className="flex justify-start animate-in slide-in-from-bottom-6 duration-700">
                              <div className="max-w-[85%] space-y-3 flex flex-col items-start">
                                <div className="p-5 md:p-6 rounded-[2.5rem] text-sm leading-relaxed glass-effect bg-black/60 border-white/5 rounded-tl-none flex items-center gap-3">
                                  <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce"></div>
                                  </div>
                                  <span className="text-white/40 font-bold uppercase tracking-widest text-[10px]">{t('typing')}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            )}

            {currentTab === 'settings' && (
                <div className="max-w-3xl mx-auto py-10 space-y-16">
                    <div className="space-y-8">
                        <h3 className="text-sm font-black tracking-widest text-white/30 uppercase flex items-center gap-3"><Languages size={18}/> Localization</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {Object.keys(Language).map(l => (
                                <button key={l} onClick={() => setLanguage(l as Language)} className={`p-4 rounded-2xl border transition-all font-black text-xs ${language === l ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>{l}</button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-8">
                        <h3 className="text-sm font-black tracking-widest text-white/30 uppercase flex items-center gap-3"><Palette size={18}/> Neural Hue Signature</h3>
                        <div className="flex items-center gap-8">
                            <input type="color" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); document.documentElement.style.setProperty('--accent-color', e.target.value); }} className="w-20 h-20 rounded-[2rem] cursor-pointer bg-transparent border-none appearance-none shadow-2xl" />
                            <span className="font-black text-3xl accent-text">{accentColor.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
            )}

            {currentTab === 'profile' && (
                <div className="max-w-4xl mx-auto py-10 space-y-16">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <img src={user.avatar} className="w-40 h-40 rounded-[3rem] border-2 border-white/5 shadow-2xl" alt="P" />
                        <div className="text-center md:text-left space-y-4">
                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter uppercase leading-none">{user.nickname}</h2>
                            <p className="text-white/40 font-bold uppercase tracking-widest">Neural Identity Authenticated</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[ { label: t('requests'), val: user.stats.totalRequests }, { label: t('favMode'), val: activePreset.name[language] }, { label: 'Uptime', val: '1.2M ms' } ].map((s, i) => (
                            <div key={i} className="glass-effect p-8 rounded-[2.5rem] border-white/5 shadow-xl">
                                <span className="block text-white/20 text-[10px] font-bold uppercase mb-4 tracking-widest">{s.label}</span>
                                <span className="text-4xl font-black tabular-nums">{s.val}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => { setIsAuthenticated(false); localStorage.removeItem('zenith_auth'); }} className="text-red-500 font-black uppercase tracking-widest text-xs hover:text-red-400 transition-colors">Terminate Link</button>
                </div>
            )}
        </div>

        {/* Dynamic Input Bar */}
        {currentTab === 'chat' && (
            <footer className="absolute bottom-4 md:bottom-10 inset-x-0 flex justify-center px-4 md:px-10 pointer-events-none chat-footer">
                <div className="w-full max-w-4xl pointer-events-auto relative">
                    
                    {/* Recording States Overlay */}
                    {isRecording && (
                        <div className="absolute inset-x-0 -top-20 flex items-center justify-between px-8 py-3 glass-effect-heavy rounded-[2rem] animate-in slide-in-from-bottom-8 duration-300">
                             <div className="flex items-center gap-4">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
                                <span className="font-black tabular-nums text-xl">
                                    {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                </span>
                             </div>
                             <div className="flex items-center gap-4">
                                <button onClick={cancelRecording} className="p-2 md:p-3 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-all flex items-center gap-2">
                                    <Trash size={18}/>
                                    <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest">Cancel</span>
                                </button>
                                <button onClick={stopAndSendRecording} className="p-2 md:p-3 bg-green-500/10 text-green-500 rounded-full hover:bg-green-500/20 transition-all flex items-center gap-2">
                                    <Check size={18}/>
                                    <span className="hidden md:block text-[10px] font-bold uppercase tracking-widest">Finish</span>
                                </button>
                             </div>
                        </div>
                    )}

                    {/* Media Previews */}
                    {uploadedImage && !isUploading && (
                        <div className="absolute -top-20 left-6 flex items-center gap-4 bg-black/95 p-2 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4">
                            <img src={uploadedImage} className="w-14 h-14 rounded-xl object-cover" alt="Q" />
                            <button onClick={() => setUploadedImage(null)} className="p-2 hover:bg-white/10 rounded-full text-white/50"><X size={16}/></button>
                        </div>
                    )}

                    <div className="glass-effect rounded-[3rem] p-2 md:p-3 flex flex-col gap-2 shadow-2xl transition-all border-white/10 bg-black/60 backdrop-blur-3xl overflow-hidden min-h-[70px]">
                        <div className="flex items-center gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="p-3 md:p-4 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white shrink-0" title="Upload Image"><ImageIcon size={22} /></button>
                            <button onClick={openCamera} className="p-3 md:p-4 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white shrink-0" title="Take Photo"><Camera size={22} /></button>
                            
                            <input 
                                type="text" 
                                value={inputText} 
                                disabled={isGenerating} 
                                onChange={(e) => setInputText(e.target.value)} 
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} 
                                placeholder={isGenerationMode ? "Describe what to generate..." : (isGenerating ? "NEURAL STREAM BUSY..." : t('search'))} 
                                className={`flex-1 bg-transparent border-none outline-none p-2 md:p-4 text-white font-bold uppercase tracking-tight text-sm md:text-base placeholder-white/20 transition-all ${isGenerationMode ? 'ring-1 ring-indigo-500/50 rounded-2xl bg-indigo-500/5' : ''}`} 
                            />
                            <div className="flex items-center gap-1 md:gap-2 pr-1">
                                 <button 
                                    onClick={() => setIsGenerationMode(!isGenerationMode)} 
                                    title="Generate Art Mode"
                                    className={`p-3 md:p-4 rounded-full transition-all shrink-0 ${isGenerationMode ? 'bg-indigo-500 text-white animate-pulse' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                                 >
                                    <Sparkles size={22}/>
                                 </button>
                                 <button 
                                     onClick={handleMicToggle} 
                                     className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all shadow-xl shrink-0 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                                 >
                                     {isRecording ? <StopCircle size={24}/> : <Mic size={24}/>}
                                 </button>
                                 <button 
                                    onClick={() => handleSendMessage()} 
                                    disabled={isGenerating}
                                    className={`w-12 h-12 md:w-14 md:h-14 text-white rounded-full flex items-center justify-center transition-all shadow-xl accent-bg shrink-0 ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
                                 >
                                    <Send size={20} className="ml-1" />
                                 </button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        )}
      </main>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
    </div>
  );
};

export default App;
