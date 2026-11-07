/**
 * src/services/notificationCenter.js
 * Central de Notificações Unificada do Projeto 2027
 * Gerencia histórico in-app, modo Não Incomodar (DND), sons de alerta e notificações desktop.
 */

import { DesktopNotificationService } from './desktopNotifications.js';
import { playNotificationChime } from './haptics.js';

const STORAGE_KEY = 'nexus_notifications_v1';
const MAX_NOTIFICATIONS = 50;

let isFocusRunning = false;
const listeners = new Set();

function emitUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexus_notifications_updated'));
  }
  listeners.forEach((fn) => {
    try { fn(); } catch (_) {}
  });
}

export const NotificationCenterService = {
  // Obter todas as notificações salvas
  getNotifications() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  },

  // Contagem de notificações não lidas
  getUnreadCount() {
    const list = this.getNotifications();
    return list.filter((n) => !n.read).length;
  },

  // Adicionar e disparar nova notificação
  send({
    type = 'system', // 'task' | 'finance' | 'habit' | 'jarvis' | 'system'
    title,
    message,
    actionView = null,
    urgency = 'medium', // 'low' | 'medium' | 'high'
    tag = null,
    bypassDND = false
  }) {
    if (!title) return null;

    const list = this.getNotifications();
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEntry = {
      id,
      type,
      title,
      message: message || '',
      actionView,
      urgency,
      tag: tag || id,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Previne notificações duplicadas exatamente iguais nas últimas 2 horas
    const isDuplicate = list.some((n) => (
      n.title === title &&
      n.message === message &&
      Date.now() - new Date(n.timestamp).getTime() < 2 * 60 * 60 * 1000
    ));

    if (isDuplicate) return null;

    // Atualiza storage limitando a MAX_NOTIFICATIONS
    const updated = [newEntry, ...list].slice(0, MAX_NOTIFICATIONS);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (_) {}

    const dnd = this.isDNDActive();

    // Se NÃO estiver em Não Incomodar (ou se for bypass urgente):
    if (!dnd || bypassDND) {
      // 1. Toca chime Web Audio
      const chimeType = type === 'task' ? 'task' : type === 'habit' ? 'urgent' : type === 'finance' ? 'finance' : 'default';
      playNotificationChime(chimeType);

      // 2. Dispara notificação nativa do Windows/Desktop
      DesktopNotificationService.notify(title, {
        body: message,
        tag: tag || id
      });
    }

    emitUpdate();
    return newEntry;
  },

  // Marcar como lida por ID
  markAsRead(id) {
    const list = this.getNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
    emitUpdate();
  },

  // Marcar todas como lidas
  markAllAsRead() {
    const list = this.getNotifications();
    const updated = list.map((n) => ({ ...n, read: true }));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
    emitUpdate();
  },

  // Excluir notificação específica
  removeNotification(id) {
    const list = this.getNotifications();
    const updated = list.filter((n) => n.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
    emitUpdate();
  },

  // Limpar todo o histórico
  clearAll() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    } catch (_) {}
    emitUpdate();
  },

  // Gerenciamento de Não Incomodar (DND)
  isDNDActive() {
    try {
      if (typeof localStorage === 'undefined') return false;
      const manualDND = localStorage.getItem('nexus_notif_dnd_manual') === 'true';
      if (manualDND) return true;

      const autoDNDInFocus = localStorage.getItem('nexus_notif_auto_dnd_focus') !== 'false';
      if (autoDNDInFocus && isFocusRunning) return true;

      return false;
    } catch (_) {
      return false;
    }
  },

  setManualDND(enabled) {
    try {
      localStorage.setItem('nexus_notif_dnd_manual', String(enabled));
      emitUpdate();
    } catch (_) {}
  },

  getManualDND() {
    try {
      return localStorage.getItem('nexus_notif_dnd_manual') === 'true';
    } catch (_) {
      return false;
    }
  },

  setFocusModeActive(active) {
    isFocusRunning = Boolean(active);
  },

  // Gerenciamento de Sons
  isSoundEnabled() {
    try {
      return localStorage.getItem('nexus_notification_sound') !== 'false';
    } catch (_) {
      return true;
    }
  },

  setSoundEnabled(enabled) {
    try {
      localStorage.setItem('nexus_notification_sound', String(enabled));
      emitUpdate();
    } catch (_) {}
  },

  // Preferências granulares dos monitores
  getPreferences() {
    try {
      return {
        soundEnabled: localStorage.getItem('nexus_notification_sound') !== 'false',
        manualDND: localStorage.getItem('nexus_notif_dnd_manual') === 'true',
        autoDNDFocus: localStorage.getItem('nexus_notif_auto_dnd_focus') !== 'false',
        taskAlarms: localStorage.getItem('nexus_notif_task_alarms') !== 'false',
        financeRadar: localStorage.getItem('nexus_notif_finance_radar') !== 'false',
        habitGuardian: localStorage.getItem('nexus_notif_habit_guardian') !== 'false',
        hydration: localStorage.getItem('nexus_notif_hydration') !== 'false'
      };
    } catch (_) {
      return {
        soundEnabled: true,
        manualDND: false,
        autoDNDFocus: true,
        taskAlarms: true,
        financeRadar: true,
        habitGuardian: true,
        hydration: true
      };
    }
  },

  setPreference(key, value) {
    try {
      const storageMap = {
        soundEnabled: 'nexus_notification_sound',
        manualDND: 'nexus_notif_dnd_manual',
        autoDNDFocus: 'nexus_notif_auto_dnd_focus',
        taskAlarms: 'nexus_notif_task_alarms',
        financeRadar: 'nexus_notif_finance_radar',
        habitGuardian: 'nexus_notif_habit_guardian',
        hydration: 'nexus_notif_hydration'
      };
      if (storageMap[key]) {
        localStorage.setItem(storageMap[key], String(value));
        emitUpdate();
      }
    } catch (_) {}
  },

  // Inscrição para atualizações reativas nos componentes React
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
};

