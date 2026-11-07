/**
 * src/views/Financas.jsx
 * Central de Tesouraria, Fluxo de Caixa, Caixinhas de Poupança & Relatórios Automáticos
 * Design Minimalista Cyber-Obsidian — Projeto 2027
 * 
 * Funcionalidades:
 * - 💳 Controle Fácil de Gastos Diários: Lançamentos rápidos e precisos de receitas e despesas
 * - 🗓️ Visualização Temporal Completa: Mês a Mês (com navegação cronológica), Por Semana e Visão Geral
 * - 📊 Relatório Automático de Gastos:
 *     • Onde temos gastado mais (ranking por categoria e maiores centros de custo)
 *     • Onde economizamos (comparativo com o teto, economia monetária e taxa de poupança)
 *     • Caixa Total ao fim de cada mês (evolução de saldo líquido e acumulado)
 * - 🏦 Caixinhas de Objetivos (Poupança Dedicada): Reserva de Emergência, Viagens, Metas específicas com depósito e resgate seguros
 * - 🎯 Metas Financeiras Aprimoradas: Teto de Gastos com termômetro dinâmico e meta de economia mensal
 * - 🔁 Assinaturas & Custos Fixos com alternância ativa/pausada
 */

import React, { useState, useEffect } from 'react';
import { calculateFinancialHealth } from '../services/backend_logic';
import { UserGoalsService } from '../services/userGoals';
import { db } from '../services/db';
import { playTactileFeedback } from '../services/haptics';

const MONTH_NAMES = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};

const CATEGORIES = [
  { id: 'Alimentação', label: 'Alimentação', icon: 'restaurant', color: '#F59E0B' },
  { id: 'Moradia & Contas', label: 'Moradia & Contas', icon: 'home', color: '#06B6D4' },
  { id: 'Transporte', label: 'Transporte', icon: 'directions_car', color: '#8B5CF6' },
  { id: 'Saúde & Bem-Estar', label: 'Saúde & Bem-Estar', icon: 'medical_services', color: '#10B981' },
  { id: 'Educação & Livros', label: 'Educação & Livros', icon: 'school', color: '#3B82F6' },
  { id: 'Lazer & Estilo de Vida', label: 'Lazer & Estilo de Vida', icon: 'sports_esports', color: '#EC4899' },
  { id: 'Tecnologia & Infraestrutura', label: 'Tecnologia & Infra', icon: 'terminal', color: '#6366F1' },
  { id: 'Investimentos & Caixinhas', label: 'Investimentos & Caixinhas', icon: 'savings', color: '#14B8A6' },
  { id: 'Outros', label: 'Outros', icon: 'category', color: '#64748B' }
];

