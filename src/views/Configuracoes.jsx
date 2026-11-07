import React, { useState, useEffect, useRef } from 'react';
import { applyAccentTheme } from '../services/theme';
import { db } from '../services/db';
import { JarvisAIService } from '../services/jarvisAI';
import { jarvisVoice } from '../services/jarvisVoice';
import { JarvisProactiveService } from '../services/jarvisProactive';
import { downloadExecutiveReportMarkdown, printExecutiveReport } from '../services/reportExport';
import { ObsidianVaultExportService } from '../services/obsidianVaultExport';
import { playTactileFeedback, playNotificationChime } from '../services/haptics';
import { NotificationCenterService } from '../services/notificationCenter';
import { UserGoalsService } from '../services/userGoals';
import { calculateUserBadges } from '../services/gamification';

const ACCENT_COLORS = [
  { id: 'esmeralda', name: 'Esmeralda Minimalista', hex: '#10B981', border: '#10B981', bg: 'bg-[#10B981]' },
  { id: 'ciano', name: 'Ciano Cibernético', hex: '#06B6D4', border: '#06B6D4', bg: 'bg-[#06B6D4]' },
  { id: 'violeta', name: 'Violeta Nexus', hex: '#8B5CF6', border: '#8B5CF6', bg: 'bg-[#8B5CF6]' },
  { id: 'ambar', name: 'Âmbar Solar', hex: '#F59E0B', border: '#F59E0B', bg: 'bg-[#F59E0B]' },
  { id: 'rose', name: 'Rosé / Crimson', hex: '#EC4899', border: '#EC4899', bg: 'bg-[#EC4899]' }
];

const CONFIG_SECTIONS = [
  { id: 'perfil', label: 'Perfil & Cores', icon: 'person' },
  { id: 'metas', label: 'Metas Pessoais', icon: 'track_changes' },
  { id: 'ia', label: 'IA & Automação', icon: 'neurology' },
  { id: 'foco', label: 'Foco & Alertas', icon: 'timer' },
  { id: 'dados', label: 'Backup & Soberania', icon: 'cloud_sync' },
  { id: 'gamificacao', label: 'Conquistas', icon: 'military_tech' },
  { id: 'windows', label: 'Desktop & Windows', icon: 'desktop_windows' },
  { id: 'todas', label: 'Ver Tudo', icon: 'dashboard' }
];

