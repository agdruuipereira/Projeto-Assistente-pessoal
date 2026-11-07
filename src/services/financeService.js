/**
 * src/services/financeService.js
 * Serviço de saúde financeira e controle de transações para o Projeto 2027
 */

/**
 * Calcula a barra de saúde financeira comparando Gastos e Receitas
 * @param {Array<{tx_type: string, amount: number|string}>} transactions
 * @returns {Object}
 */
function calculateFinancialHealth(transactions = []) {
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { calculateFinancialHealth };
}

if (typeof window !== 'undefined') {
  window.FinanceService = { calculateFinancialHealth };
}

