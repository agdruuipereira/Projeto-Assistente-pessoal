/**
 * src/services/habitsService.js
 * Serviço de regras de negócio e cálculo de hábitos para o Projeto 2027
 */

/**
 * Mapeamento dos 7 hábitos centrais e seus identificadores no banco de dados (daily_logs)
 */
const HABIT_KEYS = [
  'h_sleep_8h',
  'h_morning_routine',
  'h_exercise_1h',
  'h_read_30m',
  'h_healthy_diet',
  'h_water_2l',
  'h_plan_tomorrow'
];

/**
 * Calcula a pontuação diária de hábitos (0 a 7)
 * Baseado no registro de daily_logs
 * @param {Object} logRecord Objeto contendo os campos booleanos dos hábitos
 * @returns {number} Inteiro estrito de 0 a 7
 */
function calculateHabitsScore(logRecord = {}) {
  const habits = [
    logRecord.h_sleep_8h,
    logRecord.h_morning_routine,
    logRecord.h_exercise_1h,
    logRecord.h_read_30m,
    logRecord.h_healthy_diet,
    logRecord.h_water_2l,
    logRecord.h_plan_tomorrow
  ];

  // Retorna um inteiro estrito de 0 a 7
  return habits.reduce((score, habit) => score + (habit ? 1 : 0), 0);
}

/**
 * Retorna o percentual de conclusão dos hábitos (0% a 100%)
 * @param {number} score Pontuação de 0 a 7
 * @param {number} total Total de hábitos (padrão: 7)
 * @returns {number} Inteiro de 0 a 100
 */
function calculateCompletionPercentage(score, total = 7) {
  if (total <= 0) return 0;
  const pct = Math.round((score / total) * 100);
  return Math.min(100, Math.max(0, pct));
}

/**
 * Extrai um resumo do estado dos hábitos
 * @param {Object} logRecord
 * @returns {Object}
 */
function getHabitsSummary(logRecord = {}) {
  const score = calculateHabitsScore(logRecord);
  const percentage = calculateCompletionPercentage(score);
  const isAllCompleted = score === HABIT_KEYS.length;

  return {
    score,
    total: HABIT_KEYS.length,
    percentage,
    isAllCompleted,
    keys: HABIT_KEYS
  };
}

// Compatibilidade Node.js (CommonJS) e Navegador (window.HabitsService)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HABIT_KEYS,
    calculateHabitsScore,
    calculateCompletionPercentage,
    getHabitsSummary
  };
}

if (typeof window !== 'undefined') {
  window.HabitsService = {
    HABIT_KEYS,
    calculateHabitsScore,
    calculateCompletionPercentage,
    getHabitsSummary
  };
}

