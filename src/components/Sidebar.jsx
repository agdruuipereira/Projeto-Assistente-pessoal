import React, { useState, useEffect } from 'react';
import { UserGoalsService } from '../services/userGoals';

export default function Sidebar({
  activeView,
  setActiveView,
  tasksCount = 5,
  mediaCount = 3,
  userProfile = { name: 'Alexandre', role: 'Comandante Central' },
  xpStats,
  onOpenWeeklyReview,
  isMobileOpen = false,
  onCloseMobile = () => {}
}) {
  const handleNavClick = (viewId) => {
    setActiveView(viewId);
    if (onCloseMobile) onCloseMobile();
  };

  const [appTitle, setAppTitle] = useState(() => UserGoalsService.getAppTitle());
  const now = new Date();
  const currentYear = typeof new Date !== 'undefined' ? now.getFullYear() : 2026;
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear + 1, 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const totalDaysInYear = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24));
  const yearProgressPercent = Math.min(100, Math.max(1, Math.round((dayOfYear / totalDaysInYear) * 100)));

  useEffect(() => {
    const handleGoalsUpdate = () => {
      setAppTitle(UserGoalsService.getAppTitle());
    };
    window.addEventListener('nexus_user_goals_updated', handleGoalsUpdate);
    return () => window.removeEventListener('nexus_user_goals_updated', handleGoalsUpdate);
  }, []);
  const navItems = [
    {
      id: 'hub-diario',
      label: 'Hub Diário',
      icon: 'dashboard',
      badge: tasksCount > 0 ? tasksCount : null,
      badgeColor: 'bg-primary/15 text-primary'
    },
    {
      id: 'calendario',
      label: 'Calendário',
      icon: 'calendar_month',
      badge: 'Agenda',
      badgeColor: 'bg-[#06B6D4]/15 text-[#06B6D4]'
    },
    {
      id: 'foco-total',
      label: 'Modo Foco',
      icon: 'timer',
      badge: null
    },
    {
      id: 'metas',
      label: 'Metas & Objetivos',
      icon: 'flag',
      badge: null
    },
    {
      id: 'financas',
      label: 'Finanças',
      icon: 'account_balance_wallet',
      badge: null
    },
    {
      id: 'saude',
      label: 'Saúde & Treinos',
      icon: 'vital_signs',
      badge: 'Bio',
      badgeColor: 'bg-[#EC4899]/15 text-[#EC4899]'
    },
    {
      id: 'leitura-cinema',
      label: 'Leitura & Cinema',
      icon: 'auto_stories',
      badge: mediaCount > 0 ? mediaCount : null,
      badgeColor: 'bg-surface-container-high text-on-surface-variant'
    },
    {
      id: 'cofre',
      label: 'Cofre & Notas',
      icon: 'lock',
      badge: null
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: 'settings',
      badge: null
    }
  ];

  return (
    <>
      {/* Backdrop Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-surface-container-low/95 backdrop-blur-xl z-50 flex flex-col justify-between shadow-2xl border-r border-outline-variant/30 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header Minimalista */}
          <div className="h-16 px-space-lg flex items-center justify-between border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-[15px] font-mono">
                P
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-on-surface tracking-tight uppercase">
                  {appTitle || 'Projeto'}
                </span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-mono">
                  Central de Alta Performance
                </span>
              </div>
            </div>

            {/* Botão de Fechar Mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Fechar Menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Status Geral: Opção B — Progresso Temporal do Ano */}
          <div className="px-space-md py-space-sm">
            <div className="p-space-sm rounded-xl bg-surface-container/70 border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold">
                    STATUS GERAL
                  </span>
                </div>
                <span className="font-mono text-[11px] font-bold text-primary">
                  {currentYear} • {yearProgressPercent}%
                </span>
              </div>

              {/* Barra de Progresso do Ano */}
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-700"
                  style={{ width: `${yearProgressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-on-surface-variant font-mono">
                <span>Dia {dayOfYear} de {totalDaysInYear}</span>
                <span className="text-primary/80">Ciclo Ativo</span>
              </div>
            </div>
          </div>

          {/* Navigation Stream */}
          <nav className="flex-1 px-space-md py-space-xs space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full group flex items-center justify-between px-space-md py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-primary-container text-on-primary-container font-semibold shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`}
                >
                  <div className="flex items-center gap-space-md">
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${
                        isActive ? 'text-on-primary-container' : 'text-on-surface-variant'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-label-lg text-label-lg">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${
                        isActive ? 'bg-on-primary-container/20 text-on-primary-container' : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Launchers: Foco e Retrospectiva */}
          <div className="px-space-md py-space-xs space-y-1.5">
            <button
              onClick={() => handleNavClick('foco-total')}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 font-label-md font-semibold transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span>Entrar em Foco Rápido</span>
            </button>

            <button
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onOpenWeeklyReview();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/30 font-label-md font-semibold transition-all shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">published_with_changes</span>
              <span>Retrospectiva Semanal</span>
            </button>
          </div>
        </div>

        {/* Operator User Card com XP e Rank */}
        <div className="p-space-md bg-surface-container-lowest/80 border-t border-outline-variant/20">
          <div
            onClick={() => handleNavClick('configuracoes')}
            className="p-space-sm rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer group space-y-2"
          title="Clique para editar seu perfil e tema"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm overflow-hidden">
              {userProfile.avatar ? (
                <img
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-8 h-8 rounded-full object-cover border border-primary/40 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[14px] group-hover:scale-105 transition-transform">
                  {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="flex flex-col truncate">
                <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                  {userProfile.name || 'Comandante'}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  {userProfile.role || 'Operador Central'}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px] group-hover:text-primary transition-colors">
              settings
            </span>
          </div>

          {/* Gamificação / Nível de Operador & Barra de XP */}
          <div className="pt-2 border-t border-outline-variant/15 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold uppercase tracking-wider" style={{ color: xpStats?.rank?.color || '#10B981' }}>
                Lvl {xpStats?.rank?.level || 1} • {xpStats?.rank?.title || 'Recruta Nexus'}
              </span>
              <span className="font-mono text-on-surface-variant font-semibold">
                {xpStats?.totalXP || 0} XP
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${xpStats?.progressPct || 0}%`,
                  backgroundColor: xpStats?.rank?.color || '#10B981'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

