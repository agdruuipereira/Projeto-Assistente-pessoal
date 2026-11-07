/**
 * src/components/NotificationCenterDrawer.jsx
 * Central de Notificações In-App (Drawer / Popover Flutuante)
 * Design executivo, limpo, obsidian-dark com backdrop-blur e interação fluida.
 */

import React, { useState, useEffect, useRef } from 'react';
import { NotificationCenterService } from '../services/notificationCenter.js';
import { playTactileFeedback } from '../services/haptics.js';

export default function NotificationCenterDrawer({ isOpen, onClose, onNavigate }) {
  const [notifications, setNotifications] = useState(NotificationCenterService.getNotifications());
  const [filter, setFilter] = useState('all'); // 'all' | 'task' | 'finance' | 'habit' | 'system'
  const [dndActive, setDndActive] = useState(NotificationCenterService.getManualDND());
  const [soundActive, setSoundActive] = useState(NotificationCenterService.isSoundEnabled());
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(NotificationCenterService.getNotifications());
      setDndActive(NotificationCenterService.getManualDND());
      setSoundActive(NotificationCenterService.isSoundEnabled());
    };

    const unsubscribe = NotificationCenterService.subscribe(handleUpdate);
    window.addEventListener('nexus_notifications_updated', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('nexus_notifications_updated', handleUpdate);
    };
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        // Ignora clique no próprio botão do sino (tratado no Header)
        if (e.target.closest('#nexus-notification-bell-btn')) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const handleItemClick = (notif) => {
    NotificationCenterService.markAsRead(notif.id);
    playTactileFeedback('check');
    if (notif.actionView && onNavigate) {
      onNavigate(notif.actionView);
      onClose();
    }
  };

  const handleMarkAllRead = () => {
    NotificationCenterService.markAllAsRead();
    playTactileFeedback('check');
  };

  const handleClearAll = () => {
    NotificationCenterService.clearAll();
    playTactileFeedback('uncheck');
  };

  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    NotificationCenterService.removeNotification(id);
    playTactileFeedback('uncheck');
  };

  const toggleDND = () => {
    const next = !dndActive;
    setDndActive(next);
    NotificationCenterService.setManualDND(next);
    playTactileFeedback(next ? 'uncheck' : 'check');
  };

  const toggleSound = () => {
    const next = !soundActive;
    setSoundActive(next);
    NotificationCenterService.setSoundEnabled(next);
    playTactileFeedback(next ? 'check' : 'uncheck');
  };

  // Helper de ícone e cores por categoria
  const getCategoryMeta = (type) => {
    switch (type) {
      case 'task':
        return {
          icon: 'schedule',
          color: '#06B6D4',
          bg: 'bg-[#06B6D4]/10 border-[#06B6D4]/25 text-[#06B6D4]',
          label: 'Tarefa'
        };
      case 'finance':
        return {
          icon: 'credit_card',
          color: '#10B981',
          bg: 'bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]',
          label: 'Finanças'
        };
      case 'habit':
        return {
          icon: 'local_fire_department',
          color: '#F59E0B',
          bg: 'bg-[#F59E0B]/10 border-[#F59E0B]/25 text-[#F59E0B]',
          label: 'Hábito'
        };
      case 'jarvis':
        return {
          icon: 'cyclone',
          color: '#8B5CF6',
          bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25 text-[#8B5CF6]',
          label: 'J.A.R.V.I.S.'
        };
      default:
        return {
          icon: 'notifications',
          color: '#94A3B8',
          bg: 'bg-white/5 border-white/10 text-[#94A3B8]',
          label: 'Sistema'
        };
    }
  };

  const formatRelativeTime = (isoString) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Agora';
      if (diffMins < 60) return `Há ${diffMins} min`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Há ${diffHours} h`;
      return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch (_) {
      return '';
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 sm:right-6 top-16 mt-2 w-[calc(100vw-24px)] sm:w-[420px] max-w-[430px] bg-[#0E131F]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[82vh] animate-in fade-in zoom-in-95 duration-150 transition-all"
      style={{
        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 25px -5px rgba(6,182,212,0.1)'
      }}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
            <span className="material-symbols-outlined text-[18px]">notifications</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Central de Alertas
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-[#64748B]">
              {dndActive ? '🔕 Modo Não Incomodar ativo' : 'Monitoramento tático em tempo real'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-2.5 py-1 text-[11px] font-medium text-[#94A3B8] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Marcar todas como lidas"
            >
              Ler todas
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Pills */}
      <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-black/20 text-xs">
        {[
          { id: 'all', label: 'Todas' },
          { id: 'task', label: 'Tarefas', icon: 'schedule' },
          { id: 'finance', label: 'Finanças', icon: 'credit_card' },
          { id: 'habit', label: 'Hábitos', icon: 'local_fire_department' },
          { id: 'system', label: 'Sistema', icon: 'tune' }
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setFilter(tab.id);
                playTactileFeedback('check');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon && (
                <span className="material-symbols-outlined text-[13px]">{tab.icon}</span>
              )}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notification List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 max-h-[460px]">
        {filtered.length === 0 ? (
          <div className="py-12 px-6 text-center flex flex-col items-center justify-center text-[#64748B]">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#94A3B8] mb-3">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <p className="text-sm font-semibold text-white/90">Tudo limpo por aqui</p>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-[240px]">
              Nenhum alerta pendente no momento. Você está 100% atualizado.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const meta = getCategoryMeta(item.type);
            const isUnread = !item.read;

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-3.5 transition-all cursor-pointer relative group flex items-start gap-3 ${
                  isUnread
                    ? 'bg-[#06B6D4]/[0.04] hover:bg-[#06B6D4]/[0.08]'
                    : 'hover:bg-white/[0.03] opacity-80 hover:opacity-100'
                }`}
              >
                {/* Indicador de não lida (bolinha pulsante) */}
                {isUnread && (
                  <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-[#06B6D4] ring-4 ring-[#06B6D4]/20" />
                )}

                {/* Ícone da Categoria */}
                <div
                  className={`w-8 h-8 rounded-xl border flex-shrink-0 flex items-center justify-center ${meta.bg}`}
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {meta.icon}
                  </span>
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider font-mono"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-[#64748B] font-mono">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>

                  <h4
                    className={`text-xs leading-snug line-clamp-1 ${
                      isUnread ? 'font-bold text-white' : 'font-medium text-[#CBD5E1]'
                    }`}
                  >
                    {item.title}
                  </h4>

                  {item.message && (
                    <p className="text-[11px] text-[#94A3B8] line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                  )}

                  {/* Ação rápida contextual */}
                  {item.actionView && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#06B6D4] group-hover:underline">
                      <span>Acessar módulo</span>
                      <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                    </div>
                  )}
                </div>

                {/* Botão de Excluir individual no hover */}
                <button
                  type="button"
                  onClick={(e) => handleDeleteItem(e, item.id)}
                  className="opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-[#EF4444] p-1 rounded transition-all cursor-pointer"
                  title="Excluir notificação"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer Controls */}
      <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {/* Toggle Não Incomodar */}
          <button
            type="button"
            onClick={toggleDND}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer ${
              dndActive
                ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
            title="Alternar Modo Não Incomodar"
          >
            <span className="material-symbols-outlined text-[14px]">
              {dndActive ? 'notifications_off' : 'notifications_active'}
            </span>
            <span>{dndActive ? 'Silenciado' : 'Alertas ON'}</span>
          </button>

          {/* Toggle Som */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
              soundActive
                ? 'text-[#06B6D4] hover:bg-[#06B6D4]/10'
                : 'text-[#64748B] hover:text-white hover:bg-white/5'
            }`}
            title={soundActive ? 'Áudio ativado (Web Audio)' : 'Áudio silenciado'}
          >
            <span className="material-symbols-outlined text-[16px]">
              {soundActive ? 'volume_up' : 'volume_off'}
            </span>
          </button>
        </div>

        {notifications.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-[#64748B] hover:text-[#EF4444] transition-colors cursor-pointer"
          >
            Limpar histórico
          </button>
        )}
      </div>
    </div>
  );
}

