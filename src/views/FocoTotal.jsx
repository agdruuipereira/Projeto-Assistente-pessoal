/**
 * src/views/FocoTotal.jsx
 * Central de Alta Performance & Hiperfoco — Pomodoro Tático & Ondas Binaurais Estritas
 * 
 * Funcionalidades completas:
 * - ⏱️ Timer Pomodoro Tático: Foco, Pausa Curta e Pausa Longa com presets rápidos (15m, 25m, 45m, 60m, 90m)
 * - ⚡ Ondas Binaurais Estritas (Web Audio API nativo): Gamma 40Hz, Beta 18Hz, Alpha 10Hz e Theta 6Hz
 * - 🎯 Gestão de Objetivo Atual & Criação Rápida de Tarefas sem sair da tela
 * - 📊 Telemetria de Sessões: metas diárias de blocos, minutos acumulados e histórico de sessões
 * - 🧘 Modo Zen Imersivo: tela cheia nativa, relógio de alto contraste, mini-scratchpad e controles de frequência
 * - 📝 Despejo Mental (Scratchpad): auto-salvamento, cópia para clipboard e envio direto ao Cofre Obsidian
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import JarvisHUD from '../components/JarvisHUD';
import { jarvisVoice } from '../services/jarvisVoice';
import { NotificationCenterService } from '../services/notificationCenter';
import { playTactileFeedback } from '../services/haptics';
import { ambientAudio } from '../services/ambientAudio';

const SOUND_MODES = [
  {
    id: 'gamma',
    label: 'Gamma 40Hz',
    freq: '40Hz',
    icon: 'bolt',
    purpose: 'Hiperfoco Cognitivo',
    desc: 'Sincronização neural para resolução de problemas complexos, lógica e programação intensiva.'
  },
  {
    id: 'beta',
    label: 'Beta 18Hz',
    freq: '18Hz',
    icon: 'speed',
    purpose: 'Atenção Ativa',
    desc: 'Alerta sustentado, execução analítica e combate à dispersão mental.'
  },
  {
    id: 'alpha',
    label: 'Alpha 10Hz',
    freq: '10Hz',
    icon: 'waves',
    purpose: 'Flow & Criatividade',
    desc: 'Estado mental sereno e altamente receptivo, ideal para escrita, ideação e design.'
  },
  {
    id: 'theta',
    label: 'Theta 6Hz',
    freq: '6Hz',
    icon: 'psychology',
    purpose: 'Absorção Profunda',
    desc: 'Meditação focada, assimilação de leitura densa e síntese conceitual.'
  }
];

export default function FocoTotal({ isUltraClean }) {
  // Configurações personalizadas salvas do Pomodoro
  const [pomodoroConfig, setPomodoroConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_pomodoro_settings');
      return saved ? JSON.parse(saved) : { focusMinutes: 25, shortBreak: 5, longBreak: 15, dailyGoalCycles: 4, soundEnabled: true };
    } catch (_) {
      return { focusMinutes: 25, shortBreak: 5, longBreak: 15, dailyGoalCycles: 4, soundEnabled: true };
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const MODES = {
    foco: { name: 'Foco Total', seconds: (pomodoroConfig.focusMinutes || 25) * 60, color: '#06B6D4' },
    pausaCurta: { name: 'Pausa Curta', seconds: (pomodoroConfig.shortBreak || 5) * 60, color: '#10B981' },
    pausaLonga: { name: 'Pausa Longa', seconds: (pomodoroConfig.longBreak || 15) * 60, color: '#8B5CF6' }
  };

  const [currentMode, setCurrentMode] = useState('foco');
  const [timeLeft, setTimeLeft] = useState(MODES.foco.seconds);
  const [isRunning, setIsRunning] = useState(false);
  const [completedCycles, setCompletedCycles] = useState(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`projeto_focus_cycles_${today}`);
      return saved ? Number(saved) : 0;
    } catch (_) {
      return 0;
    }
  });

  const [bannerNotice, setBannerNotice] = useState('');
  const [isZenMode, setIsZenMode] = useState(false);
  const [isZenScratchpadOpen, setIsZenScratchpadOpen] = useState(false);

  // Scratchpad persistido
  const [scratchpad, setScratchpad] = useState(() => {
    try {
      return localStorage.getItem('projeto2027_scratchpad') || '';
    } catch (_) {
      return '';
    }
  });

  // Tarefas reais de db.js
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newQuickTaskTitle, setNewQuickTaskTitle] = useState('');
  const [newQuickTaskCategory, setNewQuickTaskCategory] = useState('Trabalho');

  // Histórico de Sessões de Hoje
  const [todaySessions, setTodaySessions] = useState(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const saved = localStorage.getItem(`projeto_focus_sessions_${today}`);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Ondas Binaurais Estritas
  const [isAudioPlaying, setIsAudioPlaying] = useState(() => ambientAudio.getIsPlaying());
  const [soundType, setSoundType] = useState(() => {
    const curr = ambientAudio.getCurrentType();
    return (curr === 'gamma' || curr === 'beta' || curr === 'alpha' || curr === 'theta') ? curr : 'gamma';
  });
  const [audioVolume, setAudioVolume] = useState(0.25);

  useEffect(() => {
    loadTasks();

    const handleStartFocus = (e) => {
      setIsRunning(true);
      if (e.detail && e.detail.minutes) {
        setTimeLeft(e.detail.minutes * 60);
      }
    };
    window.addEventListener('nexus_start_focus', handleStartFocus);
    return () => window.removeEventListener('nexus_start_focus', handleStartFocus);
  }, []);

  // Atalhos de teclado: Barra de espaço para Pausar/Iniciar, Esc para sair do Zen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isZenMode) {
        setIsZenMode(false);
      }
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        setIsRunning(r => !r);
        playTactileFeedback('check');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenMode]);

  const loadTasks = () => {
    const list = db.getTasks().filter(t => t.status !== 'Feito');
    setTasks(list);
    if (list.length > 0 && !selectedTaskId) {
      setSelectedTaskId(list[0].id);
    }
  };

  // Cronômetro Pomodoro
  useEffect(() => {
    NotificationCenterService.setFocusModeActive(isRunning);
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleCycleCompletion();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Sino suave via Web Audio API ao terminar bloco
  const playChimeSound = () => {
    if (pomodoroConfig.soundEnabled === false) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // Dó5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15); // Mi5
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 1.8);
    } catch (_) {}
  };

  const triggerSystemNotification = (title, message) => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
      } catch (_) {}
    }
  };

  const handleCycleCompletion = () => {
    playChimeSound();
    playTactileFeedback('level_up');
    const today = new Date().toISOString().split('T')[0];

    if (currentMode === 'foco') {
      const nextCount = completedCycles + 1;
      setCompletedCycles(nextCount);
      localStorage.setItem(`projeto_focus_cycles_${today}`, String(nextCount));

      // Persistir estatísticas de ciclos para Gamificação / XP (+25 XP)
      try {
        const stored = Number(localStorage.getItem('nexus_focus_stats') || 0) + 1;
        localStorage.setItem('nexus_focus_stats', String(stored));
        window.dispatchEvent(new Event('nexus_xp_update'));
      } catch (_) {}

      // Registrar sessão no histórico diário
      const sessionObj = {
        id: Date.now(),
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        durationMinutes: Math.round(MODES.foco.seconds / 60),
        taskTitle: selectedTask ? selectedTask.title : 'Foco Geral',
        soundType: soundType,
        xpEarned: 25
      };
      const updatedSessions = [sessionObj, ...todaySessions];
      setTodaySessions(updatedSessions);
      localStorage.setItem(`projeto_focus_sessions_${today}`, JSON.stringify(updatedSessions));

      const isLongBreak = nextCount % 4 === 0;
      const nextMode = isLongBreak ? 'pausaLonga' : 'pausaCurta';
      setCurrentMode(nextMode);
      setTimeLeft(MODES[nextMode].seconds);

      const msg = `Ciclo #${nextCount} concluído (+25 XP)! Hora da sua ${isLongBreak ? 'Pausa Longa' : 'Pausa Curta'}.`;
      setBannerNotice(`🎉 ${msg}`);
      NotificationCenterService.send({
        type: 'task',
        title: '🎯 Bloco de Foco Concluído (+25 XP)!',
        message: `Excelente sessão de foco. Descanse com uma ${isLongBreak ? 'pausa longa' : 'pausa curta'} antes do próximo bloco.`,
        actionView: 'foco-total',
        urgency: 'high',
        tag: 'pomodoro-complete',
        bypassDND: true
      });
      triggerSystemNotification('Projeto • Foco Concluído', msg);
      jarvisVoice.speak(`Ciclo de foco número ${nextCount} concluído com sucesso, Comandante. Mais vinte e cinco pontos de disciplina acumulados. Recomendo iniciar sua ${isLongBreak ? 'pausa longa' : 'pausa curta'}.`);
    } else {
      setCurrentMode('foco');
      setTimeLeft(MODES.foco.seconds);
      const msg = 'Pausa finalizada! Pronto para o próximo ciclo de Foco Total.';
      setBannerNotice(`⚡ ${msg}`);
      NotificationCenterService.send({
        type: 'task',
        title: '☕ Pausa Finalizada!',
        message: 'Pronto para retornar à alta performance? Inicie seu próximo ciclo de foco.',
        actionView: 'foco-total',
        urgency: 'medium',
        tag: 'pomodoro-break-end',
        bypassDND: true
      });
      triggerSystemNotification('Projeto • Pausa Finalizada', msg);
      jarvisVoice.speak('Pausa concluída, Comandante. Sistemas e cronômetro operacionais para o próximo bloco de foco total.');
    }
  };

  const switchMode = (modeKey) => {
    setIsRunning(false);
    setCurrentMode(modeKey);
    setTimeLeft(MODES[modeKey].seconds);
    setBannerNotice('');
    playTactileFeedback('check');
  };

  const adjustTime = (deltaSeconds) => {
    setTimeLeft(prev => Math.max(60, prev + deltaSeconds));
    playTactileFeedback('check');
  };

  const setDirectMinutes = (mins) => {
    setIsRunning(false);
    setTimeLeft(mins * 60);
    playTactileFeedback('check');
  };

  const handleScratchpadChange = (text) => {
    setScratchpad(text);
    localStorage.setItem('projeto2027_scratchpad', text);
  };

  const handleCopyScratchpad = async () => {
    if (!scratchpad.trim()) return;
    try {
      await navigator.clipboard.writeText(scratchpad);
      setBannerNotice('✓ Anotações copiadas para a área de transferência!');
      setTimeout(() => setBannerNotice(''), 2500);
      playTactileFeedback('check');
    } catch (_) {}
  };

  const handleSaveScratchpadToVault = () => {
    if (!scratchpad.trim()) return;
    const title = 'Nota de Foco • ' + new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    db.createKnowledgeItem({
      item_type: 'Caderno',
      category: 'Foco',
      title: title,
      content_or_url: scratchpad
    });
    setBannerNotice('✓ Anotação salva com sucesso no Cofre de Conhecimento!');
    setTimeout(() => setBannerNotice(''), 3000);
    playTactileFeedback('check');
  };

  // Sincronização do sintetizador de áudio binaural
  useEffect(() => {
    const unsub = ambientAudio.onStateChange((playing, type) => {
      setIsAudioPlaying(playing);
      if (type && (type === 'gamma' || type === 'beta' || type === 'alpha' || type === 'theta')) {
        setSoundType(type);
      }
    });
    return () => unsub();
  }, []);

  const toggleAmbientAudio = () => {
    ambientAudio.toggle(soundType, audioVolume);
    setIsAudioPlaying(ambientAudio.getIsPlaying());
    playTactileFeedback('check');
  };

  const handleSelectSoundType = (typeId) => {
    setSoundType(typeId);
    if (isAudioPlaying) {
      ambientAudio.start(typeId, audioVolume);
    }
    playTactileFeedback('check');
  };

  const handleVolumeChange = (vol) => {
    setAudioVolume(vol);
    if (isAudioPlaying) {
      ambientAudio.start(soundType, vol);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCompleteTask = (id) => {
    db.updateTask(id, { status: 'Feito' });
    loadTasks();
    playTactileFeedback('level_up');
    setBannerNotice('✓ Tarefa concluída com sucesso (+10 XP)!');
    setTimeout(() => setBannerNotice(''), 3000);
  };

  const handleQuickCreateTask = (e) => {
    e.preventDefault();
    if (!newQuickTaskTitle.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const created = db.createTask({
      title: newQuickTaskTitle.trim(),
      category: newQuickTaskCategory,
      priority: 'Alta',
      due_date: today,
      status: 'Não iniciado'
    });
    setNewQuickTaskTitle('');
    loadTasks();
    if (created && created.id) setSelectedTaskId(created.id);
    playTactileFeedback('check');
    setBannerNotice('✓ Tarefa adicionada e fixada como objetivo!');
    setTimeout(() => setBannerNotice(''), 2500);
  };

  const handleSavePomodoroSettings = (e) => {
    e.preventDefault();
    localStorage.setItem('nexus_pomodoro_settings', JSON.stringify(pomodoroConfig));
    setIsSettingsOpen(false);
    setTimeLeft((pomodoroConfig.focusMinutes || 25) * 60);
    playTactileFeedback('check');
    setBannerNotice('✓ Configurações do Pomodoro atualizadas!');
    setTimeout(() => setBannerNotice(''), 2500);
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const totalFocusMinutesToday = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const dailyGoal = pomodoroConfig.dailyGoalCycles || 4;
  const goalPercentage = Math.min(100, Math.round((completedCycles / dailyGoal) * 100));

  // ==========================================
  // MODO ZEN (Tela Cheia Imersiva sem distrações)
  // ==========================================
  if (isZenMode) {
    return (
      <div className="fixed inset-0 z-50 bg-[#050811] text-[#F8FAFC] flex flex-col justify-between p-6 sm:p-10 backdrop-blur-3xl animate-in fade-in duration-300">
        {/* Topo do Modo Zen */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#06B6D4] font-semibold tracking-wider uppercase font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-[#06B6D4] animate-ping"></span>
            <span>Modo Zen • Foco Profundo</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsZenScratchpadOpen(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-colors cursor-pointer border border-white/5"
              title="Abrir notas rápidas"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>{isZenScratchpadOpen ? 'Fechar Notas' : 'Notas Rápidas'}</span>
            </button>

            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center transition-colors cursor-pointer"
              title="Alternar tela cheia nativa"
            >
              <span className="material-symbols-outlined text-[18px]">fullscreen</span>
            </button>

            <button
              onClick={() => setIsZenMode(false)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-white/10"
            >
              <span>Sair do Modo Zen</span>
              <kbd className="px-1 py-0.5 rounded bg-black/40 text-[10px] font-mono">Esc</kbd>
            </button>
          </div>
        </div>

        {/* Centro do Modo Zen: Relógio Gigante e Objetivo */}
        <div className="flex flex-col items-center justify-center my-auto relative">
          {/* Objetivo em Foco */}
          {selectedTask ? (
            <div className="mb-6 px-5 py-2.5 rounded-full bg-[#111827]/80 border border-[#06B6D4]/30 text-sm text-[#06B6D4] font-semibold flex items-center gap-3 shadow-lg max-w-xl truncate">
              <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">target</span>
              <span className="truncate">{selectedTask.title}</span>
              <button
                onClick={() => handleCompleteTask(selectedTask.id)}
                className="ml-2 px-2.5 py-0.5 rounded-full bg-[#10B981] hover:brightness-110 text-[#090D16] text-[11px] font-bold transition-all cursor-pointer shrink-0"
              >
                Concluir
              </button>
            </div>
          ) : (
            <div className="mb-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#94A3B8]">
              Nenhum objetivo fixado • Foco Livre
            </div>
          )}

          {/* Relógio Digital Gigante */}
          <div
            className="text-8xl sm:text-9xl md:text-[14rem] font-bold text-white tracking-tighter select-none transition-all drop-shadow-[0_0_40px_rgba(6,182,212,0.15)]"
            style={{ fontFeatureSettings: '"tnum" on, "cv05" on' }}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Controles Principais */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={() => {
                setIsRunning(!isRunning);
                playTactileFeedback('check');
              }}
              className="px-10 py-4 rounded-2xl text-base font-bold transition-all shadow-xl hover:brightness-110 cursor-pointer flex items-center gap-2"
              style={{
                backgroundColor: MODES[currentMode].color,
                color: '#001F26'
              }}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
              <span>{isRunning ? 'Pausar (Espaço)' : 'Iniciar (Espaço)'}</span>
            </button>
            <button
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(MODES[currentMode].seconds);
                playTactileFeedback('uncheck');
              }}
              className="px-6 py-4 rounded-2xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white text-base transition-colors cursor-pointer border border-white/10"
            >
              Reiniciar
            </button>
          </div>
        </div>

        {/* Drawer Flutuante de Notas no Modo Zen */}
        {isZenScratchpadOpen && (
          <div className="absolute right-8 top-20 w-80 sm:w-96 bg-[#0f172a]/95 border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl space-y-2 z-50 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#8B5CF6] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                Despejo Mental Rápido
              </span>
              <button
                onClick={() => setIsZenScratchpadOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <textarea
              value={scratchpad}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              placeholder="Ideias rápidas sem sair do foco..."
              rows={6}
              className="w-full bg-[#1E293B]/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/30 resize-none outline-none focus:border-[#8B5CF6]"
              autoFocus
            />
          </div>
        )}

        {/* Rodapé do Modo Zen: Controles de Áudio Binaural & Dicas */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[#94A3B8] border-t border-white/10 pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={toggleAmbientAudio}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isAudioPlaying ? 'bg-[#06B6D4] text-[#001F26] shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-white hover:bg-white/10'
              }`}
              title={isAudioPlaying ? 'Pausar áudio' : 'Iniciar frequência'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isAudioPlaying ? 'volume_up' : 'volume_off'}
              </span>
            </button>

            <div className="flex items-center gap-1">
              {SOUND_MODES.map((sm) => (
                <button
                  key={sm.id}
                  onClick={() => handleSelectSoundType(sm.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-colors cursor-pointer ${
                    soundType === sm.id && isAudioPlaying
                      ? 'bg-[#06B6D4]/25 text-[#67E8F9] border border-[#06B6D4]/40 font-bold'
                      : 'text-[#94A3B8] hover:text-white bg-white/5'
                  }`}
                >
                  {sm.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={audioVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16 accent-[#06B6D4] cursor-pointer"
              title="Volume"
            />
          </div>

          <div className="font-mono text-[11px] text-[#64748B]">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white">Espaço</kbd> para pausar/retomar
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MODO NORMAL (VISÃO COMPLETA)
  // ==========================================
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      {/* Banner de Notificação Suave */}
      {bannerNotice && (
        <div className="p-3.5 bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] rounded-2xl text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="font-medium">{bannerNotice}</span>
          </div>
          <button 
            onClick={() => setBannerNotice('')}
            className="text-xs hover:underline text-[#94A3B8] cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Assistente Tático J.A.R.V.I.S. Integrado */}
      <JarvisHUD
        variant="embedded"
        onDataUpdated={() => loadTasks()}
      />

      {/* 1. BARRA SUPERIOR: METAS DO DIA & MODO ZEN */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
            <span className="material-symbols-outlined text-[22px]">timer</span>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#06B6D4]">
              Foco Total & Disciplina Neural
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {completedCycles} de {dailyGoal} blocos hoje
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                {goalPercentage}% da meta
              </span>
            </div>
          </div>
        </div>

        {/* Ações da Barra Superior */}
        <div className="flex items-center gap-2">
          {/* Botão de Configurações do Pomodoro */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-white/5"
            title="Configurar durações do Pomodoro"
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
          </button>

          {/* Botão de Entrada no Modo Zen */}
          <button
            onClick={() => {
              setIsZenMode(true);
              playTactileFeedback('check');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Ocultar tudo e entrar em modo imersivo tela cheia"
          >
            <span className="material-symbols-outlined text-[16px]">fullscreen</span>
            <span>Entrar no Modo Zen</span>
          </button>
        </div>
      </div>

      {/* 2. GRADE PRINCIPAL: CRONÔMETRO + TAREFAS & SCRATCHPAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bloco Esquerdo: Timer Pomodoro & Ondas Binaurais */}
        <div className="bg-[#0d131f]/90 border border-white/5 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-between backdrop-blur-xl shadow-lg space-y-6">
          
          {/* Seletor de Modo Pomodoro */}
          <div className="flex items-center gap-1.5 bg-[#111827] p-1.5 rounded-2xl border border-white/5 w-full max-w-md">
            <button
              onClick={() => switchMode('foco')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'foco' 
                  ? 'bg-[#06B6D4] text-[#001F26] shadow-[0_0_12px_rgba(6,182,212,0.35)]' 
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              Foco ({pomodoroConfig.focusMinutes || 25}m)
            </button>
            <button
              onClick={() => switchMode('pausaCurta')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'pausaCurta' 
                  ? 'bg-[#10B981] text-[#06231A] shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              Curta ({pomodoroConfig.shortBreak || 5}m)
            </button>
            <button
              onClick={() => switchMode('pausaLonga')}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentMode === 'pausaLonga' 
                  ? 'bg-[#8B5CF6] text-white shadow-[0_0_12px_rgba(139,92,246,0.35)]' 
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              Longa ({pomodoroConfig.longBreak || 15}m)
            </button>
          </div>

          {/* Presets Rápidos de Duração de Foco */}
          {currentMode === 'foco' && (
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[11px] text-[#64748B] mr-1">Presets:</span>
              {[15, 25, 45, 60, 90].map((mins) => {
                const isActive = Math.round(timeLeft / 60) === mins && !isRunning;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDirectMinutes(mins)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#06B6D4] text-[#001F26] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                        : 'bg-white/5 text-[#94A3B8] hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    {mins}m
                  </button>
                );
              })}
            </div>
          )}

          {/* Relógio Digital Central com Ajuste Fino */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-wider font-bold" style={{ color: MODES[currentMode].color }}>
                {MODES[currentMode].name}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => adjustTime(-5 * 60)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer border border-white/5"
                title="Subtrair 5 minutos"
              >
                -5m
              </button>

              <div
                className="text-7xl sm:text-8xl font-bold text-white tracking-tighter select-none"
                style={{ fontFeatureSettings: '"tnum" on, "cv05" on' }}
              >
                {formatTime(timeLeft)}
              </div>

              <button
                onClick={() => adjustTime(5 * 60)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white flex items-center justify-center text-xs font-bold transition-colors cursor-pointer border border-white/5"
                title="Adicionar 5 minutos"
              >
                +5m
              </button>
            </div>

            <div className="text-[11px] text-[#64748B] mt-2 font-mono">
              Atalho: <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-[#94A3B8]">Espaço</kbd> para pausar/retomar
            </div>
          </div>

          {/* Botões de Ação do Timer */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <button 
              onClick={() => {
                setIsRunning(!isRunning);
                playTactileFeedback('check');
              }}
              className="flex-1 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer hover:brightness-110"
              style={{
                backgroundColor: MODES[currentMode].color,
                color: currentMode === 'pausaLonga' ? '#FFFFFF' : '#001F26'
              }}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isRunning ? 'pause' : 'play_arrow'}
              </span>
              <span>{isRunning ? 'Pausar' : 'Iniciar'}</span>
            </button>

            <button 
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(MODES[currentMode].seconds);
                playTactileFeedback('uncheck');
              }}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-[#94A3B8] hover:text-white px-4 py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              title="Reiniciar tempo do modo atual"
            >
              <span className="material-symbols-outlined text-[18px]">replay</span>
            </button>
          </div>

          {/* Player de Ondas Binaurais Estritas */}
          <div className="w-full bg-[#111827]/80 border border-white/5 p-4 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAmbientAudio}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    isAudioPlaying ? 'bg-[#06B6D4] text-[#001F26] shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-white/5 text-white hover:bg-white/10'
                  }`}
                  title={isAudioPlaying ? 'Pausar frequência binaural' : 'Ativar onda binaural de foco'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isAudioPlaying ? 'volume_up' : 'volume_off'}
                  </span>
                </button>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>Ondas Binaurais Neurais</span>
                    {isAudioPlaying && (
                      <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" />
                    )}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] font-mono">
                    {isAudioPlaying ? `● Frequência: ${SOUND_MODES.find(s => s.id === soundType)?.label}` : 'Fones estéreo recomendados para indução binaural'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#94A3B8] font-mono">Vol:</span>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={audioVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-[#06B6D4] cursor-pointer"
                />
              </div>
            </div>

            {/* Grid dos 4 Presets Binaurais Estritos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {SOUND_MODES.map((sm) => {
                const isSelected = soundType === sm.id;
                return (
                  <button
                    key={sm.id}
                    onClick={() => handleSelectSoundType(sm.id)}
                    className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected && isAudioPlaying
                        ? 'bg-[#06B6D4]/15 border-[#06B6D4]/50 text-[#67E8F9] shadow-sm'
                        : isSelected
                        ? 'bg-white/10 border-white/20 text-white font-medium'
                        : 'bg-white/[0.02] border-white/5 text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                    title={sm.desc}
                  >
                    <div className="flex items-center justify-between">
                      <span className="material-symbols-outlined text-[16px]">{sm.icon}</span>
                      <span className="text-[9px] font-mono opacity-60 font-bold">{sm.freq}</span>
                    </div>
                    <span className="text-[11px] font-bold mt-1 truncate">{sm.label}</span>
                    <span className="text-[9px] opacity-70 truncate">{sm.purpose}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bloco Direito: Objetivo, Tarefas de Foco & Despejo Mental */}
        <div className="flex flex-col gap-5">
          
          {/* Tarefas Ativas de Foco & Objetivo */}
          <div className="bg-[#0d131f]/90 border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-lg space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#06B6D4] flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">target</span>
                  <span>Objetivo do Bloco de Foco</span>
                </h3>
                <span className="text-[11px] text-[#94A3B8] font-mono font-medium">
                  {tasks.length} pendentes
                </span>
              </div>

              {/* Card do Objetivo Selecionado */}
              {selectedTask ? (
                <div className="p-3.5 bg-[#06B6D4]/10 border border-[#06B6D4]/30 rounded-2xl flex items-center justify-between mb-3 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-[#06B6D4] uppercase font-bold tracking-wider">
                      Trabalhando agora em:
                    </div>
                    <div className="text-sm font-semibold text-white truncate mt-0.5">
                      {selectedTask.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/5 text-[#94A3B8]">
                        {selectedTask.category}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-red-500/15 text-red-300">
                        {selectedTask.priority}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCompleteTask(selectedTask.id)}
                    className="ml-3 px-3.5 py-2 rounded-xl bg-[#10B981] hover:brightness-110 text-[#06231A] text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">check</span>
                    <span>Concluir</span>
                  </button>
                </div>
              ) : null}

              {/* Lista Seletora de Tarefas */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                  <div className="text-xs text-[#64748B] text-center py-4 border border-dashed border-white/5 rounded-xl">
                    Nenhuma tarefa pendente. Crie uma abaixo ou no Hub Diário!
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isSelected = selectedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#1E293B] border-[#06B6D4] text-white shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-[#94A3B8] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                          <span className={`material-symbols-outlined text-[16px] ${isSelected ? 'text-[#06B6D4]' : 'text-white/30'}`}>
                            {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                          </span>
                          <span className="truncate">{task.title}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8] shrink-0 ml-2">
                          {task.category}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Criação Rápida de Tarefa de Foco */}
            <form onSubmit={handleQuickCreateTask} className="pt-2 border-t border-white/5 flex items-center gap-2">
              <input
                type="text"
                value={newQuickTaskTitle}
                onChange={(e) => setNewQuickTaskTitle(e.target.value)}
                placeholder="+ Criar objetivo de foco imediato..."
                className="flex-1 bg-[#111827] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#06B6D4]"
              />
              <select
                value={newQuickTaskCategory}
                onChange={(e) => setNewQuickTaskCategory(e.target.value)}
                className="bg-[#111827] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-[#94A3B8] outline-none"
              >
                <option value="Trabalho">Trabalho</option>
                <option value="Financeiro">Financeiro</option>
                <option value="Saúde">Saúde</option>
                <option value="Pessoal">Pessoal</option>
              </select>
              <button
                type="submit"
                disabled={!newQuickTaskTitle.trim()}
                className="px-3 py-1.5 bg-[#06B6D4] hover:bg-[#0891b2] text-[#001F26] text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
              >
                Fixar
              </button>
            </form>
          </div>

          {/* Despejo Mental / Scratchpad */}
          <div className="bg-[#0d131f]/90 border border-white/5 rounded-2xl p-5 backdrop-blur-xl shadow-lg flex-1 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#8B5CF6] flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">note_alt</span>
                <span>Despejo Mental / Scratchpad</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyScratchpad}
                  disabled={!scratchpad.trim()}
                  className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                  title="Copiar texto para área de transferência"
                >
                  Copiar
                </button>
                <button
                  onClick={handleSaveScratchpadToVault}
                  disabled={!scratchpad.trim()}
                  className="text-xs px-2.5 py-1 bg-[#8B5CF6]/20 hover:bg-[#8B5CF6]/30 text-[#A78BFA] border border-[#8B5CF6]/30 rounded-lg transition-colors cursor-pointer disabled:opacity-30"
                  title="Salvar como nota no Cofre"
                >
                  Salvar no Cofre
                </button>
                <button
                  onClick={() => {
                    handleScratchpadChange('');
                    playTactileFeedback('uncheck');
                  }}
                  className="text-xs text-[#64748B] hover:text-[#EF4444] p-1 transition-colors cursor-pointer"
                  title="Limpar anotações"
                >
                  <span className="material-symbols-outlined text-[16px]">clear_all</span>
                </button>
              </div>
            </div>

            <textarea 
              value={scratchpad}
              onChange={(e) => handleScratchpadChange(e.target.value)}
              placeholder="Escreva pensamentos rápidos, ideias e insights que surgirem durante o bloco de foco para não se distrair..."
              className="w-full flex-1 min-h-[120px] bg-[#111827] border border-white/5 rounded-xl p-3 text-xs text-white placeholder-white/20 resize-none outline-none focus:border-[#8B5CF6] transition-colors leading-relaxed"
            />

            <div className="flex items-center justify-between text-[10px] text-[#64748B] font-mono">
              <span>Auto-salvamento local ativo</span>
              <span>{scratchpad.length} caracteres • {scratchpad.trim().split(/\s+/).filter(Boolean).length} palavras</span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. HISTÓRICO & TELEMETRIA DE SESSÕES DE HOJE */}
      {!isUltraClean && (
        <div className="bg-[#0d131f]/90 border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#10B981]">insights</span>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Telemetria de Foco do Dia
              </h4>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-[#94A3B8]">
                Tempo Total Focado: <strong className="text-white">{totalFocusMinutesToday} min</strong>
              </span>
              <span className="text-[#94A3B8]">
                XP Conquistado: <strong className="text-[#10B981]">+{completedCycles * 25} XP</strong>
              </span>
            </div>
          </div>

          {/* Lista de Sessões Concluídas Hoje */}
          <div className="space-y-2">
            {todaySessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#64748B] border border-dashed border-white/5 rounded-xl">
                Nenhuma sessão concluída hoje ainda. Inicie seu primeiro bloco Pomodoro acima!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {todaySessions.map((session, idx) => (
                  <div
                    key={session.id || idx}
                    className="p-3 rounded-xl bg-[#111827] border border-white/5 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#10B981] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        Bloco #{todaySessions.length - idx}
                      </span>
                      <span className="text-[#64748B]">{session.time}</span>
                    </div>
                    <div className="text-xs font-medium text-white truncate">
                      {session.taskTitle}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#94A3B8] font-mono pt-1">
                      <span>{session.durationMinutes} minutos</span>
                      <span className="text-[#06B6D4]">
                        {SOUND_MODES.find(s => s.id === session.soundType)?.label || 'Gamma 40Hz'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÕES DO POMODORO */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSavePomodoroSettings}
            className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">tune</span>
                Configurações do Pomodoro
              </span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#94A3B8] font-medium mb-1">
                  Duração do Foco (minutos):
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={pomodoroConfig.focusMinutes || 25}
                  onChange={(e) => setPomodoroConfig({ ...pomodoroConfig, focusMinutes: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] font-medium mb-1">
                  Pausa Curta (minutos):
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={pomodoroConfig.shortBreak || 5}
                  onChange={(e) => setPomodoroConfig({ ...pomodoroConfig, shortBreak: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] font-medium mb-1">
                  Pausa Longa (minutos - a cada 4 ciclos):
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={pomodoroConfig.longBreak || 15}
                  onChange={(e) => setPomodoroConfig({ ...pomodoroConfig, longBreak: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div>
                <label className="block text-[#94A3B8] font-medium mb-1">
                  Meta Diária de Blocos (ciclos):
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={pomodoroConfig.dailyGoalCycles || 4}
                  onChange={(e) => setPomodoroConfig({ ...pomodoroConfig, dailyGoalCycles: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[#94A3B8] font-medium">Sino sonoro ao concluir ciclo:</span>
                <input
                  type="checkbox"
                  checked={pomodoroConfig.soundEnabled !== false}
                  onChange={(e) => setPomodoroConfig({ ...pomodoroConfig, soundEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[#10B981] rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#06B6D4] text-[#001F26] text-xs font-bold hover:brightness-110 cursor-pointer shadow-sm"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