export default function Configuracoes({ onProfileUpdate }) {
  // Aba Ativa de Configurações
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('nexus_config_active_tab') || 'perfil';
  });

  const handleSelectSection = (id) => {
    setActiveSection(id);
    localStorage.setItem('nexus_config_active_tab', id);
    playTactileFeedback('tap');
  };

  const isSectionVisible = (id) => activeSection === 'todas' || activeSection === id;

  // Perfil
  const [name, setName] = useState(() => {
    const saved = localStorage.getItem('nexus_user_profile');
    return saved ? JSON.parse(saved).name : 'Alexandre';
  });
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem('nexus_user_profile');
    return saved ? JSON.parse(saved).role : 'Comandante';
  });
  const [avatar, setAvatar] = useState(() => {
    const saved = localStorage.getItem('nexus_user_profile');
    return saved ? JSON.parse(saved).avatar || '' : '';
  });

  const fileInputRef = useRef(null);

  // Tema de Cor
  const [selectedAccent, setSelectedAccent] = useState(() => {
    return localStorage.getItem('nexus_accent_theme') || 'esmeralda';
  });

  // Pomodoro Settings
  const [pomodoroSettings, setPomodoroSettings] = useState(() => {
    const saved = localStorage.getItem('nexus_pomodoro_settings');
    return saved ? JSON.parse(saved) : { focusMinutes: 25, shortBreak: 5, longBreak: 15, soundEnabled: true };
  });

  // Notificações do Navegador & Preferências
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [notifPrefs, setNotifPrefs] = useState(() => NotificationCenterService.getPreferences());

  // Metas e Parâmetros Customizados do Usuário
  const [userGoals, setUserGoals] = useState(() => UserGoalsService.getAll());

  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [copiedStartupCmd, setCopiedStartupCmd] = useState(false);

  // Estados de IA Generativa do J.A.R.V.I.S.
  const [jarvisApiKey, setJarvisApiKey] = useState(() => JarvisAIService.getApiKey());
  const [jarvisProvider, setJarvisProvider] = useState(() => JarvisAIService.getProvider());
  const [jarvisModel, setJarvisModel] = useState(() => JarvisAIService.getModel());
  const [jarvisShowKey, setJarvisShowKey] = useState(false);
  const [jarvisTestStatus, setJarvisTestStatus] = useState('');
  const [jarvisIsTesting, setJarvisIsTesting] = useState(false);
  const [isJarvisActive, setIsJarvisActive] = useState(() => JarvisAIService.isConfigured());

  // Personalização de Nome da IA, Workspace e Ano
  const [assistantName, setAssistantNameState] = useState(() => UserGoalsService.getAssistantName());
  const [appTitle, setAppTitleState] = useState(() => UserGoalsService.getAppTitle());
  const [trackingYear, setTrackingYearState] = useState(() => UserGoalsService.getTrackingYear());

  // Modal de Reinício / Zerar Ecossistema para Novo Usuário
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Inteligência Proativa & Mãos-Livres
  const [isWakeWord, setIsWakeWord] = useState(() => jarvisVoice.isWakeWordActive());
  const [isProactiveBriefing, setIsProactiveBriefing] = useState(() => JarvisProactiveService.isBriefingEnabled());
  const [isProactiveReminders, setIsProactiveReminders] = useState(() => JarvisProactiveService.isRemindersEnabled());
  const [sqliteConnected, setSqliteConnected] = useState(false);

  useEffect(() => {
    db.checkServerHealth().then(h => setSqliteConnected(h.isOnline));
    const handleSqliteStatus = (e) => {
      if (e.detail) setSqliteConnected(Boolean(e.detail.isConnected));
    };
    window.addEventListener('nexus_sqlite_status', handleSqliteStatus);
    return () => window.removeEventListener('nexus_sqlite_status', handleSqliteStatus);
  }, []);

  const handleToggleWakeWord = () => {
    const next = !isWakeWord;
    jarvisVoice.setWakeWordEnabled(next);
    setIsWakeWord(next);
    playTactileFeedback(next ? 'level_up' : 'uncheck');
    triggerFeedback(next ? '✓ Modo Mãos-Livres ativado! Fale "Jarvis" a qualquer momento.' : 'Modo Mãos-Livres desativado.');
  };

  const handleToggleProactiveBriefing = () => {
    const next = !isProactiveBriefing;
    JarvisProactiveService.setBriefingEnabled(next);
    setIsProactiveBriefing(next);
    playTactileFeedback('check');
    triggerFeedback(next ? '✓ Briefing matinal automático ativado!' : 'Briefing matinal desativado.');
  };

  const handleToggleProactiveReminders = () => {
    const next = !isProactiveReminders;
    JarvisProactiveService.setRemindersEnabled(next);
    setIsProactiveReminders(next);
    playTactileFeedback('check');
    triggerFeedback(next ? '✓ Lembretes noturnos ativados!' : 'Lembretes noturnos desativados.');
  };

  const handleManualSyncSQLite = async () => {
    playTactileFeedback('check');
    triggerFeedback('Sincronizando com banco físico SQLite...');
    const ok = await db.hydrateFromBackend();
    setSqliteConnected(ok);
    triggerFeedback(ok ? '✓ Banco SQLite sincronizado com sucesso!' : 'Servidor SQLite offline. Dados preservados no cache local.');
  };

  const triggerFeedback = (msg) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(''), 3000);
  };

  const handleSaveJarvisAI = (e) => {
    if (e) e.preventDefault();
    JarvisAIService.setApiKey(jarvisApiKey, jarvisProvider, jarvisModel);
    setIsJarvisActive(JarvisAIService.isConfigured());
    playTactileFeedback('check');
    triggerFeedback('✓ Chave neural do J.A.R.V.I.S. salva com sucesso!');
  };

  const handleTestJarvisAI = async () => {
    setJarvisIsTesting(true);
    setJarvisTestStatus('Conectando à rede neural...');
    const res = await JarvisAIService.testConnection(jarvisApiKey, jarvisProvider, jarvisModel);
    setJarvisIsTesting(false);
    setJarvisTestStatus(res.message);
    if (res.success) {
      playTactileFeedback('level_up');
      triggerFeedback('✓ Teste concluído com sucesso!');
    }
  };

  const handleClearJarvisAI = () => {
    JarvisAIService.setApiKey('');
    setJarvisApiKey('');
    setIsJarvisActive(false);
    setJarvisTestStatus('');
    triggerFeedback('Chave removida. J.A.R.V.I.S. operando em modo offline.');
  };

  const handleCopyStartupCommand = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('shell:startup');
      setCopiedStartupCmd(true);
      triggerFeedback('✓ Comando "shell:startup" copiado! Pressione Win+R e cole.');
      setTimeout(() => setCopiedStartupCmd(false), 2500);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const profile = { 
      name: name.trim() || 'Usuário', 
      role: role.trim() || 'Comandante',
      avatar: avatar.trim()
    };
    localStorage.setItem('nexus_user_profile', JSON.stringify(profile));

    const cleanAssistant = assistantName.trim() || 'JARVIS';
    const cleanAppTitle = appTitle.trim() || 'Projeto';
    const cleanYear = Number(trackingYear) || new Date().getFullYear();

    UserGoalsService.setAssistantName(cleanAssistant);
    UserGoalsService.setAppTitle(cleanAppTitle);
    UserGoalsService.setTrackingYear(cleanYear);

    if (onProfileUpdate) onProfileUpdate(profile);
    playTactileFeedback('level_up');
    triggerFeedback(`✓ Perfil, IA (${cleanAssistant}) e Workspace atualizados com sucesso!`);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Por favor, selecione uma imagem de até 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (base64) {
        setAvatar(base64);
        triggerFeedback('Foto carregada! Clique em "Salvar Perfil" para aplicar.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    triggerFeedback('Foto removida! Clique em "Salvar Perfil" para aplicar.');
  };

  const handleSelectAccent = (colorId) => {
    setSelectedAccent(colorId);
    applyAccentTheme(colorId);
    triggerFeedback('✓ Tema de cor aplicado instantaneamente!');
  };

  const handleSavePomodoro = (e) => {
    e.preventDefault();
    localStorage.setItem('nexus_pomodoro_settings', JSON.stringify(pomodoroSettings));
    triggerFeedback('✓ Configurações do Pomodoro salvas!');
  };

  const handleSaveUserGoals = (e) => {
    if (e) e.preventDefault();
    UserGoalsService.setAll(userGoals);
    playTactileFeedback('level_up');
    triggerFeedback('✓ Metas e parâmetros pessoais atualizados com sucesso!');
  };

  const handleRequestNotifications = async () => {
    if (typeof Notification === 'undefined') {
      alert('Seu navegador não suporta notificações de sistema.');
      return;
    }
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      NotificationCenterService.send({
        type: 'system',
        title: 'Nexus Command • Notificações Ativadas',
        message: 'Alertas de alta prioridade e compromissos sincronizados com sucesso.',
        urgency: 'medium',
        bypassDND: true
      });
      triggerFeedback('✓ Notificações do sistema ativadas!');
    }
  };

  const handleToggleNotifPref = (key) => {
    const next = !notifPrefs[key];
    NotificationCenterService.setPreference(key, next);
    setNotifPrefs(NotificationCenterService.getPreferences());
    playTactileFeedback(next ? 'check' : 'uncheck');
    triggerFeedback('✓ Preferência de notificação salva.');
  };

  const handleTestChime = () => {
    playNotificationChime('default');
    triggerFeedback('♫ Som de notificação reproduzido.');
  };

  const handleTestDesktopNotification = () => {
    NotificationCenterService.send({
      type: 'system',
      title: '🎯 Teste do Nexus Command',
      message: 'Central de notificações e motor operacional ativos com sucesso!',
      urgency: 'medium',
      bypassDND: true
    });
    triggerFeedback('✓ Alerta de teste disparado!');
  };

  // Medalhas e Conquistas
  const [badgeSummary, setBadgeSummary] = useState(() => {
    return calculateUserBadges(
      db.getTasks(),
      db.getGoals(),
      db.getMediaCatalog(),
      db.getDailyLogs(),
      Number(localStorage.getItem('foco_pomodoro_cycles_count') || 0),
      db.getTransactions(),
      db.getKnowledgeItems(),
      0
    );
  });

  // Backup e Restauração Total do Sistema
  const fileInputBackupRef = useRef(null);

  const handleExportFullBackup = async () => {
    try {
      const snapshot = await db.exportFullSystemSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      playTactileFeedback('level_up');
      triggerFeedback('✓ Backup exportado com sucesso!');
    } catch (err) {
      alert('Erro ao exportar backup: ' + err.message);
    }
  };

  const handleRestoreFullBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Atenção: Restaurar este arquivo substituirá os dados atuais pelo conteúdo do backup. Deseja prosseguir?')) {
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      await db.restoreFullSystemSnapshot(snapshot);
      playTactileFeedback('level_up');
      alert('Ecossistema restaurado com sucesso! O aplicativo será recarregado.');
      window.location.reload();
    } catch (err) {
      alert('Falha ao restaurar backup: ' + err.message);
    }
  };

  useEffect(() => {
    const handleBackupEvent = () => handleExportFullBackup();
    window.addEventListener('nexus_trigger_full_backup', handleBackupEvent);
    return () => window.removeEventListener('nexus_trigger_full_backup', handleBackupEvent);
  }, []);

  // Zerar tudo para começar 100% limpo para um novo usuário
  const handleResetToZero = () => {
    setResetConfirmText('');
    setShowResetModal(true);
  };

  const handleExecuteResetToZero = async () => {
    setIsResetting(true);
    try {
      await db.resetAllToZero();
      UserGoalsService.resetToDefaults();
      setShowResetModal(false);
      playTactileFeedback('uncheck');
      alert('Ecossistema zerado com sucesso! O aplicativo será reiniciado para novo usuário.');
      window.location.reload();
    } catch (err) {
      alert('Falha ao zerar ecossistema: ' + (err.message || err));
      setIsResetting(false);
    }
  };

  // Restaurar dados semente de exemplo
  const handleRestoreDemo = () => {
    if (window.confirm('Deseja recarregar os dados de exemplo/demonstração?')) {
      db.restoreDemoData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-[#1F293D] p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
            <span className="material-symbols-outlined text-[26px]">settings</span>
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[#8B5CF6]">Personalização & Sistema</div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Painel de Configurações</h1>
          </div>
        </div>

        {feedbackMessage && (
          <div className="px-3.5 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold animate-pulse">
            {feedbackMessage}
          </div>
        )}
      </div>

      {/* Seletor de Categorias / Abas de Configuração */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CONFIG_SECTIONS.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => handleSelectSection(sec.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                  : 'bg-[#111827] text-[#94A3B8] border border-[#1F293D] hover:border-[#334155] hover:text-white'
              }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-[#06B6D4]' : 'text-[#64748B]'}`}>
                {sec.icon}
              </span>
              <span>{sec.label}</span>

              {sec.id === 'ia' && isJarvisActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" title="IA Neural Online" />
              )}
              {sec.id === 'gamificacao' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  isActive ? 'bg-[#06B6D4]/20 text-[#06B6D4]' : 'bg-[#1E293B] text-[#64748B]'
                }`}>
                  {badgeSummary.unlockedCount}/{badgeSummary.totalBadges}
                </span>
              )}
            </button>
          );
        })}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {isSectionVisible('perfil') && (
          <>
        {/* Bloco 1: Perfil do Operador */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
            <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">account_circle</span>
            <h2 className="text-base font-bold text-white">Perfil do Usuário</h2>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Foto de Perfil / Avatar */}
            <div>
              <label className="text-xs text-[#94A3B8] block mb-2 font-medium">Foto de Perfil / Avatar</label>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt="Avatar" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#06B6D4] shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#1E293B] border-2 border-[#334155] flex items-center justify-center text-xl font-bold text-[#06B6D4]">
                      {name ? name.charAt(0).toUpperCase() : 'N'}
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                      <span>Escolher Foto</span>
                    </button>

                    {avatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="px-3 py-1.5 rounded-lg bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={avatar.startsWith('data:') ? '' : avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="Ou cole a URL da imagem aqui..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94A3B8] block mb-1">Seu Nome / Como prefere ser chamado</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Alexandre, Comandante..."
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#06B6D4]"
              />
            </div>

            <div>
              <label className="text-xs text-[#94A3B8] block mb-1">Cargo / Foco Principal</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Fundador, Arquiteto de Software, Criador..."
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-sm text-white outline-none focus:border-[#06B6D4]"
              />
            </div>

            {/* Customização da IA & Título do Sistema */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">smart_toy</span>
                  <span>Nome da IA / Assistente</span>
                </label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantNameState(e.target.value.toUpperCase())}
                  placeholder="Ex: JARVIS, FRIDAY, AURA, ALEXA..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs font-mono font-bold text-[#06B6D4] outline-none focus:border-[#06B6D4]"
                />
                <span className="text-[10px] text-[#64748B] mt-0.5 block">Palavra de ativação por voz e comandos</span>
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 flex items-center gap-1.5 font-medium">
                  <span className="material-symbols-outlined text-[15px] text-[#10B981]">terminal</span>
                  <span>Nome do Workspace / Projeto</span>
                </label>
                <input
                  type="text"
                  value={appTitle}
                  onChange={(e) => setAppTitleState(e.target.value)}
                  placeholder="Ex: Projeto, Comando, Central..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-[#10B981]"
                />
                <span className="text-[10px] text-[#64748B] mt-0.5 block">Exibido no topo do menu lateral</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94A3B8] block mb-1 flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-[15px] text-[#F59E0B]">calendar_today</span>
                <span>Ano de Acompanhamento (Status Geral)</span>
              </label>
              <input
                type="number"
                min="2020"
                max="2035"
                value={trackingYear}
                onChange={(e) => setTrackingYearState(Number(e.target.value) || new Date().getFullYear())}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs font-mono text-white outline-none focus:border-[#F59E0B]"
              />
              <span className="text-[10px] text-[#64748B] mt-0.5 block">Ano padrão exibido no Status Geral e nos cálculos</span>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#06B6D4] text-[#001F26] font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Salvar Perfil
            </button>
          </form>
        </div>

        {/* Bloco 2: Tema de Cores de Destaque */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
            <span className="material-symbols-outlined text-[20px] text-[#10B981]">palette</span>
            <h2 className="text-base font-bold text-white">Cores de Destaque do Sistema</h2>
          </div>

          <p className="text-xs text-[#94A3B8]">
            Escolha o tom visual que melhor harmoniza com seu foco e energia mental:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACCENT_COLORS.map((c) => {
              const isSelected = selectedAccent === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectAccent(c.id)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#1E293B] border-[#06B6D4] shadow-sm'
                      : 'bg-[#1E293B]/40 border-[#1F293D] hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3.5 h-3.5 rounded-full ${c.bg}`}></span>
                    <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-[#94A3B8]'}`}>
                      {c.name}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">check</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

          </>
        )}

        {isSectionVisible('metas') && (
          <>
        {/* Bloco: Metas & Parâmetros Pessoais Customizáveis */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-[#06B6D4]">track_changes</span>
              <div>
                <h2 className="text-base font-bold text-white">Metas & Parâmetros Pessoais</h2>
                <p className="text-[11px] text-[#94A3B8]">
                  Defina os seus próprios objetivos para que as barras de progresso, relatórios e telemetria se adaptem ao seu estilo de vida.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveUserGoals}
              className="px-4 py-2 rounded-xl bg-[#06B6D4] text-[#001F26] text-xs font-bold hover:brightness-110 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
            >
              Salvar Metas Pessoais
            </button>
          </div>

          <form onSubmit={handleSaveUserGoals} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* 1. Meta de Livros */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#10B981]">menu_book</span>
                <span>Meta de Livros</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={userGoals.booksTarget}
                onChange={(e) => setUserGoals({ ...userGoals, booksTarget: Number(e.target.value) || 1 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#10B981]"
              />
              <p className="text-[10px] text-[#94A3B8]">Total de livros que você deseja ler.</p>
            </div>

            {/* 2. Meta de Filmes */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8B5CF6]">movie</span>
                <span>Meta de Filmes</span>
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={userGoals.moviesTarget}
                onChange={(e) => setUserGoals({ ...userGoals, moviesTarget: Number(e.target.value) || 1 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#8B5CF6]"
              />
              <p className="text-[10px] text-[#94A3B8]">Obras cinematográficas e documentários.</p>
            </div>

            {/* 3. Meta de Água */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">water_drop</span>
                <span>Meta de Hidratação</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={userGoals.waterTarget}
                onChange={(e) => setUserGoals({ ...userGoals, waterTarget: Number(e.target.value) || 2.5 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#06B6D4]"
              />
              <p className="text-[10px] text-[#94A3B8]">Litros de água por dia.</p>
            </div>

            {/* 4. Meta de Sono */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#8B5CF6]">bedtime</span>
                <span>Meta de Sono</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="4"
                max="14"
                value={userGoals.sleepTarget}
                onChange={(e) => setUserGoals({ ...userGoals, sleepTarget: Number(e.target.value) || 8.0 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#8B5CF6]"
              />
              <p className="text-[10px] text-[#94A3B8]">Horas ideais de descanso por noite.</p>
            </div>

            {/* 5. Meta de Treinos Mensais */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#10B981]">fitness_center</span>
                <span>Treinos no Mês</span>
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={userGoals.workoutsTarget}
                onChange={(e) => setUserGoals({ ...userGoals, workoutsTarget: Number(e.target.value) || 16 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#10B981]"
              />
              <p className="text-[10px] text-[#94A3B8]">Sessões físicas alvo por mês.</p>
            </div>

            {/* 6. Peso Inicial */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#94A3B8]">history</span>
                <span>Peso de Início (kg)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="30"
                max="250"
                value={userGoals.initialWeight || 82}
                onChange={(e) => setUserGoals({ ...userGoals, initialWeight: Number(e.target.value) || 82 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#94A3B8]"
              />
              <p className="text-[10px] text-[#94A3B8]">Ponto de partida da sua jornada.</p>
            </div>

            {/* 7. Peso Alvo */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">monitor_weight</span>
                <span>Peso Alvo (kg)</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="30"
                max="250"
                value={userGoals.targetWeight}
                onChange={(e) => setUserGoals({ ...userGoals, targetWeight: Number(e.target.value) || 75 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#06B6D4]"
              />
              <p className="text-[10px] text-[#94A3B8]">Meta de composição corporal.</p>
            </div>

            {/* 8. Teto de Gastos */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#EF4444]">account_balance_wallet</span>
                <span>Teto de Gastos (R$)</span>
              </label>
              <input
                type="number"
                step="50"
                min="100"
                value={userGoals.monthlyBudget}
                onChange={(e) => setUserGoals({ ...userGoals, monthlyBudget: Number(e.target.value) || 5000 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#EF4444]"
              />
              <p className="text-[10px] text-[#94A3B8]">Orçamento mensal máximo.</p>
            </div>

            {/* 9. Meta de Aporte */}
            <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1.5">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#10B981]">savings</span>
                <span>Meta de Aporte (R$)</span>
              </label>
              <input
                type="number"
                step="50"
                min="0"
                value={userGoals.monthlySavingsTarget}
                onChange={(e) => setUserGoals({ ...userGoals, monthlySavingsTarget: Number(e.target.value) || 1500 })}
                className="w-full bg-[#111827] border border-[#334155] rounded-lg p-2 text-sm font-mono font-bold text-white outline-none focus:border-[#10B981]"
              />
              <p className="text-[10px] text-[#94A3B8]">Meta de economia/investimento mensal.</p>
            </div>
          </form>
        </div>
          </>
        )}

        {isSectionVisible('foco') && (
          <>
        {/* Bloco 3: Configurações do Pomodoro & Foco */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
            <span className="material-symbols-outlined text-[20px] text-[#F59E0B]">timer</span>
            <h2 className="text-base font-bold text-white">Temporizador do Modo Foco</h2>
          </div>

          <form onSubmit={handleSavePomodoro} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Foco (min)</label>
                <input
                  type="number"
                  min="5"
                  max="90"
                  value={pomodoroSettings.focusMinutes}
                  onChange={(e) => setPomodoroSettings({ ...pomodoroSettings, focusMinutes: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Pausa Curta</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={pomodoroSettings.shortBreak}
                  onChange={(e) => setPomodoroSettings({ ...pomodoroSettings, shortBreak: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Pausa Longa</label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={pomodoroSettings.longBreak}
                  onChange={(e) => setPomodoroSettings({ ...pomodoroSettings, longBreak: Number(e.target.value) })}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#1E293B]/40 rounded-xl border border-[#1F293D]">
              <div className="text-xs">
                <div className="text-white font-medium">Sino Harmônico Suave</div>
                <div className="text-[11px] text-[#94A3B8]">Toca uma frequência binaural ao fim de cada ciclo</div>
              </div>
              <input
                type="checkbox"
                checked={pomodoroSettings.soundEnabled}
                onChange={(e) => setPomodoroSettings({ ...pomodoroSettings, soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-[#10B981] cursor-pointer"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#10B981] text-[#06231A] font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Salvar Tempos
            </button>
          </form>
        </div>

        {/* Bloco 4: Central de Notificações & Alarmes Táticos */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[22px] text-[#06B6D4]">notifications_active</span>
              <div>
                <h2 className="text-base font-bold text-white">Central de Notificações & Alarmes Táticos</h2>
                <p className="text-[11px] text-[#94A3B8]">Alertas inteligentes para manter a disciplina, finanças e compromissos alinhados.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestChime}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                title="Testar áudio sintetizado Web Audio"
              >
                <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">volume_up</span>
                <span>Ouvir Chime</span>
              </button>

              <button
                type="button"
                onClick={handleTestDesktopNotification}
                className="px-3 py-1.5 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#06B6D4]/30"
                title="Disparar uma notificação de teste no Windows e na Central"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                <span>Testar Alerta</span>
              </button>
            </div>
          </div>

          {/* Status da Permissão do Navegador */}
          <div className="p-3.5 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>Notificações Nativas do Windows / Desktop</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  notificationPermission === 'granted' 
                    ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' 
                    : 'bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30'
                }`}>
                  {notificationPermission === 'granted' ? 'Permitido ✓' : 'Aguardando Permissão'}
                </span>
              </div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5">
                Permite avisos mesmo quando o navegador ou aplicativo estiver em segundo plano.
              </div>
            </div>

            {notificationPermission !== 'granted' && (
              <button
                onClick={handleRequestNotifications}
                className="px-3.5 py-1.5 rounded-xl bg-[#06B6D4] text-[#001F26] text-xs font-bold hover:opacity-90 transition-opacity self-start sm:self-auto cursor-pointer"
              >
                Permitir no Sistema
              </button>
            )}
          </div>

          {/* Grid de Controles dos Monitores Autônomos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {/* Alarme Time-blocking */}
            <div
              onClick={() => handleToggleNotifPref('taskAlarms')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notifPrefs.taskAlarms
                  ? 'bg-[#06B6D4]/[0.08] border-[#06B6D4]/40 hover:bg-[#06B6D4]/[0.12]'
                  : 'bg-[#1E293B]/30 border-[#1F293D] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#06B6D4] mt-0.5">schedule</span>
                <div>
                  <div className="text-xs font-bold text-white">Alarme de Tarefas (10 min antes)</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                    Avisa antes de compromissos com horário marcado no Hub Diário.
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${notifPrefs.taskAlarms ? 'text-[#06B6D4]' : 'text-[#64748B]'}`}>
                {notifPrefs.taskAlarms ? 'toggle_on' : 'toggle_off'}
              </span>
            </div>

            {/* Radar Financeiro */}
            <div
              onClick={() => handleToggleNotifPref('financeRadar')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notifPrefs.financeRadar
                  ? 'bg-[#10B981]/[0.08] border-[#10B981]/40 hover:bg-[#10B981]/[0.12]'
                  : 'bg-[#1E293B]/30 border-[#1F293D] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#10B981] mt-0.5">credit_card</span>
                <div>
                  <div className="text-xs font-bold text-white">Radar Financeiro (48h antes)</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                    Alerta com 2 dias de antecedência antes de débitos de assinaturas.
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${notifPrefs.financeRadar ? 'text-[#10B981]' : 'text-[#64748B]'}`}>
                {notifPrefs.financeRadar ? 'toggle_on' : 'toggle_off'}
              </span>
            </div>

            {/* Guardião de Streaks */}
            <div
              onClick={() => handleToggleNotifPref('habitGuardian')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notifPrefs.habitGuardian
                  ? 'bg-[#F59E0B]/[0.08] border-[#F59E0B]/40 hover:bg-[#F59E0B]/[0.12]'
                  : 'bg-[#1E293B]/30 border-[#1F293D] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#F59E0B] mt-0.5">local_fire_department</span>
                <div>
                  <div className="text-xs font-bold text-white">Guardião de Streaks (20h30)</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                    Alerta de emergência caso hábitos em sequência estejam pendentes.
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${notifPrefs.habitGuardian ? 'text-[#F59E0B]' : 'text-[#64748B]'}`}>
                {notifPrefs.habitGuardian ? 'toggle_on' : 'toggle_off'}
              </span>
            </div>

            {/* Lembrete de Hidratação & Postura */}
            <div
              onClick={() => handleToggleNotifPref('hydration')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notifPrefs.hydration
                  ? 'bg-[#06B6D4]/[0.08] border-[#06B6D4]/40 hover:bg-[#06B6D4]/[0.12]'
                  : 'bg-[#1E293B]/30 border-[#1F293D] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#06B6D4] mt-0.5">water_drop</span>
                <div>
                  <div className="text-xs font-bold text-white">Lembrete de Hidratação & Postura</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                    Avisos a cada 90 minutos durante o horário útil (08h às 19h).
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${notifPrefs.hydration ? 'text-[#06B6D4]' : 'text-[#64748B]'}`}>
                {notifPrefs.hydration ? 'toggle_on' : 'toggle_off'}
              </span>
            </div>

            {/* Auto DND no Hiperfoco */}
            <div
              onClick={() => handleToggleNotifPref('autoDNDFocus')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notifPrefs.autoDNDFocus
                  ? 'bg-[#8B5CF6]/[0.08] border-[#8B5CF6]/40 hover:bg-[#8B5CF6]/[0.12]'
                  : 'bg-[#1E293B]/30 border-[#1F293D] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#8B5CF6] mt-0.5">do_not_disturb_on</span>
                <div>
                  <div className="text-xs font-bold text-white">Silenciar no Hiperfoco (DND)</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                    Pausa notificações secundárias automaticamente durante o Pomodoro.
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${notifPrefs.autoDNDFocus ? 'text-[#8B5CF6]' : 'text-[#64748B]'}`}>
                {notifPrefs.autoDNDFocus ? 'toggle_on' : 'toggle_off'}
              </span>
            </div>

            {/* Sons Web Audio */}
            <div
              onClick={() => handleToggleNotifPref('soundEnabled')}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                notifPrefs.soundEnabled
                  ? 'bg-[#10B981]/[0.08] border-[#10B981]/40 hover:bg-[#10B981]/[0.12]'
                  : 'bg-[#1E293B]/30 border-[#1F293D] opacity-60 hover:opacity-80'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-[#10B981] mt-0.5">volume_up</span>
                <div>
                  <div className="text-xs font-bold text-white">Chimes Sonoros (Web Audio)</div>
                  <div className="text-[10px] text-[#94A3B8] mt-0.5 leading-relaxed">
                    Sons harmônicos e sutis sem necessidade de arquivos externos.
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[20px] ${notifPrefs.soundEnabled ? 'text-[#10B981]' : 'text-[#64748B]'}`}>
                {notifPrefs.soundEnabled ? 'toggle_on' : 'toggle_off'}
              </span>
            </div>
          </div>
        </div>

          </>
        )}

        {isSectionVisible('dados') && (
          <>
        {/* Bloco 5: Backup Total & Soberania dos Dados */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
            <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">cloud_sync</span>
            <h2 className="text-base font-bold text-white">Backup Total & Soberania dos Dados</h2>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] text-[#94A3B8]">
              Exporte todo o seu banco de dados (metas, tarefas, hábitos, finanças, mídias e notas) em um arquivo JSON snapshot seguro, ou restaure em qualquer computador com 1 clique.
            </p>

            <input
              type="file"
              ref={fileInputBackupRef}
              onChange={handleRestoreFullBackup}
              accept=".json"
              className="hidden"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleExportFullBackup}
                className="px-3.5 py-2 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Baixar snapshot JSON completo com todos os dados do ecossistema"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Baixar Backup (.JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputBackupRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Restaurar arquivo JSON snapshot de backup"
              >
                <span className="material-symbols-outlined text-[16px]">upload_file</span>
                <span>Restaurar Backup (.JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreDemo}
                className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white border border-[#334155] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Recarregar os dados de exemplo do Obsidian Nexus"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                <span>Restaurar Demo</span>
              </button>

              <button
                type="button"
                onClick={handleResetToZero}
                className="px-3.5 py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Limpa tarefas, metas, despesas, livros e notas para você criar do zero"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>Zerar Tudo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bloco: Relatório Executivo e Exportações Segundo Cérebro */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/40 flex items-center justify-center text-[#8B5CF6]">
                <span className="material-symbols-outlined text-[22px]">assignment</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Relatório Executivo & Exportações Segundo Cérebro</h2>
                <p className="text-[11px] text-[#94A3B8]">
                  Gere um documento consolidado de hábitos, finanças, tarefas e metas para arquivo pessoal no Obsidian ou impressão em PDF.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => ObsidianVaultExportService.exportFullVaultZip()}
              className="px-4 py-2.5 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              title="Exportar todas as pastas e notas no padrão nativo Obsidian Vault (.ZIP)"
            >
              <span className="material-symbols-outlined text-[17px]">folder_zip</span>
              <span>Vault Completo (.ZIP)</span>
            </button>

            <button
              type="button"
              onClick={downloadExecutiveReportMarkdown}
              className="px-4 py-2.5 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              title="Baixar em formato Markdown (.md) para o Obsidian"
            >
              <span className="material-symbols-outlined text-[17px]">download</span>
              <span>Baixar Relatório (.MD)</span>
            </button>

            <button
              type="button"
              onClick={printExecutiveReport}
              className="px-4 py-2.5 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              title="Imprimir ou salvar em PDF"
            >
              <span className="material-symbols-outlined text-[17px]">print</span>
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

        {/* Bloco Dedicado: Zerar Ecossistema para Novo Usuário */}
        <div className="bg-[#111827] border border-[#EF4444]/40 p-6 rounded-2xl space-y-4 shadow-[0_0_25px_rgba(239,68,68,0.08)] lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EF4444]/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center text-[#EF4444]">
                <span className="material-symbols-outlined text-[22px]">delete_sweep</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Zerar Dados do Ecossistema (Modo Novo Usuário)</h2>
                <p className="text-[11px] text-[#94A3B8]">
                  Comece 100% do zero ou prepare este programa para outra pessoa utilizar com as metas e rotinas dela.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetToZero}
              className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#EF4444]/20 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Zerar Dados para Novo Usuário</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1">
              <div className="text-white font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#EF4444]">check_box_outline_blank</span>
                <span>O que é apagado</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Todas as tarefas, finanças, treinos, hábitos, leituras, notas e metas preexistentes no SQLite e no navegador.
              </p>
            </div>

            <div className="p-3 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1">
              <div className="text-white font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#10B981]">tune</span>
                <span>Pronto para quem for usar</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                A pessoa poderá cadastrar seu próprio nome, metas, peso ideal, orçamento e treinos sem nenhum dado misturado.
              </p>
            </div>

            <div className="p-3 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-1">
              <div className="text-white font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#06B6D4]">shield</span>
                <span>Segurança com Confirmação</span>
              </div>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                Você pode baixar um Backup (.JSON) antes se quiser guardar os dados atuais para restaurar futuramente.
              </p>
            </div>
          </div>
        </div>

          </>
        )}

        {isSectionVisible('ia') && (
          <>
        {/* Bloco: Matriz de Inteligência Artificial do J.A.R.V.I.S. */}
        <div className="bg-[#111827] border border-[#06B6D4]/40 p-6 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(6,182,212,0.12)] lg:col-span-2 relative overflow-hidden">
          {/* Glowing Arc Reactor Top Indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F293D] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4] flex items-center justify-center text-[#06B6D4] shadow-[0_0_15px_rgba(6,182,212,0.35)] shrink-0">
                <span className="material-symbols-outlined text-[24px]">neurology</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">Inteligência Artificial do J.A.R.V.I.S.</h2>
                  {isJarvisActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 text-[10px] font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                      ONLINE ({jarvisProvider.toUpperCase()})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-[10px] font-mono font-bold">
                      MODO LOCAL OFFLINE
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Conecte uma chave de API para liberar raciocínio profundo, respostas com contexto do seu banco SQLite e diálogos avançados por voz ou texto.
                </p>
              </div>
            </div>

            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto shrink-0"
            >
              <span>Obter Chave Grátis (Google AI)</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>

          <form onSubmit={handleSaveJarvisAI} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 font-mono font-medium">Provedor de IA</label>
                <select
                  value={jarvisProvider}
                  onChange={(e) => setJarvisProvider(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#06B6D4] font-mono"
                >
                  <option value="gemini">Google Gemini (Gratuito & Recomendado)</option>
                  <option value="openai">OpenAI (ChatGPT / GPT-4o-mini)</option>
                </select>
                <span className="text-[10px] text-[#64748B] mt-1 block">
                  {jarvisProvider === 'gemini' ? 'Sem limite de custo inicial pelo Google AI Studio' : 'Requer créditos na sua conta OpenAI'}
                </span>
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 font-mono font-medium">Modelo Neural</label>
                <select
                  value={jarvisModel}
                  onChange={(e) => setJarvisModel(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#06B6D4] font-mono"
                >
                  {jarvisProvider === 'gemini' ? (
                    <>
                      <option value="gemini-3.5-flash">gemini-3.5-flash (Ultra Rápido & Fluido)</option>
                      <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Econômico e Veloz)</option>
                      <option value="gemini-flash-latest">gemini-flash-latest (Versão Estável)</option>
                    </>
                  ) : (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini (Econômico e Veloz)</option>
                      <option value="gpt-4o">gpt-4o (Máximo Raciocínio)</option>
                    </>
                  )}
                </select>
                <span className="text-[10px] text-[#64748B] mt-1 block">Modelo utilizado nas inferências</span>
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 font-mono font-medium">Chave de API (Secret Key)</label>
                <div className="relative">
                  <input
                    type={jarvisShowKey ? 'text' : 'password'}
                    value={jarvisApiKey}
                    onChange={(e) => setJarvisApiKey(e.target.value)}
                    placeholder={jarvisProvider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl pl-3 pr-10 py-2.5 text-xs text-white outline-none focus:border-[#06B6D4] font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setJarvisShowKey(!jarvisShowKey)}
                    className="absolute right-2.5 top-2.5 text-[#94A3B8] hover:text-white cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {jarvisShowKey ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <span className="text-[10px] text-[#64748B] mt-1 block">Armazenada no seu localStorage (segurança zero-leak)</span>
              </div>
            </div>

            {/* Feedback do Teste de Conexão */}
            {jarvisTestStatus && (
              <div className={`p-3 rounded-xl font-mono text-xs flex items-center gap-2 ${
                jarvisTestStatus.includes('✓')
                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                  : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {jarvisTestStatus.includes('✓') ? 'check_circle' : 'error'}
                </span>
                <span>{jarvisTestStatus}</span>
              </div>
            )}

            {/* Tutorial Passo a Passo do Gemini */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-2 text-xs">
              <div className="font-semibold text-white flex items-center gap-1.5 font-mono">
                <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">lightbulb</span>
                <span>Como obter sua chave do Google Gemini em 1 minuto (100% Gratuito):</span>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[#94A3B8] text-[11px] font-mono leading-relaxed">
                <li>Acesse o <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[#06B6D4] underline">Google AI Studio (aistudio.google.com/app/apikey)</a> com sua conta Google.</li>
                <li>Clique no botão azul <strong className="text-white">"Create API key"</strong> (ou "Criar chave de API").</li>
                <li>Selecione um projeto padrão e clique em <strong className="text-white">"Create API key in existing project"</strong>.</li>
                <li>Copie a chave que começa com <code className="bg-[#111827] px-1 rounded text-[#06B6D4]">AIzaSy...</code> e cole no campo acima.</li>
                <li>Clique em <strong className="text-white">"Testar Conexão"</strong> e depois em <strong className="text-white">"Salvar Chave"</strong>. Pronto! O J.A.R.V.I.S. passa a ter raciocínio neural completo.</li>
              </ol>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-[#64748B]">
                Quando a chave estiver ativa, o J.A.R.V.I.S. saberá seu saldo, suas tarefas e suas metas para aconselhá-lo.
              </div>

              <div className="flex items-center gap-2">
                {jarvisApiKey && (
                  <button
                    type="button"
                    onClick={handleClearJarvisAI}
                    className="px-3.5 py-2 rounded-xl bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 text-xs font-semibold font-mono transition-colors cursor-pointer"
                  >
                    Remover Chave
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleTestJarvisAI}
                  disabled={!jarvisApiKey.trim() || jarvisIsTesting}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white border border-[#334155] text-xs font-semibold font-mono transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">network_check</span>
                  <span>{jarvisIsTesting ? 'Testando Conexão...' : 'Testar Conexão'}</span>
                </button>
                <button
                  type="submit"
                  disabled={!jarvisApiKey.trim()}
                  className="px-5 py-2 rounded-xl bg-[#06B6D4] hover:opacity-90 text-[#001F26] text-xs font-bold font-mono transition-opacity disabled:opacity-40 cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Salvar Chave Neural</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bloco 4.5: Automação Proativa, Mãos-Livres & Banco Físico SQLite */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#1F293D] pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">psychology_alt</span>
              <h2 className="text-base font-bold text-white">Automação Proativa, Mãos-Livres & Banco de Dados</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 border ${
                sqliteConnected 
                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40' 
                  : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${sqliteConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#F59E0B]'}`}></span>
                <span>{sqliteConnected ? 'SQLITE FÍSICO CONECTADO (projeto2027.db)' : 'MODO CACHE LOCAL (Offline)'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Mãos-Livres Wake-Word */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <span className="material-symbols-outlined text-[17px] text-[#06B6D4]">sensors</span>
                    <span>Wake-Word ("Jarvis")</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isWakeWord ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#334155] text-[#94A3B8]'
                  }`}>
                    {isWakeWord ? 'ATIVO' : 'DESLIGADO'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Permite falar "Jarvis..." sem tocar no microfone ou teclado.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleWakeWord}
                className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isWakeWord
                    ? 'bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border-[#10B981]/40'
                    : 'bg-[#1E293B] hover:bg-[#334155] text-white border-[#334155]'
                }`}
              >
                {isWakeWord ? 'Desativar Mãos-Livres' : 'Ativar Mãos-Livres'}
              </button>
            </div>

            {/* 2. Briefing Matinal Proativo */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <span className="material-symbols-outlined text-[17px] text-[#F59E0B]">wb_sunny</span>
                    <span>Briefing Matinal</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isProactiveBriefing ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#334155] text-[#94A3B8]'
                  }`}>
                    {isProactiveBriefing ? 'ATIVO' : 'DESLIGADO'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  J.A.R.V.I.S. dá o resumo diário automaticamente ao abrir o app pela 1ª vez.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleProactiveBriefing}
                className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isProactiveBriefing
                    ? 'bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border-[#10B981]/40'
                    : 'bg-[#1E293B] hover:bg-[#334155] text-white border-[#334155]'
                }`}
              >
                {isProactiveBriefing ? 'Desativar Briefing' : 'Ativar Briefing'}
              </button>
            </div>

            {/* 3. Lembretes Noturnos de Hábitos */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <span className="material-symbols-outlined text-[17px] text-[#8B5CF6]">bedtime</span>
                    <span>Lembretes Noturnos</span>
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    isProactiveReminders ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#334155] text-[#94A3B8]'
                  }`}>
                    {isProactiveReminders ? 'ATIVO' : 'DESLIGADO'}
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Aviso sonoro às 19h caso restem hábitos pendentes no dia.
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleProactiveReminders}
                className={`w-full py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                  isProactiveReminders
                    ? 'bg-[#10B981]/20 hover:bg-[#10B981]/30 text-[#10B981] border-[#10B981]/40'
                    : 'bg-[#1E293B] hover:bg-[#334155] text-white border-[#334155]'
                }`}
              >
                {isProactiveReminders ? 'Desativar Lembretes' : 'Ativar Lembretes'}
              </button>
            </div>

            {/* 4. Sincronização SQLite */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <span className="material-symbols-outlined text-[17px] text-[#10B981]">storage</span>
                    <span>Sincronização Físico</span>
                  </span>
                </div>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                  Força gravação e leitura direta do banco `database/projeto2027.db`.
                </p>
              </div>
              <button
                type="button"
                onClick={handleManualSyncSQLite}
                className="w-full py-2 px-3 rounded-xl text-xs font-mono font-bold bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/40 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">sync</span>
                <span>Sincronizar SQLite</span>
              </button>
            </div>
          </div>

        </div>

          </>
        )}

        {isSectionVisible('gamificacao') && (
          <>
        {/* Bloco: Medalhas & Conquistas Nexus */}
        <div className="bg-[#111827] border border-[#F59E0B]/30 p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">military_tech</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Medalhas & Conquistas Nexus</h2>
                <p className="text-[11px] text-[#94A3B8]">Marcos psicológicos de disciplina, consistência e execução estratégica.</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 font-mono text-xs font-bold">
                {badgeSummary.unlockedCount} / {badgeSummary.totalBadges} Desbloqueadas ({badgeSummary.percentage}%)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {badgeSummary.badges.map((b) => (
              <div
                key={b.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                  b.unlocked
                    ? 'bg-[#1E293B]/70 border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                    : 'bg-[#111827]/60 border-[#1F293D] opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[22px] ${b.unlocked ? 'text-[#10B981]' : 'text-[#64748B]'}`}>
                      {b.icon}
                    </span>
                    <span className="text-xs font-bold text-white leading-tight">{b.title}</span>
                  </div>
                  {b.unlocked ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 shrink-0">
                      DESBLOQUEADO
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#334155] text-[#94A3B8] shrink-0">
                      {b.current}/{b.target} {b.unit}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#94A3B8] leading-tight">
                  {b.description}
                </p>

                {!b.unlocked && (
                  <div className="w-full bg-[#1F293D] h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-[#06B6D4] h-full rounded-full transition-all duration-500"
                      style={{ width: `${b.progressPct}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
          </>
        )}

        {isSectionVisible('windows') && (
          <>
        {/* Bloco 5: Inicialização com o Windows & Instalação Desktop */}
        <div className="bg-[#111827] border border-[#1F293D] p-6 rounded-2xl space-y-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
            <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">desktop_windows</span>
            <h2 className="text-base font-bold text-white">Inicialização com o Windows & Aplicativo Desktop</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cartão de Inicialização Automática */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#10B981] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                <span>Iniciar Junto com o Computador</span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Você pode fazer o Nexus Command iniciar de forma 100% silenciosa em segundo plano sempre que ligar o Windows.
              </p>
              
              <div className="p-3 bg-[#111827] rounded-lg border border-[#334155]/40 space-y-2 text-xs">
                <div className="font-semibold text-white">Arquivos prontos na pasta do projeto:</div>
                <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                  <span className="text-[#10B981] font-mono font-bold">1.</span>
                  <span>Dê 2 cliques em <strong className="text-white">ativar_inicializacao_windows.bat</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
                  <span className="text-[#06B6D4] font-mono font-bold">2.</span>
                  <span>Para desativar quando quiser: <strong className="text-white">desativar_inicializacao_windows.bat</strong></span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#8B5CF6] font-mono font-bold">
                  <span className="text-[#8B5CF6]">3.</span>
                  <span>Execução invisível sem janelas pretas via <strong className="text-white">iniciar_silencioso.vbs</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyStartupCommand}
                  className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs text-[#06B6D4] border border-[#06B6D4]/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Copiar comando shell:startup para abrir a pasta de inicialização do Windows"
                >
                  <span className="material-symbols-outlined text-[15px]">content_copy</span>
                  <span>{copiedStartupCmd ? 'Copiado!' : 'Copiar "shell:startup" (Win+R)'}</span>
                </button>
              </div>
            </div>

            {/* Cartão de Instalação como App PWA */}
            <div className="p-4 bg-[#1E293B]/40 rounded-xl border border-[#1F293D] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#8B5CF6] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[18px]">install_desktop</span>
                <span>Instalar como App Nativo do Windows</span>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                O Nexus Command está configurado como <strong>PWA (Progressive Web App)</strong>. Você pode executá-lo em uma janela dedicada sem abas, barras de endereço ou distrações, igual ao Spotify, Notion ou Obsidian.
              </p>

              <div className="p-3 bg-[#111827] rounded-lg border border-[#334155]/40 space-y-2 text-xs">
                <div className="font-semibold text-white">Como instalar no seu navegador:</div>
                <div className="text-[11px] text-[#94A3B8]">
                  • No <strong>Google Chrome</strong> ou <strong>Brave</strong>: clique no ícone <span className="text-white">"Instalar aplicativo"</span> no canto direito da barra de endereço ou no menu ⋮ &gt; Instalar Nexus Command.
                </div>
                <div className="text-[11px] text-[#94A3B8]">
                  • No <strong>Microsoft Edge</strong>: clique em <span className="text-white">Aplicativos &gt; Instalar este site como aplicativo</span>.
                </div>
                <div className="text-[11px] text-[#10B981] font-medium pt-1">
                  ✓ Cria atalho direto na sua Área de Trabalho e no Menu Iniciar do Windows!
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Modal Seguro de Confirmação para Zerar Ecossistema */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#EF4444]/60 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#EF4444]">
              <div className="w-12 h-12 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/40 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Zerar Todos os Dados?</h3>
                <p className="text-xs text-[#94A3B8]">Preparação para Novo Usuário / Reset Geral</p>
              </div>
            </div>

            <div className="p-3.5 bg-[#1E293B]/60 rounded-xl border border-[#1F293D] text-xs text-[#CBD5E1] space-y-2 leading-relaxed">
              <p>
                Esta ação vai limpar <strong>completamente</strong> o banco SQLite e o cache local para uma folha 100% virgem:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#94A3B8]">
                <li>Tarefas, Metas e Projetos Estratégicos</li>
                <li>Transações e Assinaturas Financeiras</li>
                <li>Métricas de Saúde, Histórico de Treinos e Calorias</li>
                <li>Hábitos Diários, Livros e Diários de Reflexão</li>
              </ul>
              <div className="text-[11px] text-[#F59E0B] font-medium pt-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px]">lightbulb</span>
                <span>Dica: Use "Baixar Backup (.JSON)" antes se quiser guardar os dados atuais.</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-[#94A3B8] block">
                Para confirmar a limpeza total, digite <span className="font-mono text-white font-bold bg-[#1E293B] px-1.5 py-0.5 rounded border border-[#334155]">ZERAR</span> abaixo:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                placeholder="Digite ZERAR"
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#EF4444]"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteResetToZero}
                disabled={resetConfirmText.trim() !== 'ZERAR' || isResetting}
                className="px-5 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-[#EF4444]/25"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>{isResetting ? 'Zerando Dados...' : 'Sim, Zerar Tudo Agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

