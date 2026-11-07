/**
 * src/services/backend_logic.js
 * Lógica de negócio: Cálculo de pontuação de hábitos (0 a 7) e saúde financeira
 */

/**
 * Calcula a pontuação diária de hábitos (0 a 7)
 * Baseado na tabela daily_logs
 * @param {Object} logRecord Objeto com as flags booleanas dos hábitos
 * @returns {number} Inteiro estrito de 0 a 7
 */
export function calculateHabitsScore(logRecord = {}) {
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
 * Calcula a barra de saúde financeira comparando Gastos e Receitas
 * @param {Array<{tx_type: string, amount: number|string}>} transactions Lista de transações
 * @returns {{totalReceitas: number, totalGastos: number, saldo: number, spentRatio: string, healthStatus: string}}
 */
export function calculateFinancialHealth(transactions = []) {
  let totalReceitas = 0;
  let totalGastos = 0;

  transactions.forEach(tx => {
    const amount = Number(tx.amount) || 0;
    if (tx.tx_type === 'Receita') {
      totalReceitas += amount;
    } else if (tx.tx_type === 'Gasto') {
      totalGastos += amount;
    }
  });

  const saldo = totalReceitas - totalGastos;
  const ratio = totalReceitas > 0 ? (totalGastos / totalReceitas) * 100 : 0;

  let healthStatus = 'Saudável';
  if (ratio > 90) healthStatus = 'Crítico';
  else if (ratio > 70) healthStatus = 'Atenção';

  return {
    totalReceitas,
    totalGastos,
    saldo,
    spentRatio: ratio.toFixed(1),
    healthStatus
  };
}

/**
 * Retorna o resumo completo de hábitos
 */
export function getHabitsSummary(logRecord = {}) {
  const score = calculateHabitsScore(logRecord);
  const percentage = Math.round((score / 7) * 100);
  return {
    score,
    total: 7,
    percentage,
    isAllCompleted: score === 7
  };
}

// Suporte a CommonJS para compatibilidade com Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateHabitsScore,
    calculateFinancialHealth,
    getHabitsSummary
  };
}

