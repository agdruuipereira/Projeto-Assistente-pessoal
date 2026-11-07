/**
 * src/services/gamification.js
 * Sistema de Gamificação e Níveis de Operador para o Nexus Command Center.
 * Calcula XP e patentes com base nas realizações reais no sistema.
 */

export const RANKS = [
  { level: 1, title: 'Recruta Nexus', minXp: 0, maxXp: 200, color: '#94A3B8', icon: 'shield' },
  { level: 2, title: 'Operador Focado', minXp: 201, maxXp: 600, color: '#06B6D4', icon: 'bolt' },
  { level: 3, title: 'Especialista Tático', minXp: 601, maxXp: 1400, color: '#10B981', icon: 'military_tech' },
  { level: 4, title: 'Arquiteto de Sistemas', minXp: 1401, maxXp: 3000, color: '#8B5CF6', icon: 'psychology' },
  { level: 5, title: 'Comandante Supremo', minXp: 3001, maxXp: 99999, color: '#F59E0B', icon: 'crown' }
];

export function calculateUserXP(tasks = [], goals = [], media = [], dailyLogs = [], focusCycles = 0) {
  // 15 XP por tarefa concluída
  const tasksXP = (tasks || []).filter(t => t.status === 'Feito').length * 15;

  // 10 XP por cada hábito concluído registrado no histórico
  let habitsXP = 0;
  (dailyLogs || []).forEach(log => {
    Object.keys(log).forEach(key => {
      if (key.startsWith('h_') && log[key]) {
        habitsXP += 10;
      }
    });
  });

  // 100 XP por meta completada ou com 100% de progresso
  const goalsXP = (goals || []).filter(g => g.is_completed || (Number(g.current_value) >= Number(g.target_value) && Number(g.target_value) > 0)).length * 100;

  // 50 XP por livro lido ou filme assistido
  const mediaXP = (media || []).filter(m => m.status === 'Lido' || m.status === 'Assistido').length * 50;

  // 25 XP por ciclo de Pomodoro concluído
  const focusXP = (Number(focusCycles) || 0) * 25;

  const totalXP = tasksXP + habitsXP + goalsXP + mediaXP + focusXP;

  // Encontrar rank atual
  let currentRank = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalXP >= RANKS[i].minXp) {
      currentRank = RANKS[i];
      break;
    }
  }

  // Progresso para o próximo nível
  const xpInLevel = Math.max(0, totalXP - currentRank.minXp);
  const span = Math.max(1, currentRank.maxXp - currentRank.minXp);
  const progressPct = Math.min(100, Math.round((xpInLevel / span) * 100));

  return {
    totalXP,
    tasksXP,
    habitsXP,
    goalsXP,
    mediaXP,
    focusXP,
    rank: currentRank,
    progressPct
  };
}

export const BADGES = [
  {
    id: 'foco_inabalavel',
    title: 'Foco Inabalável',
    description: 'Completar 10 ciclos de Hiperfoco Pomodoro',
    icon: 'bolt',
    category: 'Foco',
    target: 10,
    unit: 'ciclos'
  },
  {
    id: 'semana_de_ferro',
    title: 'Disciplina de Aço',
    description: 'Manter sequência de 7 dias consecutivos cumprindo hábitos',
    icon: 'local_fire_department',
    category: 'Hábitos',
    target: 7,
    unit: 'dias'
  },
  {
    id: 'mente_voraz',
    title: 'Mente Voraz',
    description: 'Concluir a leitura de pelo menos 1 livro no acervo',
    icon: 'menu_book',
    category: 'Conhecimento',
    target: 1,
    unit: 'livro'
  },
  {
    id: 'conquistador_2027',
    title: 'Conquistador 2027',
    description: 'Completar 1 meta estratégica rumo ao quadriênio',
    icon: 'flag',
    category: 'Metas',
    target: 1,
    unit: 'meta'
  },
  {
    id: 'executor_implacavel',
    title: 'Execução Implacável',
    description: 'Concluir 25 tarefas registradas no centro de comando',
    icon: 'check_circle',
    category: 'Execução',
    target: 25,
    unit: 'tarefas'
  },
  {
    id: 'escudo_financeiro',
    title: 'Escudo Financeiro',
    description: 'Manter saldo positivo e respeitar o teto de gastos',
    icon: 'account_balance',
    category: 'Finanças',
    target: 1,
    unit: 'balanço'
  },
  {
    id: 'hidratacao_elite',
    title: 'Hidratação de Elite',
    description: 'Bater a meta diária de hidratação corporal',
    icon: 'water_drop',
    category: 'Saúde',
    target: 1,
    unit: 'meta batida'
  },
  {
    id: 'arquiteto_conhecimento',
    title: 'Arquiteto do Saber',
    description: 'Acumular 5 ou mais notas e resumos no Segundo Cérebro',
    icon: 'psychology',
    category: 'Segundo Cérebro',
    target: 5,
    unit: 'notas'
  }
];

export function calculateUserBadges(tasks = [], goals = [], media = [], dailyLogs = [], focusCycles = 0, transactions = [], knowledge = [], streak = 0) {
  const completedTasks = (tasks || []).filter(t => t.status === 'Feito').length;
  const completedGoals = (goals || []).filter(g => g.is_completed || (Number(g.current_value) >= Number(g.target_value) && Number(g.target_value) > 0)).length;
  const readBooks = (media || []).filter(m => (m.media_type === 'Livro' || !m.media_type) && m.status === 'Lido').length;
  const totalNotes = (knowledge || []).length;
  const cycles = Number(focusCycles) || 0;

  // Receitas vs Gastos
  let receitas = 0, gastos = 0;
  (transactions || []).forEach(t => {
    if (t.tx_type === 'Receita') receitas += Number(t.amount || 0);
    if (t.tx_type === 'Gasto') gastos += Number(t.amount || 0);
  });
  const isFinanceSafe = receitas >= gastos && receitas > 0;

  // Hidratação
  const hasHydrationGoalMet = (dailyLogs || []).some(l => Number(l.water_liters || 0) >= 2 || l.h_water_2l);

  const evaluatedBadges = BADGES.map(badge => {
    let current = 0;
    switch (badge.id) {
      case 'foco_inabalavel': current = cycles; break;
      case 'semana_de_ferro': current = streak; break;
      case 'mente_voraz': current = readBooks; break;
      case 'conquistador_2027': current = completedGoals; break;
      case 'executor_implacavel': current = completedTasks; break;
      case 'escudo_financeiro': current = isFinanceSafe ? 1 : 0; break;
      case 'hidratacao_elite': current = hasHydrationGoalMet ? 1 : 0; break;
      case 'arquiteto_conhecimento': current = totalNotes; break;
      default: current = 0;
    }

    const unlocked = current >= badge.target;
    const progressPct = Math.min(100, Math.round((current / badge.target) * 100));

    return {
      ...badge,
      current,
      unlocked,
      progressPct
    };
  });

  const unlockedCount = evaluatedBadges.filter(b => b.unlocked).length;

  return {
    badges: evaluatedBadges,
    unlockedCount,
    totalBadges: BADGES.length,
    percentage: Math.round((unlockedCount / BADGES.length) * 100)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RANKS,
    calculateUserXP,
    BADGES,
    calculateUserBadges
  };
}

