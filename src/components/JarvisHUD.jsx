import React, { useState, useEffect, useRef } from 'react';
import { jarvisVoice } from '../services/jarvisVoice';
import { JarvisBrain } from '../services/jarvisBrain';
import { JarvisAIService } from '../services/jarvisAI';
import { playTactileFeedback } from '../services/haptics';
import { downloadCalendarICS } from '../services/calendarExport';
import { downloadExecutiveReportMarkdown, printExecutiveReport } from '../services/reportExport';
import { ObsidianVaultExportService } from '../services/obsidianVaultExport';
import { UserGoalsService } from '../services/userGoals';

export default function JarvisHUD({ 
  variant = 'floating', // 'floating' | 'embedded'
  onNavigate,
  onDataUpdated
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [voiceState, setVoiceState] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking' | 'unsupported'
  const [transcript, setTranscript] = useState('');
  const [jarvisReply, setJarvisReply] = useState('');
  const [typedCommand, setTypedCommand] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isWakeWord, setIsWakeWord] = useState(() => jarvisVoice.isWakeWordActive());
  const [assistantName, setAssistantName] = useState(() => UserGoalsService.getAssistantName());

  useEffect(() => {
    const handleGoalsUpdate = () => {
      setAssistantName(UserGoalsService.getAssistantName());
    };
    window.addEventListener('nexus_user_goals_updated', handleGoalsUpdate);
    return () => window.removeEventListener('nexus_user_goals_updated', handleGoalsUpdate);
  }, []);

  // Estados de IA Generativa
  const [isAIActive, setIsAIActive] = useState(() => JarvisAIService.isConfigured());
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => JarvisAIService.getApiKey());
  const [apiProvider, setApiProvider] = useState(() => JarvisAIService.getProvider());
  const [showPassword, setShowPassword] = useState(false);
  const [apiTestMsg, setApiTestMsg] = useState('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [attachedImage, setAttachedImage] = useState(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const imageInputRef = useRef(null);

  // Histórico persistente de conversas no navegador
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_jarvis_history');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        sender: 'jarvis',
        text: 'Sistemas neurais online com suporte a IA avançada. Estou à sua disposição, Comandante. O que deseja planejar ou executar?'
      }
    ];
  });

  // Salvar últimos diálogos no localStorage
  useEffect(() => {
    try {
      localStorage.setItem('nexus_jarvis_history', JSON.stringify(history.slice(-30)));
    } catch (_) {}
  }, [history]);

  const handleClearHistory = () => {
    const initial = [
      {
        sender: 'jarvis',
        text: 'Memória de diálogo resetada. Protocolos prontos para novas diretrizes, Comandante.'
      }
    ];
    setHistory(initial);
    localStorage.removeItem('nexus_jarvis_history');
    playTactileFeedback('check');
  };

  const handleCopyMessage = (text, index) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      playTactileFeedback('check');
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const inputRef = useRef(null);
  const chatBottomRef = useRef(null);

  // Sincronização e escuta de eventos do jarvisVoice
  useEffect(() => {
    const unsubState = jarvisVoice.onStateChange((newState) => {
      setVoiceState(newState);
    });

    const unsubTranscript = jarvisVoice.onTranscript((text, isFinal) => {
      setTranscript(text);
      // Se for a instância principal (floating) e a fala finalizou, executa o comando
      if (isFinal && text.trim() && variant !== 'embedded') {
        executeCommand(text);
      }
    });

    const unsubError = jarvisVoice.onError((err) => {
      console.warn('[J.A.R.V.I.S. Audio]', err);
    });

    // Ouvinte da detecção da palavra-chave "Jarvis" (Hands-Free)
    const unsubWake = jarvisVoice.onWakeWord(() => {
      setIsOpen(true);
      playTactileFeedback('jarvis_activate');
    });

    // Se for embedded, sincroniza respostas vindas da instância global
    const handleSyncReply = (e) => {
      if (e.detail) {
        if (e.detail.reply) setJarvisReply(e.detail.reply);
        if (e.detail.command) setTranscript(e.detail.command);
      }
    };
    window.addEventListener('nexus_jarvis_reply', handleSyncReply);

    return () => {
      unsubState();
      unsubTranscript();
      unsubError();
      unsubWake();
      window.removeEventListener('nexus_jarvis_reply', handleSyncReply);
    };
  }, [variant]);

  // Atalho global do teclado: Tecla J ou Alt+J para acionar J.A.R.V.I.S. (Apenas na instância floating principal)
  useEffect(() => {
    if (variant === 'embedded') return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        setIsOpen(prev => {
          const next = !prev;
          if (next) {
            setTimeout(() => toggleListening(true), 200);
          } else {
            jarvisVoice.stopListening();
            jarvisVoice.cancelSpeaking();
          }
          return next;
        });
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        jarvisVoice.stopListening();
        jarvisVoice.cancelSpeaking();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, variant]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, history]);

  // Alterna o microfone com som tático
  const toggleListening = (forceStart = false) => {
    if (voiceState === 'listening' && !forceStart) {
      jarvisVoice.stopListening();
    } else {
      setTranscript('');
      playTactileFeedback('jarvis_activate');
      jarvisVoice.startListening();
    }
  };

  const handleSaveApiKey = () => {
    JarvisAIService.setApiKey(apiKeyInput, apiProvider);
    setIsAIActive(JarvisAIService.isConfigured());
    playTactileFeedback('check');
    setApiTestMsg('✓ Chave neural salva com sucesso!');
    setTimeout(() => {
      setShowApiSettings(false);
      setApiTestMsg('');
    }, 1500);
  };

  const handleTestApiKey = async () => {
    setIsTestingApi(true);
    setApiTestMsg('Testando conexão com servidores neurais...');
    const res = await JarvisAIService.testConnection(apiKeyInput, apiProvider);
    setIsTestingApi(false);
    setApiTestMsg(res.message);
    if (res.success) {
      playTactileFeedback('level_up');
    }
  };

  const handleClearApiKey = () => {
    JarvisAIService.setApiKey('');
    setApiKeyInput('');
    setIsAIActive(false);
    setApiTestMsg('Chave removida. J.A.R.V.I.S. operando em modo offline.');
  };

  const handleToggleWakeWord = () => {
    const next = !isWakeWord;
    jarvisVoice.setWakeWordEnabled(next);
    setIsWakeWord(next);
    playTactileFeedback(next ? 'level_up' : 'uncheck');
  };

  // Executa o processamento do comando no JarvisBrain de forma assíncrona com memória contínua
  const executeCommand = async (commandText) => {
    if (!commandText || !commandText.trim()) return;

    jarvisVoice.setState('processing');
    setTranscript(commandText);
    playTactileFeedback('jarvis_confirm');

    // Adiciona comando do usuário ao histórico com contexto cumulativo
    const currentHistory = [...history, { sender: 'user', text: commandText }];
    setHistory(currentHistory);

    try {
      const result = await JarvisBrain.processCommand(commandText, currentHistory);
      setJarvisReply(result.speech);

      setHistory(prev => [...prev, { sender: 'jarvis', text: result.speech }]);

      // Executa ação retornada pelo cérebro
      if (result.action) {
        if (result.action.type === 'NAVIGATE' && onNavigate) {
          onNavigate(result.action.view);
        } else if (result.action.type === 'START_FOCUS') {
          if (onNavigate) onNavigate('foco-total');
          window.dispatchEvent(new CustomEvent('nexus_start_focus', {
            detail: { minutes: result.action.minutes || 25 }
          }));
        } else if (result.action.type === 'EXPORT_CALENDAR') {
          downloadCalendarICS();
        } else if (result.action.type === 'EXPORT_REPORT') {
          if (result.action.format === 'pdf') {
            printExecutiveReport();
          } else {
            downloadExecutiveReportMarkdown();
          }
        } else if (result.action.type === 'EXPORT_OBSIDIAN_VAULT') {
          ObsidianVaultExportService.exportFullVaultZip();
        }
        if (onDataUpdated) {
          onDataUpdated();
        }
      }

      // Fala a resposta com voz sintética
      jarvisVoice.speak(result.speech);

      // Sincroniza a resposta globalmente para atualizar outros elementos do HUD
      window.dispatchEvent(new CustomEvent('nexus_jarvis_reply', {
        detail: { reply: result.speech, command: commandText }
      }));
    } catch (err) {
      console.error('[J.A.R.V.I.S. Exec Error]', err);
      const errMsg = 'Comandante, ocorreu uma anomalia momentânea ao processar sua instrução. Os subsistemas continuam ativos.';
      setJarvisReply(errMsg);
      setHistory(prev => [...prev, { sender: 'jarvis', text: errMsg }]);
      jarvisVoice.speak(errMsg);
    }
  };

  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('Selecione uma imagem de até 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result;
      if (typeof dataUrl === 'string') {
        const parts = dataUrl.split(',');
        const mimeType = parts[0].match(/:(.*?);/)?.[1] || file.type || 'image/jpeg';
        const base64 = parts[1];
        setAttachedImage({ base64, mimeType, previewUrl: dataUrl });
        playTactileFeedback('check');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTextSubmit = async (e) => {
    e.preventDefault();

    // Se houver imagem anexada, processa via Visão Computacional do Gemini
    if (attachedImage) {
      const img = attachedImage;
      setAttachedImage(null);
      setIsAnalyzingImage(true);
      jarvisVoice.setState('processing');
      playTactileFeedback('jarvis_confirm');

      const userText = typedCommand.trim();
      const userMsg = userText ? `[📷 Foto Anexada] ${userText}` : '[📷 Comprovante / Anotação Anexada]';
      setHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
      setTypedCommand('');

      try {
        const responseText = await JarvisAIService.analyzeImage(img.base64, img.mimeType, userText);
        const actionMatch = responseText.match(/```(?:action|json)?\s*([\s\S]*?)\s*```/i);
        let cleanSpeech = responseText.replace(/```(?:action|json)?[\s\S]*?```/gi, '').trim();

        if (actionMatch) {
          try {
            const actionData = JSON.parse(actionMatch[1].trim());
            JarvisBrain.executeNeuralAction(actionData);
            if (onDataUpdated) onDataUpdated();
          } catch (_) {}
        }

        const reply = cleanSpeech || responseText;
        setJarvisReply(reply);
        setHistory(prev => [...prev, { sender: 'jarvis', text: reply }]);
        jarvisVoice.speak(reply);
        window.dispatchEvent(new CustomEvent('nexus_jarvis_reply', {
          detail: { reply, command: userMsg }
        }));
      } catch (err) {
        const errReply = `Comandante, não foi possível analisar a imagem: ${err.message}`;
        setJarvisReply(errReply);
        setHistory(prev => [...prev, { sender: 'jarvis', text: errReply }]);
        jarvisVoice.speak(errReply);
      } finally {
        setIsAnalyzingImage(false);
      }
      return;
    }

    if (!typedCommand.trim()) return;
    executeCommand(typedCommand.trim());
    setTypedCommand('');
  };

  // Status visual labels & cores
  const getStatusDisplay = () => {
    switch (voiceState) {
      case 'listening':
        return {
          label: 'OUVINDO COMANDOS...',
          color: '#06B6D4',
          pulse: 'animate-ping',
          icon: 'mic'
        };
      case 'processing':
        return {
          label: 'ANALISANDO INTENÇÃO...',
          color: '#F59E0B',
          pulse: 'animate-spin',
          icon: 'neurology'
        };
      case 'speaking':
        return {
          label: 'TRANSMITINDO RESPOSTA...',
          color: '#10B981',
          pulse: 'animate-pulse',
          icon: 'graphic_eq'
        };
      default:
        return {
          label: 'SISTEMAS ONLINE • REPOUSO',
          color: '#64748B',
          pulse: '',
          icon: 'radio_button_checked'
        };
    }
  };

  const status = getStatusDisplay();

  // MODO EMBEDDED (integrado como banner de topo nas views Hub Diário ou Modo Foco)
  if (variant === 'embedded') {
    return (
      <div className="bg-gradient-to-r from-[#090D16] via-[#111827] to-[#090D16] border border-[#06B6D4]/30 rounded-2xl p-4 shadow-[0_0_24px_rgba(6,182,212,0.12)] relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Arc Reactor Visualizer */}
            <div 
              onClick={() => setIsOpen(true)}
              className="w-11 h-11 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/40 flex items-center justify-center cursor-pointer relative group shrink-0"
              title="Abrir terminal tático do J.A.R.V.I.S. (Tecla J)"
            >
              <div className={`absolute inset-0 rounded-2xl bg-[#06B6D4]/20 ${voiceState === 'listening' ? 'animate-ping' : ''}`} />
              <span className="material-symbols-outlined text-[24px] text-[#06B6D4] group-hover:scale-110 transition-transform">
                smart_toy
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-[#06B6D4] uppercase">
                  {assistantName}
                </span>
                <span className="text-[10px] text-[#94A3B8]">•</span>
                <span className="text-[10px] font-mono tracking-wider font-semibold" style={{ color: status.color }}>
                  {status.label}
                </span>
                <span className="text-[10px] text-[#94A3B8]">•</span>
                {isAIActive ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#10B981]/20 text-[#10B981] font-mono font-bold">
                    IA NEURAL ON
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-mono font-bold">
                    LOCAL
                  </span>
                )}
              </div>
              <p className="text-xs text-[#E2E8F0] mt-0.5 max-w-xl truncate">
                {transcript ? `"${transcript}"` : jarvisReply || `Diga "Bom dia ${assistantName}", "Adicionar tarefa", "Como estão meus hábitos" ou clique no microfone.`}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => toggleListening()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                voiceState === 'listening'
                  ? 'bg-[#EF4444] text-white animate-pulse'
                  : 'bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">
                {voiceState === 'listening' ? 'stop' : 'mic'}
              </span>
              <span>{voiceState === 'listening' ? 'Ouvindo...' : 'Falar'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setShowApiSettings(true);
              }}
              className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-[#06B6D4] transition-colors cursor-pointer border border-[#334155]/40"
              title="Configurar IA Neural (Google Gemini / OpenAI)"
            >
              <span className="material-symbols-outlined text-[18px]">neurology</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors cursor-pointer border border-[#334155]/40"
              title="Expandir Terminal J.A.R.V.I.S. (Atalho: Tecla J)"
            >
              <span className="material-symbols-outlined text-[18px]">terminal</span>
            </button>
          </div>
        </div>

        {/* Modal Overlay Expandido */}
        {isOpen && renderModal()}
      </div>
    );
  }

  // MODO FLOATING (Widget flutuante persistente global)
  return (
    <>
      {/* Botão Flutuante Arc Reactor no canto inferior direito */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#090D16]/95 hover:bg-[#111827] border border-[#06B6D4]/40 shadow-[0_0_24px_rgba(6,182,212,0.3)] hover:shadow-[0_0_32px_rgba(6,182,212,0.5)] transition-all cursor-pointer backdrop-blur-xl"
          title="Ativar J.A.R.V.I.S. (Atalho: Tecla J)"
        >
          {/* Arc Reactor Glowing Ring */}
          <div className="relative w-7 h-7 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#06B6D4]/20 animate-ping" />
            <div className="w-6 h-6 rounded-full bg-[#06B6D4]/25 border border-[#06B6D4] flex items-center justify-center text-[#06B6D4]">
              <span className="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform duration-500">
                cyclone
              </span>
            </div>
          </div>

          <div className="flex flex-col text-left">
            <span className="text-[11px] font-mono font-bold tracking-wider text-[#06B6D4] leading-none">
              {assistantName}
            </span>
            <span className="text-[9px] text-[#94A3B8] tracking-widest uppercase font-mono mt-0.5 flex items-center gap-1">
              {isWakeWord ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                  <span className="text-[#10B981] font-bold">MÃOS-LIVRES ON</span>
                </>
              ) : (
                'HUD ATIVO • [J]'
              )}
            </span>
          </div>
        </button>
      </div>

      {/* Modal Overlay Expandido */}
      {isOpen && renderModal()}
    </>
  );

  // Render do Modal Expandido / Terminal de Diálogo
  function renderModal() {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
        onClick={() => {
          setIsOpen(false);
          jarvisVoice.stopListening();
          jarvisVoice.cancelSpeaking();
        }}
      >
        <div
          className="w-full max-w-2xl bg-[#090D16] border border-[#06B6D4]/40 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar Futurista */}
          <div className="px-6 py-4 bg-[#111827]/90 border-b border-[#1F293D] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {/* Arc Reactor Ícone */}
              <div className="w-8 h-8 rounded-full bg-[#06B6D4]/20 border border-[#06B6D4] flex items-center justify-center text-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.4)] shrink-0">
                <span className="material-symbols-outlined text-[18px]">cyclone</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold tracking-widest text-[#06B6D4] font-mono">
                    {assistantName.toUpperCase()} INTELLIGENCE MATRIX
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#06B6D4]/15 text-[#67E8F9] font-mono font-bold">
                    v2.7
                  </span>
                  {/* Badge de Conexão com IA */}
                  {isAIActive ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                      IA NEURAL CONECTADA ({apiProvider.toUpperCase()})
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                      MODO TÁTICO OFFLINE
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-mono tracking-wider font-semibold" style={{ color: status.color }}>
                  ● {status.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão de Toggle Mãos-Livres (Wake-Word) */}
              <button
                type="button"
                onClick={handleToggleWakeWord}
                className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer border ${
                  isWakeWord
                    ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] font-bold'
                    : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:text-white'
                }`}
                title="Ativar/desativar escuta contínua por voz ('Jarvis...')"
              >
                <span className={`material-symbols-outlined text-[17px] ${isWakeWord ? 'animate-pulse text-[#10B981]' : ''}`}>
                  sensors
                </span>
                <span className="hidden sm:inline">
                  {isWakeWord ? 'Mãos-Livres ON' : 'Mãos-Livres OFF'}
                </span>
              </button>

              {/* Botão de Toggle do Painel de IA */}
              <button
                type="button"
                onClick={() => setShowApiSettings(!showApiSettings)}
                className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-mono cursor-pointer ${
                  showApiSettings 
                    ? 'bg-[#06B6D4] text-[#001F26] font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                    : isAIActive
                    ? 'bg-[#1E293B] text-[#06B6D4] border border-[#06B6D4]/40 hover:bg-[#06B6D4]/15'
                    : 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 hover:bg-[#F59E0B]/25'
                }`}
                title="Configurar Chave de API de IA (Google Gemini / OpenAI)"
              >
                <span className="material-symbols-outlined text-[17px]">neurology</span>
                <span className="hidden sm:inline font-bold">
                  {showApiSettings ? 'Fechar Ajustes' : isAIActive ? 'IA Ativa' : 'Conectar IA'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const muted = jarvisVoice.toggleMute();
                  setIsMuted(muted);
                }}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isMuted ? 'bg-[#EF4444]/20 text-[#EF4444]' : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                }`}
                title={isMuted ? 'Áudio de voz mudo' : 'Áudio de voz ativado'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isMuted ? 'volume_off' : 'volume_up'}
                </span>
              </button>

              <kbd className="hidden sm:inline font-mono text-[10px] text-[#94A3B8] bg-[#1E293B] px-2 py-1 rounded border border-[#334155]">
                ESC
              </kbd>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  jarvisVoice.stopListening();
                  jarvisVoice.cancelSpeaking();
                }}
                className="p-1 text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
          </div>

          {/* Painel Expansível de Configuração da Chave de API Neural */}
          {showApiSettings && (
            <div className="bg-[#111827] border-b border-[#06B6D4]/40 p-5 space-y-4 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b border-[#1F293D] pb-2">
                <div className="flex items-center gap-2 text-[#06B6D4] font-bold font-mono">
                  <span className="material-symbols-outlined text-[19px]">neurology</span>
                  <span>CENTRAL NEURAL • CONEXÃO DE INTELIGÊNCIA ARTIFICIAL</span>
                </div>
                <div className="text-[11px] text-[#94A3B8] font-mono">
                  Armazenamento 100% local e seguro no navegador
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#94A3B8] block mb-1 font-mono font-semibold">Provedor de IA:</label>
                  <select
                    value={apiProvider}
                    onChange={(e) => setApiProvider(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#06B6D4] outline-none"
                  >
                    <option value="gemini">Google Gemini 3.5 / Flash (Gratuito & Recomendado)</option>
                    <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#94A3B8] block mb-1 font-mono font-semibold">Chave de API (Token Secreto):</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder={apiProvider === 'gemini' ? 'Cole aqui: AIzaSy...' : 'Cole aqui: sk-proj-...'}
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-xl pl-3 pr-10 py-2 text-white font-mono text-xs focus:border-[#06B6D4] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2 text-[#94A3B8] hover:text-white cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status ou mensagem de teste */}
              {apiTestMsg && (
                <div className={`p-2.5 rounded-xl font-mono text-[11px] flex items-center gap-2 ${
                  apiTestMsg.includes('✓') 
                    ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' 
                    : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                }`}>
                  <span className="material-symbols-outlined text-[16px]">
                    {apiTestMsg.includes('✓') ? 'verified' : 'error'}
                  </span>
                  <span>{apiTestMsg}</span>
                </div>
              )}

              {/* Instrução rápida e botões de ação */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#06B6D4] hover:underline flex items-center gap-1 font-mono"
                >
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  <span>Criar chave gratuita no Google AI Studio (Leva 1 minuto)</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-3 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 font-mono text-[11px] transition-colors cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleTestApiKey}
                    disabled={!apiKeyInput.trim() || isTestingApi}
                    className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] font-mono text-[11px] transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">network_check</span>
                    <span>{isTestingApi ? 'Testando...' : 'Testar Conexão'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="px-4 py-1.5 rounded-lg bg-[#06B6D4] hover:opacity-90 text-[#001F26] font-bold font-mono text-[11px] transition-opacity disabled:opacity-40 cursor-pointer shadow-md flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">save</span>
                    <span>Salvar Chave</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Central Reactor Visualizer & Sound Spectrum Animation */}
          <div className="p-6 bg-gradient-to-b from-[#111827]/40 via-[#090D16] to-[#090D16] flex flex-col items-center justify-center border-b border-[#1F293D]/60 relative">
            {/* Futuristic Concentric Rings */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full border border-[#06B6D4]/20 ${voiceState === 'listening' ? 'animate-ping' : ''}`} />
              <div className="absolute inset-2 rounded-full border border-dashed border-[#06B6D4]/30 animate-spin" style={{ animationDuration: '20s' }} />
              <div className="absolute inset-4 rounded-full border border-[#10B981]/30" />
              
              {/* Botão Central de Microfone */}
              <button
                type="button"
                onClick={() => toggleListening()}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-[0_0_30px_rgba(6,182,212,0.35)] active:scale-95 z-10 ${
                  voiceState === 'listening'
                    ? 'bg-[#EF4444] text-white shadow-[0_0_40px_rgba(239,68,68,0.6)]'
                    : voiceState === 'speaking'
                    ? 'bg-[#10B981] text-[#06231A] shadow-[0_0_40px_rgba(16,185,129,0.6)]'
                    : 'bg-gradient-to-br from-[#06B6D4] to-[#0284C7] text-[#001F26] hover:brightness-110'
                }`}
                title="Clique para falar com o J.A.R.V.I.S."
              >
                <span className="material-symbols-outlined text-[32px]">
                  {voiceState === 'listening' ? 'graphic_eq' : voiceState === 'speaking' ? 'volume_up' : 'mic'}
                </span>
                <span className="text-[9px] font-bold font-mono tracking-wider mt-0.5">
                  {voiceState === 'listening' ? 'OUVINDO' : voiceState === 'speaking' ? 'FALANDO' : 'FALAR'}
                </span>
              </button>
            </div>

            {/* Audio Wave Bars Simulation */}
            <div className="flex items-center gap-1.5 mt-4 h-6">
              {[4, 12, 18, 24, 16, 22, 10, 15, 20, 8].map((h, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-200 ${
                    voiceState === 'listening' || voiceState === 'speaking'
                      ? 'bg-[#06B6D4] animate-pulse'
                      : 'bg-[#1E293B]'
                  }`}
                  style={{
                    height: voiceState === 'listening' || voiceState === 'speaking' ? `${(h * (idx % 2 + 1)) % 24 + 6}px` : '4px',
                    animationDelay: `${idx * 80}ms`
                  }}
                />
              ))}
            </div>

            {/* Transcript em tempo real */}
            {transcript && (
              <div className="mt-3 px-4 py-1.5 rounded-full bg-[#1E293B]/70 border border-[#06B6D4]/30 text-xs font-mono text-[#06B6D4] animate-pulse max-w-md truncate text-center">
                "{transcript}"
              </div>
            )}
          </div>

          {/* Histórico de Diálogo com Memória Contínua */}
          <div className="flex-1 p-5 overflow-y-auto max-h-72 space-y-3 font-sans text-xs">
            {/* Header de Controle do Chat */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1F293D]/50 text-[10px] text-[#64748B] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse"></span>
                <span>MEMÓRIA MULTI-TURNO ATIVA ({history.length} turnos)</span>
              </span>
              {history.length > 1 && (
                <button
                  type="button"
                  onClick={handleClearHistory}
                  className="hover:text-[#EF4444] transition-colors cursor-pointer flex items-center gap-1"
                  title="Limpar histórico da conversa"
                >
                  <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {history.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 group ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'jarvis' && (
                  <div className="w-6 h-6 rounded-lg bg-[#06B6D4]/20 text-[#06B6D4] flex items-center justify-center shrink-0 border border-[#06B6D4]/40 font-mono text-[10px] font-bold mt-1">
                    J
                  </div>
                )}
                <div className="flex flex-col max-w-[85%] sm:max-w-md">
                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-line text-xs ${
                      msg.sender === 'user'
                        ? 'bg-[#06B6D4] text-[#001F26] font-semibold rounded-tr-xs shadow-sm'
                        : 'bg-[#111827] text-[#E2E8F0] border border-[#1F293D] rounded-tl-xs shadow-sm font-sans'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Ações da Mensagem do J.A.R.V.I.S. (Falar e Copiar) */}
                  {msg.sender === 'jarvis' && (
                    <div className="flex items-center gap-2 mt-1 px-1 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => jarvisVoice.speak(msg.text)}
                        className="text-[11px] text-[#94A3B8] hover:text-[#06B6D4] flex items-center gap-1 transition-colors cursor-pointer font-mono"
                        title="Ouvir esta mensagem novamente"
                      >
                        <span className="material-symbols-outlined text-[13px]">volume_up</span>
                        <span>Ouvir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.text, i)}
                        className="text-[11px] text-[#94A3B8] hover:text-[#10B981] flex items-center gap-1 transition-colors cursor-pointer font-mono"
                        title="Copiar texto"
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {copiedIndex === i ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedIndex === i ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Indicador de Processamento Neural */}
            {voiceState === 'processing' && (
              <div className="flex gap-2.5 justify-start animate-pulse">
                <div className="w-6 h-6 rounded-lg bg-[#06B6D4]/20 text-[#06B6D4] flex items-center justify-center shrink-0 border border-[#06B6D4]/40 font-mono text-[10px] font-bold">
                  J
                </div>
                <div className="p-3 rounded-2xl bg-[#111827] text-[#06B6D4] border border-[#06B6D4]/30 rounded-tl-xs font-mono text-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping"></span>
                  <span>J.A.R.V.I.S. está consultando o banco SQLite e processando diretrizes...</span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Pílulas de Comandos & Perguntas Rápidas */}
          <div className="px-5 py-2.5 bg-[#111827]/60 border-t border-[#1F293D]/60 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
            <span className="text-[#64748B] uppercase tracking-wider font-mono font-bold text-[10px] mr-1 shrink-0 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#06B6D4]">bolt</span>
              <span>Rápido:</span>
            </span>
            {[
              '☀️ Briefing Matinal',
              '🎯 O que priorizar hoje?',
              '📊 Como estão meus hábitos?',
              '💰 Resumo Financeiro',
              '📝 Planejar 3 tarefas para mim',
              '⏱️ Iniciar Modo Foco',
              '🚀 Estratégia para 2027'
            ].map((cmd, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => executeCommand(cmd)}
                className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-[#06B6D4] border border-[#334155]/40 transition-colors shrink-0 font-medium cursor-pointer"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Preview de Imagem Anexada */}
          {attachedImage && (
            <div className="px-4 pt-3 pb-1 bg-[#111827] border-t border-[#1F293D] flex items-center gap-3">
              <div className="relative group">
                <img
                  src={attachedImage.previewUrl}
                  alt="Anexo para o Jarvis"
                  className="w-12 h-12 rounded-lg object-cover border border-[#06B6D4] shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EF4444] text-white flex items-center justify-center text-xs cursor-pointer shadow"
                  title="Remover anexo"
                >
                  ×
                </button>
              </div>
              <div className="text-[11px] font-mono text-[#06B6D4]">
                <span>Documento visual carregado. Clique em Enviar para o J.A.R.V.I.S. analisar e categorizar.</span>
              </div>
            </div>
          )}

          {/* Input de Comando por Texto ou Imagem */}
          <form onSubmit={handleTextSubmit} className="p-4 bg-[#111827] border-t border-[#1F293D] flex items-center gap-2">
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              onChange={handleImageSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-[#06B6D4] border border-[#334155] transition-colors cursor-pointer shrink-0"
              title="Anexar foto de comprovante, recibo ou anotação para o J.A.R.V.I.S."
            >
              <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            </button>

            <input
              ref={inputRef}
              type="text"
              value={typedCommand}
              onChange={(e) => setTypedCommand(e.target.value)}
              placeholder={attachedImage ? "Instrução adicional opcional..." : "Digite uma instrução ou fale... (ex: Adicionar tarefa Ler 30m prioridade alta)"}
              className="flex-1 bg-[#1E293B] border border-[#334155] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#64748B] outline-none focus:border-[#06B6D4] font-mono"
            />
            <button
              type="submit"
              disabled={(!typedCommand.trim() && !attachedImage) || isAnalyzingImage}
              className="px-4 py-2.5 rounded-xl bg-[#06B6D4] text-[#001F26] font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer flex items-center gap-1 font-mono shrink-0"
            >
              <span>{isAnalyzingImage ? 'Analisando...' : 'Executar'}</span>
              <span className="material-symbols-outlined text-[16px]">
                {isAnalyzingImage ? 'sync' : 'send'}
              </span>
            </button>
          </form>
        </div>
      </div>
    );
  }
}

