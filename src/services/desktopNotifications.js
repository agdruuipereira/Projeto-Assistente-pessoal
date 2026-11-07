/**
 * src/services/desktopNotifications.js
 * Gerenciador de Notificações Nativas do Windows / Desktop
 * Permite alertas táticos mesmo quando a aba estiver em segundo plano ou minimizada.
 */

export class DesktopNotificationService {
  static isSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  static getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  static async requestPermission() {
    if (!this.isSupported()) return false;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (_) {
      return false;
    }
  }

  static notify(title, options = {}) {
    if (!this.isSupported()) return null;
    if (Notification.permission !== 'granted') return null;

    try {
      const defaultOptions = {
        icon: '/icon.svg',
        badge: '/icon.svg',
        silent: false,
        ...options
      };
      const n = new Notification(title, defaultOptions);
      n.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
      };
      return n;
    } catch (e) {
      console.warn('[Desktop Notification]', e);
      return null;
    }
  }

  static notifyFocusComplete(mode = 'foco') {
    const isBreak = mode === 'pausaCurta' || mode === 'pausaLonga';
    this.notify(isBreak ? '☕ Pausa Finalizada!' : '🎯 Bloco de Foco Concluído!', {
      body: isBreak
        ? 'Pronto para retornar à alta performance? Inicie seu próximo ciclo de foco.'
        : 'Excelente sessão de hiperfoco. Descanse sua mente por alguns minutos.',
      tag: 'nexus-focus'
    });
  }

  static notifyWaterReminder() {
    this.notify('💧 Lembrete de Hidratação — J.A.R.V.I.S.', {
      body: 'Mantenha sua capacidade cognitiva e energia em nível máximo. Beba um copo d\'água.',
      tag: 'nexus-water'
    });
  }

  static notifyEveningHabits(pendingCount = 0) {
    this.notify('🌙 Revisão Noturna do Dia — J.A.R.V.I.S.', {
      body: pendingCount > 0
        ? `Você ainda possui ${pendingCount} hábito(s) pendente(s) para fechar o dia em 100%.`
        : 'Todos os hábitos concluídos com maestria hoje. Tenha um excelente descanso, Comandante.',
      tag: 'nexus-evening'
    });
  }
}

