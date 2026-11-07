/**
 * src/services/jarvisProactive.js
 * Módulo de Inteligência Proativa do J.A.R.V.I.S.
 * Executa check-ins autônomos, saudações com briefing matinal e lembretes de hábitos.
 */

import { JarvisBrain } from './jarvisBrain.js';
import { jarvisVoice } from './jarvisVoice.js';
import { db } from './db.js';
import { DesktopNotificationService } from './desktopNotifications.js';
import { NotificationCenterService } from './notificationCenter.js';

const KEY_PROACTIVE_BRIEFING = 'nexus_jarvis_proactive_briefing';
const KEY_PROACTIVE_REMINDERS = 'nexus_jarvis_proactive_reminders';
const KEY_LAST_BRIEFING_DATE = 'nexus_jarvis_last_proactive_briefing';
const KEY_LAST_HABIT_REMINDER = 'nexus_jarvis_last_habit_reminder';

let isInitialized = false;

export const JarvisProactiveService = {
  isBriefingEnabled() {
    try {
      if (typeof localStorage === 'undefined') return true;
      const val = localStorage.getItem(KEY_PROACTIVE_BRIEFING);
      return val === null ? true : val === 'true';
    } catch (_) {
      return true;
    }
  },

  setBriefingEnabled(enabled) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY_PROACTIVE_BRIEFING, String(enabled));
      }
    } catch (_) {}
  },

  isRemindersEnabled() {
    try {
      if (typeof localStorage === 'undefined') return true;
      const val = localStorage.getItem(KEY_PROACTIVE_REMINDERS);
      return val === null ? true : val === 'true';
    } catch (_) {
      return true;
    }
  },

  setRemindersEnabled(enabled) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(KEY_PROACTIVE_REMINDERS, String(enabled));
      }
    } catch (_) {}
  },

  // Inicializa os ouvintes e verificações autônomas
  initProactiveService() {
    if (isInitialized || typeof window === 'undefined') return;
    isInitialized = true;

    // 1. Check-in de Briefing Matinal após carregamento inicial da interface
    setTimeout(() => {
      this.triggerAutoBriefingIfPending();
    }, 2800);

    // 2. Verificação periódica a cada 15 minutos (para lembretes de hábitos ao anoitecer)
    setInterval(() => {
      this.triggerEveningReminderIfPending();
    }, 15 * 60 * 1000);
  },

  // Dispara o briefing automático no primeiro acesso do dia
  triggerAutoBriefingIfPending() {
    if (!this.isBriefingEnabled()) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const lastDate = localStorage.getItem(KEY_LAST_BRIEFING_DATE);

      if (lastDate !== today) {
        const briefing = JarvisBrain.handleMorningBriefing();
        localStorage.setItem(KEY_LAST_BRIEFING_DATE, today);

        // Dispara evento para sincronizar com o histórico de diálogo do HUD
        window.dispatchEvent(new CustomEvent('nexus_jarvis_reply', {
          detail: { reply: briefing.speech, command: '☀️ Briefing Matinal Automático' }
        }));

        // Transmite o áudio com a voz sintética
        jarvisVoice.speak(briefing.speech);
        NotificationCenterService.send({
          type: 'jarvis',
          title: '☀️ Briefing Matinal — J.A.R.V.I.S.',
          message: 'Sistemas e prioridades do dia alinhados. Clique para abrir seu plano de ação.',
          actionView: 'hub-diario',
          urgency: 'medium',
          tag: 'morning-briefing'
        });
      }
    } catch (err) {
      console.warn('[J.A.R.V.I.S. Proactive Briefing]', err);
    }
  },

  // Dispara lembrete sutil de hábitos no período noturno (a partir das 19h)
  triggerEveningReminderIfPending() {
    if (!this.isRemindersEnabled()) return;

    try {
      const now = new Date();
      const currentHour = now.getHours();

      // Somente após as 19h
      if (currentHour < 19) return;

      const today = now.toISOString().split('T')[0];
      const lastReminder = localStorage.getItem(KEY_LAST_HABIT_REMINDER);

      if (lastReminder === today) return;

      const customHabits = db.getCustomHabits();
      const dailyLog = db.getDailyLog(today);
      const pendingHabits = customHabits.filter(h => !dailyLog[h.id]);

      if (pendingHabits.length > 0) {
        localStorage.setItem(KEY_LAST_HABIT_REMINDER, today);
        const speech = `Comandante, lembrete operacional de encerramento do dia: você possui ${pendingHabits.length} hábito(s) pendente(s) na sua rotina de hoje, como "${pendingHabits[0].label}". Manter a consistência diária é fundamental para os objetivos de 2027.`;

        window.dispatchEvent(new CustomEvent('nexus_jarvis_reply', {
          detail: { reply: speech, command: '⏰ Lembrete de Hábitos Noturnos' }
        }));

        jarvisVoice.speak(speech);
        NotificationCenterService.send({
          type: 'jarvis',
          title: '🌙 Revisão Noturna do Dia — J.A.R.V.I.S.',
          message: `Você possui ${pendingHabits.length} hábito(s) pendente(s) hoje, incluindo "${pendingHabits[0].label}".`,
          actionView: 'hub-diario',
          urgency: 'medium',
          tag: 'evening-habits'
        });
      }
    } catch (err) {
      console.warn('[J.A.R.V.I.S. Proactive Reminder]', err);
    }
  }
};

