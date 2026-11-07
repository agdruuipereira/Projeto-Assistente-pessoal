/**
 * src/services/userGoals.js
 * Gerenciador Unificado de Parâmetros e Metas Pessoais Customizáveis
 * Permite que cada usuário adeque o ecossistema às suas próprias ambições e realidades:
 * - Meta de Livros (ex: 25, 50 ou 100 livros)
 * - Meta de Filmes/Cinema
 * - Meta de Hidratação Diária (L/dia)
 * - Meta de Sono Diário (horas/noite)
 * - Meta de Treinos Mensais (sessões/mês)
 * - Peso Corporal Alvo (kg)
 * - Teto de Gastos Mensal / Orçamento (R$)
 * - Meta de Aporte / Economia Mensal (R$)
 */

const STORAGE_KEY = 'nexus_user_custom_goals_v1';

const DEFAULT_GOALS = {
  booksTarget: 100,
  moviesTarget: 50,
  waterTarget: 2.5,
  sleepTarget: 8.0,
  workoutsTarget: 16,
  targetWeight: 75.0,
  initialWeight: 82.0,
  monthlyBudget: 5000,
  monthlySavingsTarget: 1500,
  assistantName: 'JARVIS',
  appTitle: 'Projeto',
  trackingYear: 2026
};

function emitUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexus_user_goals_updated'));
    window.dispatchEvent(new CustomEvent('nexus_data_updated'));
  }
}

export const UserGoalsService = {
  getAll() {
    try {
      if (typeof localStorage === 'undefined') return { ...DEFAULT_GOALS };
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_GOALS };
      return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
    } catch (_) {
      return { ...DEFAULT_GOALS };
    }
  },

  setAll(newGoals) {
    try {
      const current = this.getAll();
      const updated = { ...current, ...newGoals };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      emitUpdate();
      return updated;
    } catch (_) {
      return this.getAll();
    }
  },

  get(key) {
    const all = this.getAll();
    return all[key] !== undefined ? all[key] : DEFAULT_GOALS[key];
  },

  set(key, value) {
    const num = Number(value);
    const validVal = isNaN(num) ? value : num;
    this.setAll({ [key]: validVal });
    return validVal;
  },

  // Helpers específicos
  getBooksTarget() { return Number(this.get('booksTarget')) || 100; },
  setBooksTarget(val) { return this.set('booksTarget', Number(val) || 50); },

  getMoviesTarget() { return Number(this.get('moviesTarget')) || 50; },
  setMoviesTarget(val) { return this.set('moviesTarget', Number(val) || 50); },

  getWaterTarget() { return Number(this.get('waterTarget')) || 2.5; },
  setWaterTarget(val) { return this.set('waterTarget', Number(val) || 2.5); },

  getSleepTarget() { return Number(this.get('sleepTarget')) || 8.0; },
  setSleepTarget(val) { return this.set('sleepTarget', Number(val) || 8.0); },

  getWorkoutsTarget() { return Number(this.get('workoutsTarget')) || 16; },
  setWorkoutsTarget(val) { return this.set('workoutsTarget', Number(val) || 16); },

  getTargetWeight() { return Number(this.get('targetWeight')) || 75; },
  setTargetWeight(val) { return this.set('targetWeight', Number(val) || 75); },

  getInitialWeight() { return Number(this.get('initialWeight')) || 82.0; },
  setInitialWeight(val) { return this.set('initialWeight', Number(val) || 82.0); },

  getMonthlyBudget() { return Number(this.get('monthlyBudget')) || 5000; },
  setMonthlyBudget(val) { return this.set('monthlyBudget', Number(val) || 5000); },

  getMonthlySavingsTarget() { return Number(this.get('monthlySavingsTarget')) || 1500; },
  setMonthlySavingsTarget(val) { return this.set('monthlySavingsTarget', Number(val) || 1500); },

  getAssistantName() {
    const name = String(this.get('assistantName') || 'JARVIS').trim();
    return name || 'JARVIS';
  },
  setAssistantName(val) {
    const clean = String(val || 'JARVIS').trim();
    return this.set('assistantName', clean);
  },

  getAppTitle() {
    const raw = String(this.get('appTitle') || 'Projeto').trim();
    if (raw === 'PROJETO 2027' || raw === 'Nexus Command' || !raw) return 'Projeto';
    return raw;
  },
  setAppTitle(val) {
    const clean = String(val || 'Projeto').trim();
    return this.set('appTitle', clean);
  },

  getTrackingYear() {
    const yr = Number(this.get('trackingYear'));
    return !isNaN(yr) && yr > 2000 ? yr : (typeof new Date !== 'undefined' ? new Date().getFullYear() : 2026);
  },
  setTrackingYear(val) {
    const yr = Number(val) || new Date().getFullYear();
    return this.set('trackingYear', yr);
  },

  resetToDefaults() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      emitUpdate();
      return { ...DEFAULT_GOALS };
    } catch (_) {
      return { ...DEFAULT_GOALS };
    }
  }
};

