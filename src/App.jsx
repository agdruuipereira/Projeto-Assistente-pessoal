import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import HubDiario from './views/HubDiario';
import Calendario from './views/Calendario';
import FocoTotal from './views/FocoTotal';
import Metas from './views/Metas';
import Metas2027 from './views/Metas2027';
import Financas from './views/Financas';
import LeituraCinema from './views/LeituraCinema';
import Cofre from './views/Cofre';
import Configuracoes from './views/Configuracoes';
import SaudeMetricas from './views/SaudeMetricas';
import WeeklyReviewModal from './components/WeeklyReviewModal';
import QuickCaptureModal from './components/QuickCaptureModal';
import OnboardingModal from './components/OnboardingModal';
import JarvisHUD from './components/JarvisHUD';
import NotificationCenterDrawer from './components/NotificationCenterDrawer';
import { JarvisProactiveService } from './services/jarvisProactive';
import { NotificationEngine } from './services/notificationEngine';
import { NotificationCenterService } from './services/notificationCenter';
import { db } from './services/db';
import { applyAccentTheme, getActiveThemeId } from './services/theme';
import { calculateUserXP } from './services/gamification';

class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ViewErrorBoundary capturou falha na tela:', error, errorInfo);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.viewKey !== this.props.viewKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-[#111827] border border-[#EF4444]/40 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">vital_signs</span>
          </div>
          <h2 className="text-lg font-bold text-white">Falha Temporária na Visualização</h2>
          <p className="text-xs text-[#94A3B8]">
            {this.state.error?.message || 'Ocorreu um erro ao renderizar este módulo.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-[#06B6D4] text-[#001F26] text-xs font-bold hover:brightness-110 cursor-pointer"
            >
              Tentar Novamente
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#1E293B] text-white text-xs font-semibold hover:bg-[#334155] cursor-pointer"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState('hub-diario');
  const [selectedHubDate, setSelectedHubDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(NotificationCenterService.getUnreadCount());
  const [xpVersion, setXpVersion] = useState(0);

  // Assistente Rápido de Boas-Vindas pós-Reset / Primeiro Acesso
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    try {
      return localStorage.getItem('projeto_onboarding_completed') !== 'true';
    } catch (e) {
      return false;
    }
  });

  // Modo Ultra-Clean / Visão Essencial (Elimina ruído cognitivo)
  const [isUltraClean, setIsUltraClean] = useState(() => {
    try {
      return localStorage.getItem('projeto_ultra_clean') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleUltraClean = () => {
    setIsUltraClean(prev => {
      const next = !prev;
      try {
        localStorage.setItem('projeto_ultra_clean', next ? 'true' : 'false');
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('nexus_ultra_clean_updated', { detail: { isUltraClean: next } }));
      return next;
    });
  };

  // Perfil do Operador
  const [userProfile, setUserProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_user_profile');
      return saved ? JSON.parse(saved) : { name: 'Alexandre', role: 'Comandante Central' };
    } catch (e) {
      return { name: 'Alexandre', role: 'Comandante Central' };
    }
  });

  // Database reactive states
  const [dailyLog, setDailyLog] = useState(db.getDailyLog());
  const [tasks, setTasks] = useState(db.getTasks());
  const [goals, setGoals] = useState(db.getGoals());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [subscriptions, setSubscriptions] = useState(db.getSubscriptions());
  const [mediaCatalog, setMediaCatalog] = useState(db.getMediaCatalog());
  const [knowledgeItems, setKnowledgeItems] = useState(db.getKnowledgeItems());
  const [vaultItems, setVaultItems] = useState(db.getVaultItems());

  // Handlers for Hub Diário
  const handleUpdateDailyLog = (updatedLog) => {
    const saved = db.saveDailyLog(updatedLog);
    setDailyLog({ ...saved });
  };

  const handleCreateTask = (taskData) => {
    db.createTask(taskData);
    setTasks([...db.getTasks()]);
  };

  const handleUpdateTaskStatus = (id, newStatus) => {
    db.updateTask(id, { status: newStatus });
    setTasks([...db.getTasks()]);
  };

  const handleDeleteTask = (id) => {
    db.deleteTask(id);
    setTasks([...db.getTasks()]);
  };

  // Handlers for Metas
  const handleCreateGoal = (goalData) => {
    db.createGoal(goalData);
    setGoals([...db.getGoals()]);
  };

  const handleUpdateGoal = (id, updates) => {
    db.updateGoal(id, updates);
    setGoals([...db.getGoals()]);
  };

  const handleDeleteGoal = (id) => {
    db.deleteGoal(id);
    setGoals([...db.getGoals()]);
  };

  // Handlers for Finanças
  const handleCreateTransaction = (txData) => {
    db.createTransaction(txData);
    setTransactions([...db.getTransactions()]);
  };

  const handleDeleteTransaction = (id) => {
    db.deleteTransaction(id);
    setTransactions([...db.getTransactions()]);
  };

  const handleCreateSubscription = (subData) => {
    db.createSubscription(subData);
    setSubscriptions([...db.getSubscriptions()]);
  };

  const handleUpdateSubscription = (id, updates) => {
    db.updateSubscription(id, updates);
    setSubscriptions([...db.getSubscriptions()]);
  };

  const handleDeleteSubscription = (id) => {
    db.deleteSubscription(id);
    setSubscriptions([...db.getSubscriptions()]);
  };

  // Handlers for Mídia
  const handleCreateMedia = (mediaData) => {
    db.createMedia(mediaData);
    setMediaCatalog([...db.getMediaCatalog()]);
  };

  const handleUpdateMedia = (id, updates) => {
    db.updateMedia(id, updates);
    setMediaCatalog([...db.getMediaCatalog()]);
  };

  const handleDeleteMedia = (id) => {
    db.deleteMedia(id);
    setMediaCatalog([...db.getMediaCatalog()]);
  };

  // Handlers for Conhecimento & Cofre
  const handleCreateKnowledge = (itemData) => {
    db.createKnowledgeItem(itemData);
    setKnowledgeItems([...db.getKnowledgeItems()]);
  };

  const handleUpdateKnowledge = (id, updates) => {
    db.updateKnowledgeItem(id, updates);
    setKnowledgeItems([...db.getKnowledgeItems()]);
  };

  const handleDeleteKnowledge = (id) => {
    db.deleteKnowledgeItem(id);
    setKnowledgeItems([...db.getKnowledgeItems()]);
  };

  const handleCreateVaultItem = (entryData) => {
    db.createVaultItem(entryData);
    setVaultItems([...db.getVaultItems()]);
  };

  const handleDeleteVaultItem = (id) => {
    db.deleteVaultItem(id);
    setVaultItems([...db.getVaultItems()]);
  };

  const refreshAllData = () => {
    setTasks([...db.getTasks()]);
    setGoals([...db.getGoals()]);
    setTransactions([...db.getTransactions()]);
    setSubscriptions([...db.getSubscriptions()]);
    setMediaCatalog([...db.getMediaCatalog()]);
    setKnowledgeItems([...db.getKnowledgeItems()]);
    setVaultItems([...db.getVaultItems()]);
    setDailyLog({ ...db.getDailyLog() });
    setXpVersion(v => v + 1);
  };

  // Ouvinte de eventos de XP, Atualização de Dados e Atalhos de Teclado
  useEffect(() => {
    const handleXpUpdate = () => setXpVersion(v => v + 1);
    const handleDataUpdate = () => refreshAllData();
    const handleNotifUpdate = () => setUnreadNotificationsCount(NotificationCenterService.getUnreadCount());
    const handleUltraCleanToggle = (e) => {
      if (e?.detail && typeof e.detail.isUltraClean === 'boolean') {
        setIsUltraClean(e.detail.isUltraClean);
      } else {
        setIsUltraClean(prev => !prev);
      }
    };
    window.addEventListener('nexus_xp_update', handleXpUpdate);
    window.addEventListener('nexus_data_updated', handleDataUpdate);
    window.addEventListener('nexus_notifications_updated', handleNotifUpdate);
    window.addEventListener('nexus_toggle_ultra_clean', handleUltraCleanToggle);

    // Inicializa a Inteligência Proativa do J.A.R.V.I.S. (Briefing Matinal e Lembretes)
    JarvisProactiveService.initProactiveService();

    // Inicializa o Motor Autônomo de Notificações (Time-blocking, Finanças, Streaks, Hidratação)
    NotificationEngine.start();

    // Sincroniza em segundo plano com o banco SQLite físico (database/projeto2027.db)
    db.hydrateFromBackend().then((connected) => {
      if (connected) refreshAllData();
    });

    return () => {
      window.removeEventListener('nexus_xp_update', handleXpUpdate);
      window.removeEventListener('nexus_data_updated', handleDataUpdate);
      window.removeEventListener('nexus_notifications_updated', handleNotifUpdate);
      window.removeEventListener('nexus_toggle_ultra_clean', handleUltraCleanToggle);
      NotificationEngine.stop();
    };
  }, []);

  // Keyboard shortcuts (1 a 9) para navegação instantânea e Q para Quick Capture
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd/Ctrl + K para Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      
      // Tecla Q para Captura Rápida Global
      if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
        return;
      }

      switch (e.key) {
        case '1': setActiveView('hub-diario'); break;
        case '2': setActiveView('calendario'); break;
        case '3': setActiveView('foco-total'); break;
        case '4': setActiveView('metas'); break;
        case '5': setActiveView('financas'); break;
        case '6': setActiveView('leitura-cinema'); break;
        case '7': setActiveView('cofre'); break;
        case '8': setActiveView('configuracoes'); break;
        case '9': setActiveView('saude'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cálculo de XP do Operador em tempo real
  const focusStats = Number(localStorage.getItem('nexus_focus_stats') || 0);
  const xpStats = calculateUserXP(tasks, goals, mediaCatalog, [dailyLog], focusStats);

  // Format header date
  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const capitalizedDate = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className="bg-background text-on-surface min-h-screen flex selection:bg-primary-container selection:text-on-primary-container antialiased">
      {/* Fixed / Mobile Drawer Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        tasksCount={tasks.filter((t) => t.status !== 'Feito').length}
        mediaCount={mediaCatalog.length}
        userProfile={userProfile}
        xpStats={xpStats}
        onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Pane (responsivo para mobile com pl-0 e desktop com pl-72) */}
      <div className="pl-0 lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Fixed Top Bar Minimalista */}
        <header className="h-16 bg-surface-container-lowest/80 backdrop-blur-xl sticky top-0 z-40 px-gutter border-b border-outline-variant/20 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-space-md sm:gap-space-lg">
            {/* Hamburger Button para Mobile */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Abrir Menu de Navegação"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>

            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">calendar_today</span>
              <span className="text-sm font-medium text-on-surface truncate">
                {capitalizedDate}
              </span>
            </div>

            {/* Quick Capture Pill Button */}
            <button
              type="button"
              onClick={() => setIsQuickCaptureOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Captura Rápida Global (Atalho: Tecla Q)"
            >
              <span className="material-symbols-outlined text-[16px]">bolt</span>
              <span>Capturar</span>
              <kbd className="text-[10px] font-mono bg-primary/20 px-1 py-0.5 rounded border border-primary/30 ml-1">
                Q
              </kbd>
            </button>

            {/* J.A.R.V.I.S. Assistant Trigger Pill */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j' }));
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-semibold transition-all cursor-pointer shadow-sm group"
              title="Ativar J.A.R.V.I.S. Assistente de Voz (Atalho: Tecla J)"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:rotate-180 transition-transform duration-500">
                cyclone
              </span>
              <span className="font-mono tracking-wider font-bold">J.A.R.V.I.S.</span>
              <kbd className="text-[10px] font-mono bg-[#06B6D4]/20 px-1 py-0.5 rounded border border-[#06B6D4]/30 ml-1">
                J
              </kbd>
            </button>

            <button
              type="button"
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden md:flex items-center justify-between gap-space-sm bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 px-space-md py-1.5 rounded-xl w-60 text-left cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-[17px]">search</span>
                <span className="text-xs">Busca rápida...</span>
              </div>
              <kbd className="text-[11px] font-mono text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded border border-outline-variant/30">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-space-sm sm:gap-space-md">
            {/* Alternância Global: Modo Ultra-Clean / Visão Essencial */}
            <button
              type="button"
              onClick={toggleUltraClean}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                isUltraClean
                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40 shadow-[0_0_12px_rgba(16,185,129,0.2)] ring-1 ring-[#10B981]/30'
                  : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant border-outline-variant/30 hover:text-on-surface'
              }`}
              title={
                isUltraClean
                  ? 'Modo Essencial ativo (Hiper-limpo, zero ruído cognitivo). Clique para voltar à Visão Completa.'
                  : 'Ativar Modo Essencial (Elimina distrações secundárias e foca no essencial)'
              }
            >
              <span className="material-symbols-outlined text-[16px] text-[#10B981]">
                {isUltraClean ? 'spa' : 'filter_vintage'}
              </span>
              <span>{isUltraClean ? 'Modo Essencial' : 'Visão Completa'}</span>
            </button>

            {/* Central de Notificações - Sininho com Contador */}
            <div className="relative">
              <button
                id="nexus-notification-bell-btn"
                type="button"
                onClick={() => setIsNotificationCenterOpen((prev) => !prev)}
                className={`relative p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                  isNotificationCenterOpen
                    ? 'bg-[#06B6D4]/20 text-[#06B6D4] ring-1 ring-[#06B6D4]/30'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
                title={unreadNotificationsCount > 0 ? `Alertas (${unreadNotificationsCount} pendentes)` : 'Central de Notificações'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {unreadNotificationsCount > 0 ? 'notifications_active' : 'notifications'}
                </span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full bg-[#06B6D4] text-[#001F26] text-[10px] font-bold font-mono flex items-center justify-center px-1 shadow-sm">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              <NotificationCenterDrawer
                isOpen={isNotificationCenterOpen}
                onClose={() => setIsNotificationCenterOpen(false)}
                onNavigate={(view) => setActiveView(view)}
              />
            </div>

            {/* Gamificação: XP & Rank Badge no Header */}
            <div
              onClick={() => setActiveView('configuracoes')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/30 hover:border-outline-variant/60 cursor-pointer transition-colors"
              title="Progresso de Experiência e Nível de Disciplina"
            >
              <span className="material-symbols-outlined text-[16px]" style={{ color: xpStats.rank.color }}>
                {xpStats.rank.icon}
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider leading-none" style={{ color: xpStats.rank.color }}>
                  Lvl {xpStats.rank.level} • {xpStats.rank.title}
                </span>
                <span className="text-[11px] font-mono font-semibold text-on-surface leading-tight mt-0.5">
                  {xpStats.totalXP} XP
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveView('configuracoes')}
              className="flex items-center gap-space-sm pl-space-xs cursor-pointer group"
              title="Abrir configurações de perfil e temas"
            >
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-8 h-8 rounded-full object-cover border border-primary/40 group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[14px] group-hover:ring-2 group-hover:ring-primary/40 transition-all">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'N'}
                </div>
              )}
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-on-surface-variant group-hover:text-on-surface transition-colors">
                  {userProfile.name}
                </span>
                <span className="text-[10px] text-on-surface-variant/70 leading-none">
                  {userProfile.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* View Viewport */}
        <main className="p-gutter lg:p-margin flex-1 pb-16">
          <ViewErrorBoundary viewKey={activeView}>
            {activeView === 'hub-diario' && (
              <HubDiario
                currentDate={selectedHubDate}
                isUltraClean={isUltraClean}
              />
            )}

            {activeView === 'calendario' && (
              <Calendario
                onOpenDayInHub={(dateStr) => {
                  setSelectedHubDate(dateStr);
                  setActiveView('hub-diario');
                }}
                isUltraClean={isUltraClean}
              />
            )}

            {activeView === 'foco-total' && <FocoTotal isUltraClean={isUltraClean} />}

            {(activeView === 'metas' || activeView === 'metas-2027') && (
              <Metas
                goals={goals}
                onCreateGoal={handleCreateGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                isUltraClean={isUltraClean}
              />
            )}

            {activeView === 'financas' && (
              <Financas
                transactions={transactions}
                onCreateTransaction={handleCreateTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                subscriptions={subscriptions}
                onCreateSubscription={handleCreateSubscription}
                onUpdateSubscription={handleUpdateSubscription}
                onDeleteSubscription={handleDeleteSubscription}
                isUltraClean={isUltraClean}
              />
            )}

            {activeView === 'saude' && <SaudeMetricas isUltraClean={isUltraClean} />}

            {activeView === 'leitura-cinema' && (
              <LeituraCinema
                mediaCatalog={mediaCatalog}
                onCreateMedia={handleCreateMedia}
                onUpdateMedia={handleUpdateMedia}
                onDeleteMedia={handleDeleteMedia}
                isUltraClean={isUltraClean}
              />
            )}

            {activeView === 'cofre' && (
              <Cofre
                knowledgeItems={knowledgeItems}
                onCreateKnowledge={handleCreateKnowledge}
                onUpdateKnowledge={handleUpdateKnowledge}
                onDeleteKnowledge={handleDeleteKnowledge}
                vaultItems={vaultItems}
                onCreateVaultItem={handleCreateVaultItem}
                onDeleteVaultItem={handleDeleteVaultItem}
                isUltraClean={isUltraClean}
              />
            )}

            {activeView === 'configuracoes' && (
              <Configuracoes
                onProfileUpdate={(updated) => setUserProfile(updated)}
              />
            )}
          </ViewErrorBoundary>
        </main>

        {/* Modal de Retrospectiva Semanal */}
        <WeeklyReviewModal
          isOpen={isWeeklyReviewOpen}
          onClose={() => setIsWeeklyReviewOpen(false)}
        />

        {/* Modal de Captura Rápida Global (Atalho: Tecla Q) */}
        <QuickCaptureModal
          isOpen={isQuickCaptureOpen}
          onClose={() => {
            setIsQuickCaptureOpen(false);
            refreshAllData();
          }}
          onTaskCreated={refreshAllData}
        />

        {/* Command Palette Global (Atalho: Cmd/Ctrl + K) */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={(viewId) => {
            setActiveView(viewId);
            setIsCommandPaletteOpen(false);
          }}
          tasks={tasks}
          goals={goals}
          media={mediaCatalog}
          knowledge={knowledgeItems}
        />

        {/* Modal de Configuração Rápida Onboarding pós-Reset */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onComplete={(profile) => {
            setIsOnboardingOpen(false);
            setUserProfile(profile);
            refreshAllData();
          }}
        />

        {/* J.A.R.V.I.S. HUD Widget Flutuante Global */}
        <JarvisHUD
          variant="floating"
          onNavigate={(viewId) => setActiveView(viewId)}
          onDataUpdated={refreshAllData}
        />
      </div>
    </div>
  );
}