export default function Financas({
  transactions = [],
  onCreateTransaction,
  onDeleteTransaction,
  subscriptions = [],
  onCreateSubscription,
  onUpdateSubscription,
  onDeleteSubscription,
  isUltraClean
}) {
  // Abas: 'extrato' (Transações) | 'relatorio' (Insights & Diagnóstico) | 'caixinhas' (Objetivos) | 'assinaturas'
  const [activeTab, setActiveTab] = useState('extrato');

  // Modo de Visualização Temporal: 'mes' (Mês a Mês) | 'semana' (Por Semana) | 'todos' (Geral)
  const [periodMode, setPeriodMode] = useState('mes');

  // Mês Selecionado (ex: '2026-11')
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Filtro de Semana (quando periodMode === 'semana')
  const [selectedWeekFilter, setSelectedWeekFilter] = useState('7d'); // '7d' | 'w1' | 'w2' | 'w3' | 'w4'

  // Busca e Filtros de Categoria
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [feedback, setFeedback] = useState('');

  // Caixinhas (Cofres de Poupança com Objetivos)
  const [caixinhas, setCaixinhas] = useState(() => db.getCaixinhas());
  const [isCaixinhaModalOpen, setIsCaixinhaModalOpen] = useState(false);
  const [newCaixinhaName, setNewCaixinhaName] = useState('');
  const [newCaixinhaTarget, setNewCaixinhaTarget] = useState('5000');
  const [newCaixinhaInitial, setNewCaixinhaInitial] = useState('500');
  const [newCaixinhaCategory, setNewCaixinhaCategory] = useState('Segurança');
  const [newCaixinhaColor, setNewCaixinhaColor] = useState('#10B981');
  const [newCaixinhaIcon, setNewCaixinhaIcon] = useState('savings');

  // Modal de Depósito/Resgate em Caixinha
  const [activeCaixinhaAction, setActiveCaixinhaAction] = useState(null); // { caixinha, type: 'deposit' | 'withdraw' }
  const [caixinhaActionAmount, setCaixinhaActionAmount] = useState('');

  // Metas Financeiras Customizadas
  const [monthlyBudget, setMonthlyBudget] = useState(() => UserGoalsService.getMonthlyBudget());
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState(() => UserGoalsService.getMonthlySavingsTarget());
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [formBudget, setFormBudget] = useState(String(monthlyBudget));
  const [formSavings, setFormSavings] = useState(String(monthlySavingsTarget));

  // Modal Nova Transação
  const [showTxModal, setShowTxModal] = useState(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('Gasto');
  const [txCategory, setTxCategory] = useState('Alimentação');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal Nova Assinatura
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subPrice, setSubPrice] = useState('');
  const [subCycle, setSubCycle] = useState('Mensal');
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);

  const healthOverall = calculateFinancialHealth(transactions);

  useEffect(() => {
    const handleGoalsUpdate = () => {
      setMonthlyBudget(UserGoalsService.getMonthlyBudget());
      setMonthlySavingsTarget(UserGoalsService.getMonthlySavingsTarget());
    };
    const handleDataUpdate = () => {
      setCaixinhas(db.getCaixinhas());
    };

    window.addEventListener('nexus_user_goals_updated', handleGoalsUpdate);
    window.addEventListener('nexus_data_updated', handleDataUpdate);

    return () => {
      window.removeEventListener('nexus_user_goals_updated', handleGoalsUpdate);
      window.removeEventListener('nexus_data_updated', handleDataUpdate);
    };
  }, []);

  const triggerFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // ==========================================
  // NAVEGAÇÃO TEMPORAL MÊS A MÊS
  // ==========================================
  const formatMonthLabel = (mStr) => {
    if (!mStr || mStr.length < 7) return mStr;
    const [year, month] = mStr.split('-');
    return `${MONTH_NAMES[month] || month} de ${year}`;
  };

  const handleStepMonth = (step) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const date = new Date(y, m - 1 + step, 1);
    const newMonthStr = date.toISOString().slice(0, 7);
    setSelectedMonth(newMonthStr);
    playTactileFeedback('check');
  };

  // Lista de meses disponíveis a partir das transações
  const availableMonths = Array.from(
    new Set([
      currentMonthStr,
      ...(transactions || []).map(t => (t.tx_date ? t.tx_date.slice(0, 7) : null)).filter(Boolean)
    ])
  ).sort().reverse();

  // ==========================================
  // FILTRAGEM DE TRANSAÇÕES PELO PERÍODO ATIVO
  // ==========================================
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const periodFilteredTransactions = (transactions || []).filter(t => {
    if (!t.tx_date) return false;

    // Filtro Mês a Mês
    if (periodMode === 'mes') {
      if (!t.tx_date.startsWith(selectedMonth)) return false;
    }

    // Filtro Por Semana
    if (periodMode === 'semana') {
      if (selectedWeekFilter === '7d') {
        const txD = new Date(t.tx_date + 'T12:00:00');
        if (txD < sevenDaysAgo || txD > now) return false;
      } else {
        // Semanas do mês ativo
        if (!t.tx_date.startsWith(selectedMonth)) return false;
        const day = parseInt(t.tx_date.split('-')[2], 10);
        if (selectedWeekFilter === 'w1' && (day < 1 || day > 7)) return false;
        if (selectedWeekFilter === 'w2' && (day < 8 || day > 14)) return false;
        if (selectedWeekFilter === 'w3' && (day < 15 || day > 21)) return false;
        if (selectedWeekFilter === 'w4' && day < 22) return false;
      }
    }

    return true;
  });

  // Filtro adicional de busca por texto e categoria na tabela
  const displayedTransactions = periodFilteredTransactions.filter(t => {
    if (selectedCategory !== 'Todas' && t.category !== selectedCategory) return false;
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.toLowerCase().trim();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchCat = (t.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCat) return false;
    }
    return true;
  });

  // ==========================================
  // TELEMETRIA DO PERÍODO ATIVO
  // ==========================================
  const periodTotalReceitas = periodFilteredTransactions
    .filter(t => t.tx_type === 'Receita')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const periodTotalGastos = periodFilteredTransactions
    .filter(t => t.tx_type === 'Gasto')
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  const periodSaldo = periodTotalReceitas - periodTotalGastos;

  // Percentual do Teto de Gastos Consumido no Mês Selecionado
  const budgetRatio = monthlyBudget > 0 ? Math.round((periodTotalGastos / monthlyBudget) * 100) : 0;
  const budgetRemaining = Math.max(0, monthlyBudget - periodTotalGastos);
  const budgetSavings = monthlyBudget - periodTotalGastos;

  // Taxa de Poupança do Período
  const savingsRate = periodTotalReceitas > 0
    ? Math.round((periodSaldo / periodTotalReceitas) * 100)
    : 0;

  // ==========================================
  // DIAGNÓSTICO E RELATÓRIO AUTOMÁTICO DE GASTOS
  // ==========================================
  // 1. Onde mais gastou: Ranking por categoria
  const expensesByCategory = {};
  periodFilteredTransactions
    .filter(t => t.tx_type === 'Gasto')
    .forEach(t => {
      const cat = t.category || 'Outros';
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(t.amount || 0);
    });

  const categoryRanking = Object.entries(expensesByCategory)
    .map(([cat, total]) => ({
      category: cat,
      total,
      percentage: periodTotalGastos > 0 ? Math.round((total / periodTotalGastos) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);

  const topSpendingCategory = categoryRanking.length > 0 ? categoryRanking[0] : null;

  // 2. Maiores despesas individuais do período
  const topIndividualExpenses = [...periodFilteredTransactions]
    .filter(t => t.tx_type === 'Gasto')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  // 3. Caixa Total ao Fim de Cada Mês (Fluxo Mensal Consolidado)
  const monthlyFlowMap = {};
  (transactions || []).forEach(t => {
    if (!t.tx_date) return;
    const mStr = t.tx_date.slice(0, 7);
    if (!monthlyFlowMap[mStr]) {
      monthlyFlowMap[mStr] = { month: mStr, receitas: 0, gastos: 0 };
    }
    if (t.tx_type === 'Receita') {
      monthlyFlowMap[mStr].receitas += Number(t.amount || 0);
    } else {
      monthlyFlowMap[mStr].gastos += Number(t.amount || 0);
    }
  });

  const sortedMonths = Object.keys(monthlyFlowMap).sort();
  let runningCumulativeBalance = 0;
  const monthlySummaryList = sortedMonths.map(mKey => {
    const item = monthlyFlowMap[mKey];
    const net = item.receitas - item.gastos;
    runningCumulativeBalance += net;
    return {
      month: mKey,
      receitas: item.receitas,
      gastos: item.gastos,
      net,
      cumulativeBalance: runningCumulativeBalance
    };
  }).reverse();

  // ==========================================
  // HANDLERS DE TRANSAÇÃO
  // ==========================================
  const handleTxSubmit = (e) => {
    e.preventDefault();
    if (!txTitle.trim() || !txAmount) return;
    const numAmount = parseFloat(txAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      triggerFeedback('⚠️ Insira um valor numérico válido.');
      return;
    }

    if (onCreateTransaction) {
      onCreateTransaction({
        title: txTitle.trim(),
        amount: numAmount,
        tx_type: txType,
        category: txCategory,
        tx_date: txDate,
        payment_status: 'Pago'
      });
      playTactileFeedback('level_up');
      triggerFeedback(`✓ ${txType} de R$ ${numAmount.toFixed(2)} registrado com sucesso!`);
    }
    setTxTitle('');
    setTxAmount('');
    setShowTxModal(false);
  };

  const handleSubSubmit = (e) => {
    e.preventDefault();
    if (!subName.trim() || !subPrice) return;
    const numPrice = parseFloat(subPrice);
    if (isNaN(numPrice) || numPrice <= 0) return;

    if (onCreateSubscription) {
      onCreateSubscription({
        service_name: subName.trim(),
        price: numPrice,
        billing_cycle: subCycle,
        start_date: new Date().toISOString().split('T')[0],
        next_payment_date: subDate,
        status: 'Ativa'
      });
      playTactileFeedback('level_up');
      triggerFeedback(`✓ Assinatura "${subName}" cadastrada!`);
    }
    setSubName('');
    setSubPrice('');
    setShowSubModal(false);
  };

  // ==========================================
  // CAIXINHAS (DEPÓSITOS, RESGATES E CRIAÇÃO)
  // ==========================================
  const totalSavedInCaixinhas = caixinhas.reduce((acc, c) => acc + (Number(c.current_amount) || 0), 0);

  const handleCreateCaixinha = (e) => {
    e.preventDefault();
    if (!newCaixinhaName.trim()) return;
    const targetAmt = parseFloat(newCaixinhaTarget) || 1000;
    const initAmt = parseFloat(newCaixinhaInitial) || 0;

    db.saveCaixinha({
      name: newCaixinhaName.trim(),
      target_amount: targetAmt,
      current_amount: initAmt,
      category: newCaixinhaCategory,
      color: newCaixinhaColor,
      icon: newCaixinhaIcon
    });

    setCaixinhas(db.getCaixinhas());
    setIsCaixinhaModalOpen(false);
    setNewCaixinhaName('');
    playTactileFeedback('level_up');
    triggerFeedback(`✓ Caixinha "${newCaixinhaName}" criada com sucesso!`);
  };

  const handleDeleteCaixinha = (id) => {
    if (!id) return;
    db.deleteCaixinha(id);
    setCaixinhas(db.getCaixinhas());
    playTactileFeedback('uncheck');
    triggerFeedback('Caixinha removida com sucesso.');
  };

  const handleExecuteCaixinhaAction = (e) => {
    e.preventDefault();
    const amt = parseFloat(caixinhaActionAmount);
    if (isNaN(amt) || amt <= 0 || !activeCaixinhaAction) {
      triggerFeedback('⚠️ Insira um valor numérico válido.');
      return;
    }

    const { caixinha, type } = activeCaixinhaAction;

    if (type === 'deposit') {
      db.depositCaixinha(caixinha.id, amt);
      triggerFeedback(`💰 R$ ${amt.toFixed(2)} guardados na caixinha "${caixinha.name}"!`);
      if (onCreateTransaction) {
        onCreateTransaction({
          title: `Aporte Caixinha: ${caixinha.name}`,
          amount: amt,
          tx_type: 'Gasto',
          category: 'Investimentos & Caixinhas',
          tx_date: new Date().toISOString().split('T')[0],
          payment_status: 'Pago'
        });
      }
    } else {
      if (amt > Number(caixinha.current_amount)) {
        triggerFeedback('⚠️ Saldo insuficiente na caixinha para este resgate.');
        return;
      }
      db.withdrawCaixinha(caixinha.id, amt);
      triggerFeedback(`💸 R$ ${amt.toFixed(2)} resgatados da caixinha "${caixinha.name}"!`);
      if (onCreateTransaction) {
        onCreateTransaction({
          title: `Resgate Caixinha: ${caixinha.name}`,
          amount: amt,
          tx_type: 'Receita',
          category: 'Investimentos & Caixinhas',
          tx_date: new Date().toISOString().split('T')[0],
          payment_status: 'Pago'
        });
      }
    }

    setCaixinhas(db.getCaixinhas());
    setActiveCaixinhaAction(null);
    setCaixinhaActionAmount('');
    playTactileFeedback('level_up');
  };

  // ==========================================
  // METAS FINANCEIRAS (TETO & APORTE)
  // ==========================================
  const handleSaveBudgetGoals = (e) => {
    e.preventDefault();
    const b = parseFloat(formBudget) || 5000;
    const s = parseFloat(formSavings) || 1500;
    UserGoalsService.setMonthlyBudget(b);
    UserGoalsService.setMonthlySavingsTarget(s);
    setMonthlyBudget(b);
    setMonthlySavingsTarget(s);
    setIsBudgetModalOpen(false);
    playTactileFeedback('level_up');
    triggerFeedback('✓ Metas de orçamento e aporte atualizadas!');
  };

  // Exportação CSV
  const handleExportCSV = () => {
    const listToExport = displayedTransactions.length > 0 ? displayedTransactions : transactions;
    const headers = ['Data', 'Tipo', 'Título', 'Categoria', 'Status', 'Valor_BRL'];
    const rows = listToExport.map((t) => [
      t.tx_date || '',
      t.tx_type || '',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      t.payment_status || 'Pago',
      Number(t.amount || 0).toFixed(2).replace('.', ',')
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `projeto2027_extrato_${selectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    playTactileFeedback('check');
  };

  useEffect(() => {
    const handleExportEvent = () => handleExportCSV();
    window.addEventListener('nexus_export_finance_csv', handleExportEvent);
    return () => window.removeEventListener('nexus_export_finance_csv', handleExportEvent);
  }, [displayedTransactions, transactions, selectedMonth]);

  const totalMonthlySubs = subscriptions
    .filter((s) => s.status === 'Ativa')
    .reduce((acc, s) => acc + (Number(s.price) || 0), 0);

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* 1. BARRA SUPERIOR: CABEÇALHO & CONTROLES GERAIS */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
            <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#10B981] flex items-center gap-1.5">
              <span>Tesouraria & Blindagem Patrimonial</span>
              {feedback && (
                <span className="text-[#06B6D4] font-mono font-medium animate-pulse">
                  • {feedback}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Finanças & Fluxo de Caixa
            </h1>
          </div>
        </div>

        {/* Ações do Topo */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFormBudget(String(monthlyBudget));
              setFormSavings(String(monthlySavingsTarget));
              setIsBudgetModalOpen(true);
              playTactileFeedback('check');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            title="Ajustar teto mensal e meta de economia"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-400">tune</span>
            <span>Metas Financeiras</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCaixinhaModalOpen(true);
              playTactileFeedback('check');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#67E8F9] text-xs font-semibold border border-[#06B6D4]/30 transition-colors cursor-pointer"
            title="Criar novo cofre para guardar dinheiro com objetivo específico"
          >
            <span className="material-symbols-outlined text-[16px]">savings</span>
            <span>+ Nova Caixinha</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowTxModal(true);
              playTactileFeedback('check');
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10B981] text-[#06231A] text-xs font-bold hover:brightness-110 transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add_card</span>
            <span>+ Nova Transação</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="Exportar CSV"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
        </div>
      </div>

      {/* 2. SELETOR DE VISUALIZAÇÃO TEMPORAL (MÊS A MÊS / POR SEMANA / GERAL) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#090D16] p-2.5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-1.5 bg-[#111827] p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => {
              setPeriodMode('mes');
              playTactileFeedback('check');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              periodMode === 'mes'
                ? 'bg-[#10B981] text-[#06231A] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">calendar_month</span>
            <span>Mês a Mês</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPeriodMode('semana');
              playTactileFeedback('check');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              periodMode === 'semana'
                ? 'bg-[#06B6D4] text-[#042B33] shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">date_range</span>
            <span>Por Semana</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPeriodMode('todos');
              playTactileFeedback('check');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              periodMode === 'todos'
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">all_inclusive</span>
            <span>Visão Geral</span>
          </button>
        </div>

        {/* Controles Dinâmicos do Período Selecionado */}
        {periodMode === 'mes' && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStepMonth(-1)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#111827] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-[#10B981] font-mono cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleStepMonth(1)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>

            {selectedMonth !== currentMonthStr && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-mono text-[#06B6D4] transition-colors cursor-pointer"
              >
                Mês Atual
              </button>
            )}
          </div>
        )}

        {periodMode === 'semana' && (
          <div className="flex items-center gap-1.5">
            {[
              { id: '7d', label: 'Últimos 7 Dias' },
              { id: 'w1', label: 'Semana 1 (1-7)' },
              { id: 'w2', label: 'Semana 2 (8-14)' },
              { id: 'w3', label: 'Semana 3 (15-21)' },
              { id: 'w4', label: 'Semana 4 (22+)' }
            ].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWeekFilter(w.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  selectedWeekFilter === w.id
                    ? 'bg-[#06B6D4]/20 text-[#67E8F9] border border-[#06B6D4]/40 font-bold'
                    : 'text-[#94A3B8] hover:text-white bg-white/5'
                }`}
              >
                {w.label}
              </button>
            ))}
          </div>
        )}

        {periodMode === 'todos' && (
          <div className="text-xs font-mono text-[#94A3B8]">
            Consolidado histórico de todas as transações cadastradas
          </div>
        )}
      </div>

      {/* 3. CARDS DE INDICADORES DO PERÍODO SELECIONADO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <div className="p-4 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Receitas do Período</span>
            <span className="material-symbols-outlined text-[18px] text-[#10B981]">trending_up</span>
          </div>
          <div className="text-2xl font-bold font-mono text-[#10B981] mt-1">
            R$ {periodTotalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#64748B] block">
            {periodMode === 'mes' ? formatMonthLabel(selectedMonth) : 'Entradas ativas'}
          </span>
        </div>

        {/* Gastos com Teto */}
        <div className="p-4 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Gastos do Período</span>
            <span className="material-symbols-outlined text-[18px] text-[#EF4444]">trending_down</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            R$ {periodTotalGastos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {/* Barra de Consumo do Teto */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                budgetRatio > 90 ? 'bg-red-500' : budgetRatio > 70 ? 'bg-amber-400' : 'bg-[#10B981]'
              }`}
              style={{ width: `${Math.min(100, budgetRatio)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-0.5">
            <span>Teto: R$ {monthlyBudget.toLocaleString('pt-BR')}</span>
            <span className={budgetRatio > 100 ? 'text-red-400 font-bold' : 'text-[#94A3B8]'}>
              {budgetRatio}%
            </span>
          </div>
        </div>

        {/* Saldo Líquido do Período */}
        <div className="p-4 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Resultado Líquido</span>
            <span className={`material-symbols-outlined text-[18px] ${periodSaldo >= 0 ? 'text-[#06B6D4]' : 'text-red-400'}`}>
              {periodSaldo >= 0 ? 'account_balance' : 'warning'}
            </span>
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${periodSaldo >= 0 ? 'text-[#06B6D4]' : 'text-red-400'}`}>
            {periodSaldo >= 0 ? '+' : ''} R$ {periodSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-[#64748B] block">
            {periodSaldo >= 0 ? `Taxa de poupança: ${savingsRate}%` : 'Déficit no período'}
          </span>
        </div>

        {/* Caixa Total Acumulado */}
        <div className="p-4 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#94A3B8]">
            <span className="text-[10px] uppercase font-bold tracking-wider">Caixa Total do Sistema</span>
            <span className="material-symbols-outlined text-[18px] text-amber-400">payments</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            R$ {healthOverall.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#64748B] flex items-center justify-between">
            <span>Guardado em Caixinhas:</span>
            <span className="text-[#10B981] font-mono font-bold">R$ {totalSavedInCaixinhas.toLocaleString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* 4. ABAS PRINCIPAIS */}
      <div className="flex items-center gap-2 bg-[#090D16] p-1.5 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
        {[
          { id: 'extrato', label: 'Extrato & Gastos Diários', icon: 'receipt_long', badge: `${displayedTransactions.length}` },
          { id: 'relatorio', label: 'Relatório & Diagnóstico', icon: 'pie_chart', badge: 'Auto' },
          { id: 'caixinhas', label: 'Caixinhas & Poupança', icon: 'savings', badge: `${caixinhas.length}` },
          { id: 'assinaturas', label: 'Assinaturas & Custos Fixos', icon: 'autorenew', badge: `R$ ${totalMonthlySubs.toFixed(0)}/m` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              playTactileFeedback('check');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#1E293B] text-white shadow-md border border-white/10'
                : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white/80">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* ABA 1: EXTRATO & GASTOS DIÁRIOS */}
      {/* ======================================================== */}
      {activeTab === 'extrato' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0d131f]/90 border border-white/5 p-3 rounded-2xl">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-[16px]">search</span>
                <input
                  type="text"
                  placeholder="Buscar lançamento por descrição ou categoria..."
                  value={txSearchQuery}
                  onChange={(e) => setTxSearchQuery(e.target.value)}
                  className="w-full bg-[#111827] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-[#10B981]"
                />
              </div>

              {/* Filtro por Categoria */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#111827] border border-white/10 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-[#10B981] cursor-pointer"
              >
                <option value="Todas">Todas Categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-mono text-[#94A3B8] text-right">
              Exibindo <strong>{displayedTransactions.length}</strong> transações no período
            </div>
          </div>

          {/* Tabela de Transações */}
          <div className="bg-[#0d131f]/90 border border-white/5 rounded-2xl shadow-xl overflow-x-auto">
            {displayedTransactions.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#64748B]">
                <span className="material-symbols-outlined text-[36px] text-white/20 mb-2 block">receipt_long</span>
                Nenhuma transação encontrada no período selecionado. Clique em "+ Nova Transação" para lançar!
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.02] text-[#94A3B8] uppercase text-[10px] font-bold tracking-wider border-b border-white/5">
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">Categoria</th>
                    <th className="py-3 px-3 font-mono">Data</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {displayedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-3 px-4 font-semibold text-white font-sans">
                        {t.title}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.tx_type === 'Receita'
                            ? 'bg-[#10B981]/15 text-[#10B981]'
                            : 'bg-red-500/15 text-red-400'
                        }`}>
                          {t.tx_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#94A3B8] font-sans">
                        {t.category}
                      </td>
                      <td className="py-3 px-3 text-[#64748B]">
                        {t.tx_date}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold text-sm ${
                        t.tx_type === 'Receita' ? 'text-[#10B981]' : 'text-white'
                      }`}>
                        {t.tx_type === 'Receita' ? '+' : '-'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDeleteTransaction) onDeleteTransaction(t.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-[#EF4444] transition-all cursor-pointer rounded"
                          title="Excluir lançamento"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: RELATÓRIO AUTOMÁTICO DE GASTOS & CAIXA MENSAL */}
      {/* ======================================================== */}
      {activeTab === 'relatorio' && (
        <div className="space-y-5">
          {/* Diagnóstico em 3 Cards de Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Onde Mais Gastou */}
            <div className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="material-symbols-outlined text-[20px] text-red-400">trending_down</span>
                <h3 className="text-xs font-bold text-white">Onde Mais Gastamos no Período</h3>
              </div>
              {topSpendingCategory ? (
                <div>
                  <div className="text-xl font-bold font-mono text-red-400">
                    {topSpendingCategory.category}
                  </div>
                  <div className="text-xs text-[#94A3B8] font-mono mt-1">
                    Total: <strong className="text-white">R$ {topSpendingCategory.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({topSpendingCategory.percentage}% do total gasto)
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                    Esta categoria é o maior centro de custo do período. Considere revisar pequenos vazamentos aqui.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-[#64748B] py-4">Nenhum gasto computado no período.</div>
              )}
            </div>

            {/* Onde Economizamos */}
            <div className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="material-symbols-outlined text-[20px] text-[#10B981]">savings</span>
                <h3 className="text-xs font-bold text-white">Economia & Margem de Segurança</h3>
              </div>
              <div>
                <div className={`text-xl font-bold font-mono ${budgetSavings >= 0 ? 'text-[#10B981]' : 'text-red-400'}`}>
                  {budgetSavings >= 0 ? `Economia de R$ ${budgetSavings.toLocaleString('pt-BR')}` : `Estourado em R$ ${Math.abs(budgetSavings).toLocaleString('pt-BR')}`}
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-1">
                  Teto Mensal: <strong className="text-white">R$ {monthlyBudget.toLocaleString('pt-BR')}</strong> • Restante: <strong className="text-[#06B6D4]">R$ {budgetRemaining.toLocaleString('pt-BR')}</strong>
                </div>
                <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                  {budgetSavings >= 0
                    ? `Excelente disciplina! Você preservou ${100 - budgetRatio}% do teto estipulado.`
                    : 'Atenção: despesas ultrapassaram o teto mensal configurado.'}
                </p>
              </div>
            </div>

            {/* Caixa Líquido do Mês */}
            <div className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">account_balance</span>
                <h3 className="text-xs font-bold text-white">Taxa de Poupança Líquida</h3>
              </div>
              <div>
                <div className="text-xl font-bold font-mono text-[#06B6D4]">
                  {savingsRate}% da Renda Guardada
                </div>
                <div className="text-xs text-[#94A3B8] font-mono mt-1">
                  Saldo Líquido: <strong className={periodSaldo >= 0 ? 'text-[#10B981]' : 'text-red-400'}>
                    R$ {periodSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <p className="text-[11px] text-[#64748B] mt-2 leading-relaxed">
                  Valor limpo preservado após quitar todas as despesas e compromissos do período.
                </p>
              </div>
            </div>
          </div>

          {/* Ranking Detalhado de Gastos por Categoria */}
          <div className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-white flex items-center gap-2 pb-2 border-b border-white/5">
              <span className="material-symbols-outlined text-[16px] text-amber-400">bar_chart</span>
              Distribuição Proporcional de Despesas por Categoria
            </h3>

            {categoryRanking.length === 0 ? (
              <div className="text-xs text-[#64748B] py-6 text-center">Nenhuma despesa para analisar neste período.</div>
            ) : (
              <div className="space-y-3">
                {categoryRanking.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <span>{item.category}</span>
                      </span>
                      <span className="font-mono text-[#94A3B8]">
                        <strong className="text-white">R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CAIXA TOTAL AO FIM DE CADA MÊS (TABELA MÊS A MÊS) */}
          <div className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#10B981]">calendar_month</span>
                <h3 className="text-xs font-bold text-white">Evolução do Caixa Total ao Fim de Cada Mês</h3>
              </div>
              <span className="text-[11px] font-mono text-[#94A3B8]">
                Balanço Mensal Líquido & Saldo Acumulado
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-white/[0.02] text-[#94A3B8] uppercase text-[10px] font-bold border-b border-white/5">
                    <th className="py-2.5 px-3">Mês</th>
                    <th className="py-2.5 px-3">Entradas</th>
                    <th className="py-2.5 px-3">Saídas</th>
                    <th className="py-2.5 px-3">Saldo Líquido</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Caixa Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {monthlySummaryList.map((m) => (
                    <tr key={m.month} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-3 font-sans font-bold text-white">
                        {formatMonthLabel(m.month)}
                      </td>
                      <td className="py-3 px-3 text-[#10B981]">
                        + R$ {m.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-white/80">
                        - R$ {m.gastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-3 font-bold ${m.net >= 0 ? 'text-[#06B6D4]' : 'text-red-400'}`}>
                        {m.net >= 0 ? '+' : ''} R$ {m.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.net >= 0 ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {m.net >= 0 ? 'Superávit' : 'Déficit'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-amber-400 text-sm">
                        R$ {m.cumulativeBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: CAIXINHAS & COFRES DE POUPANÇA COM OBJETIVOS */}
      {/* ======================================================== */}
      {activeTab === 'caixinhas' && (
        <div className="space-y-5">
          {/* Header de Caixinhas com Total Acumulado */}
          <div className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
                <span className="material-symbols-outlined text-[26px]">savings</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Caixinhas de Dinheiro & Poupança com Objetivo
                </h2>
                <p className="text-xs text-[#94A3B8]">
                  Separe seu capital em cofres específicos para não misturar dinheiro de contas com reservas e sonhos.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 font-mono text-right">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
                  Total Guardado nas Caixinhas
                </span>
                <span className="text-2xl font-bold text-[#10B981]">
                  R$ {totalSavedInCaixinhas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCaixinhaModalOpen(true);
                  playTactileFeedback('check');
                }}
                className="px-4 py-2 rounded-xl bg-[#06B6D4] text-[#042B33] font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Nova Caixinha</span>
              </button>
            </div>
          </div>

          {/* Grid de Cards das Caixinhas */}
          {caixinhas.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#64748B] border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <span className="material-symbols-outlined text-[36px] text-white/20 mb-2 block">savings</span>
              Nenhuma caixinha criada ainda. Clique em "+ Nova Caixinha" acima para criar sua primeira reserva!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caixinhas.map((cx) => {
                const progressPct = cx.target_amount > 0
                  ? Math.min(100, Math.round((cx.current_amount / cx.target_amount) * 100))
                  : 100;
                const remaining = Math.max(0, cx.target_amount - cx.current_amount);

                return (
                  <div
                    key={cx.id}
                    className="p-5 rounded-2xl bg-[#0d131f]/90 border border-white/5 hover:border-white/15 shadow-xl flex flex-col justify-between gap-4 transition-all group"
                  >
                    <div>
                      {/* Header do Card */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: `${cx.color}20`,
                              color: cx.color,
                              border: `1px solid ${cx.color}40`
                            }}
                          >
                            <span className="material-symbols-outlined text-[20px]">{cx.icon || 'savings'}</span>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{cx.name}</h3>
                            <span className="text-[10px] text-[#64748B] font-mono">{cx.category}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCaixinha(cx.id);
                          }}
                          className="p-1.5 text-[#64748B] hover:text-[#EF4444] transition-all cursor-pointer rounded-lg hover:bg-white/5"
                          title="Excluir caixinha"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>

                      {/* Saldo e Meta */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-baseline justify-between font-mono">
                          <span className="text-2xl font-bold text-white">
                            R$ {Number(cx.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs font-bold text-[#10B981]">
                            {progressPct}%
                          </span>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progressPct}%`,
                              backgroundColor: cx.color || '#10B981'
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono text-[#94A3B8]">
                          <span>Meta: R$ {Number(cx.target_amount).toLocaleString('pt-BR')}</span>
                          <span>Faltam R$ {remaining.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Ações de Guardar e Resgatar */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCaixinhaAction({ caixinha: cx, type: 'deposit' });
                          setCaixinhaActionAmount('');
                          playTactileFeedback('check');
                        }}
                        className="py-2 px-3 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">add</span>
                        <span>Guardar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveCaixinhaAction({ caixinha: cx, type: 'withdraw' });
                          setCaixinhaActionAmount('');
                          playTactileFeedback('check');
                        }}
                        className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">remove</span>
                        <span>Resgatar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: ASSINATURAS & CUSTOS FIXOS */}
      {/* ======================================================== */}
      {activeTab === 'assinaturas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0d131f]/90 border border-white/5 shadow-lg">
            <div>
              <h3 className="text-xs font-bold text-white">Serviços Recorrentes & Assinaturas ({subscriptions.length})</h3>
              <p className="text-[11px] text-[#94A3B8]">
                Custo fixo mensal acumulado: <strong className="text-white font-mono">R$ {totalMonthlySubs.toFixed(2)}/mês</strong>
              </p>
            </div>
            <button
              onClick={() => {
                setShowSubModal(true);
                playTactileFeedback('check');
              }}
              className="px-4 py-2 rounded-xl bg-[#06B6D4] text-[#042B33] font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-md flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Nova Assinatura</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-[#0d131f]/90 border border-white/5 flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{sub.service_name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onUpdateSubscription && onUpdateSubscription(sub.id, {
                        status: sub.status === 'Ativa' ? 'Pausada' : 'Ativa'
                      })}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        sub.status === 'Ativa'
                          ? 'bg-[#10B981]/15 text-[#10B981]'
                          : 'bg-amber-400/15 text-amber-400'
                      }`}
                    >
                      {sub.status}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onDeleteSubscription) onDeleteSubscription(sub.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-[#EF4444] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold font-mono text-[#10B981]">
                    R$ {Number(sub.price).toFixed(2)} <span className="text-xs text-[#94A3B8] font-normal">/{sub.billing_cycle}</span>
                  </div>
                  <span className="text-[10px] text-[#64748B] font-mono mt-1 block">
                    Próxima cobrança: {sub.next_payment_date}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA TRANSAÇÃO */}
      {/* ======================================================== */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10B981]">add_card</span>
                Nova Transação Financeira
              </h3>
              <button onClick={() => setShowTxModal(false)} className="text-[#94A3B8] hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleTxSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-medium">Descrição</label>
                <input
                  type="text"
                  required
                  value={txTitle}
                  onChange={(e) => setTxTitle(e.target.value)}
                  placeholder="Ex: Almoço, Salário, Internet..."
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Tipo</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981] cursor-pointer"
                  >
                    <option value="Gasto">Gasto (Saída)</option>
                    <option value="Receita">Receita (Entrada)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Categoria</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981] cursor-pointer"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Data</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#10B981] text-[#06231A] font-bold hover:brightness-110 cursor-pointer shadow-sm"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: NOVA CAIXINHA DE POUPANÇA */}
      {/* ======================================================== */}
      {isCaixinhaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#06B6D4]">savings</span>
                Criar Nova Caixinha de Objetivos
              </h3>
              <button onClick={() => setIsCaixinhaModalOpen(false)} className="text-[#94A3B8] hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCaixinha} className="space-y-3 text-xs">
              <div>
                <label className="text-[#94A3B8] block mb-1 font-medium">Nome do Objetivo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Troca de Carro, Viagem 2027..."
                  value={newCaixinhaName}
                  onChange={(e) => setNewCaixinhaName(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Meta Alvo (R$)</label>
                  <input
                    type="number"
                    step="50"
                    required
                    value={newCaixinhaTarget}
                    onChange={(e) => setNewCaixinhaTarget(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#06B6D4]"
                  />
                </div>
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Valor Inicial Guardado (R$)</label>
                  <input
                    type="number"
                    step="50"
                    value={newCaixinhaInitial}
                    onChange={(e) => setNewCaixinhaInitial(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Categoria</label>
                  <select
                    value={newCaixinhaCategory}
                    onChange={(e) => setNewCaixinhaCategory(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#06B6D4] cursor-pointer"
                  >
                    <option value="Segurança">Segurança / Emergência</option>
                    <option value="Investimentos">Investimentos / Riqueza</option>
                    <option value="Sonhos">Sonhos / Viagens</option>
                    <option value="Bens">Bens / Veículo / Imóvel</option>
                    <option value="Educação">Cursos / Educação</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#94A3B8] block mb-1 font-medium">Ícone Visual</label>
                  <select
                    value={newCaixinhaIcon}
                    onChange={(e) => setNewCaixinhaIcon(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#06B6D4] cursor-pointer"
                  >
                    <option value="savings">savings (Cofre)</option>
                    <option value="shield">shield (Segurança)</option>
                    <option value="rocket_launch">rocket_launch (Liberdade)</option>
                    <option value="flight_takeoff">flight_takeoff (Viagem)</option>
                    <option value="directions_car">directions_car (Veículo)</option>
                    <option value="home">home (Imóvel)</option>
                    <option value="laptop_chromebook">laptop (Tecnologia)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCaixinhaModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#06B6D4] text-[#042B33] font-bold hover:brightness-110 cursor-pointer shadow-sm"
                >
                  Criar Caixinha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: GUARDAR / RESGATAR DE CAIXINHA */}
      {/* ======================================================== */}
      {activeCaixinhaAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#10B981]">
                  {activeCaixinhaAction.type === 'deposit' ? 'add_circle' : 'remove_circle'}
                </span>
                <span>
                  {activeCaixinhaAction.type === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro'}
                </span>
              </h3>
              <button
                onClick={() => setActiveCaixinhaAction(null)}
                className="text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleExecuteCaixinhaAction} className="space-y-4 text-xs">
              <div>
                <p className="text-[#94A3B8]">
                  Caixinha alvo: <strong className="text-white">{activeCaixinhaAction.caixinha.name}</strong>
                </p>
                <p className="text-[11px] text-[#64748B] font-mono mt-0.5">
                  Saldo atual: R$ {Number(activeCaixinhaAction.caixinha.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1 font-medium">
                  Valor a {activeCaixinhaAction.type === 'deposit' ? 'Guardar' : 'Resgatar'} (R$)
                </label>
                <input
                  type="number"
                  step="10"
                  required
                  placeholder="Ex: 200"
                  value={caixinhaActionAmount}
                  onChange={(e) => setCaixinhaActionAmount(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-base font-bold outline-none focus:border-[#10B981]"
                  autoFocus
                />
              </div>

              {/* Botões Rápidos de Valor */}
              <div className="flex flex-wrap gap-1.5">
                {[50, 100, 200, 500, 1000].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCaixinhaActionAmount(String(v))}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white font-mono text-[11px] cursor-pointer"
                  >
                    + R$ {v}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveCaixinhaAction(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#10B981] text-[#06231A] font-bold hover:brightness-110 cursor-pointer shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: METAS FINANCEIRAS (TETO & APORTE) */}
      {/* ======================================================== */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">tune</span>
                Metas Financeiras & Teto Mensal
              </h3>
              <button
                type="button"
                onClick={() => setIsBudgetModalOpen(false)}
                className="text-[#94A3B8] hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveBudgetGoals} className="space-y-4">
              <p className="text-[#94A3B8] leading-relaxed">
                Configure o teto máximo de despesas e a meta de economia para monitoramento em tempo real nos relatórios automáticos.
              </p>

              <div>
                <label className="text-white block mb-1 font-semibold">
                  💳 Teto de Gastos Mensal / Orçamento Limite (R$)
                </label>
                <input
                  type="number"
                  step="50"
                  min="100"
                  value={formBudget}
                  onChange={(e) => setFormBudget(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-base font-mono font-bold text-white outline-none focus:border-[#10B981]"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">
                  Seus gastos mensais serão comparados contra este limite no painel de economia.
                </span>
              </div>

              <div>
                <label className="text-white block mb-1 font-semibold">
                  💰 Meta Mensal de Aporte / Economia Líquida (R$)
                </label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  value={formSavings}
                  onChange={(e) => setFormSavings(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl p-3 text-base font-mono font-bold text-[#06B6D4] outline-none focus:border-[#06B6D4]"
                />
                <span className="text-[10px] text-[#64748B] block mt-1">
                  Quanto do seu saldo líquido você pretende poupar e transferir para as caixinhas a cada mês.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#10B981] text-[#06231A] font-bold hover:brightness-110 cursor-pointer shadow-sm"
                >
                  Salvar Metas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Assinatura */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">Nova Assinatura Recorrente</h3>
              <button onClick={() => setShowSubModal(false)} className="text-[#94A3B8] hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubSubmit} className="space-y-3">
              <div>
                <label className="text-[#94A3B8] block mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Ex: Spotify, Netflix, ChatGPT..."
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#94A3B8] block mb-1">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={subPrice}
                    onChange={(e) => setSubPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#10B981]"
                  />
                </div>
                <div>
                  <label className="text-[#94A3B8] block mb-1">Ciclo</label>
                  <select
                    value={subCycle}
                    onChange={(e) => setSubCycle(e.target.value)}
                    className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981] cursor-pointer"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Trimestral">Trimestral</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#94A3B8] block mb-1">Próxima Cobrança</label>
                <input
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#10B981]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#06B6D4] text-[#042B33] font-bold hover:brightness-110 cursor-pointer shadow-sm"
                >
                  Salvar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
