import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';

export default function PillarsRadar({ onClose, selectedDate, dailyLog: propDailyLog, habits: propHabits }) {
  const [updateTick, setUpdateTick] = useState(0);

  // Escuta atualizações de dados e reset do sistema em tempo real
  useEffect(() => {
    const handleUpdate = () => setUpdateTick(v => v + 1);
    window.addEventListener('nexus_data_updated', handleUpdate);
    window.addEventListener('nexus_xp_update', handleUpdate);
    return () => {
      window.removeEventListener('nexus_data_updated', handleUpdate);
      window.removeEventListener('nexus_xp_update', handleUpdate);
    };
  }, []);

  const pillars = useMemo(() => {
    const targetDate = selectedDate || new Date().toISOString().split('T')[0];
    const tasks = db.getTasks() || [];
    const goals = db.getGoals() || [];
    const media = db.getMediaCatalog() || [];
    const health = db.getHealthMetrics() || [];
    const habits = propHabits || db.getCustomHabits() || [];
    const todayLog = propDailyLog || db.getDailyLog(targetDate) || {};

    // 1. Carreira & Trabalho (Tarefas e Metas de Carreira)
    let workScore = 0;
    if (tasks.length > 0 || goals.length > 0) {
      const tasksDone = tasks.filter(t => t.status === 'Feito').length;
      const taskRatio = tasks.length > 0 ? (tasksDone / tasks.length) * 100 : 0;
      const goalRatio = goals.length > 0
        ? goals.reduce((acc, g) => acc + (Number(g.current_value || 0) / Number(g.target_value || 100)) * 100, 0) / goals.length
        : 0;
      workScore = tasks.length > 0 && goals.length > 0
        ? Math.round(taskRatio * 0.6 + goalRatio * 0.4)
        : Math.round(taskRatio || goalRatio);
    }
    workScore = Math.min(100, Math.max(0, workScore));

    // 2. Saúde & Físico (Hábitos de saúde e treinos registrados)
    const healthHabits = habits.filter(h =>
      h.id.includes('exercise') || h.id.includes('water') || h.id.includes('diet') || h.id.includes('sleep')
    );
    let checkedCount = 0;
    if (healthHabits.length > 0) {
      healthHabits.forEach(h => {
        if (todayLog[h.id] === true || todayLog[h.id] === 1) checkedCount++;
      });
    }
    const recentWorkouts = health.filter(h => h.workout_type && h.workout_type !== 'Descanso Ativo').length;
    let healthScore = 0;
    if (healthHabits.length > 0 || recentWorkouts > 0) {
      const habitPart = healthHabits.length > 0 ? (checkedCount / healthHabits.length) * 60 : 0;
      const workoutPart = Math.min(40, recentWorkouts * 10);
      healthScore = Math.round(habitPart + workoutPart);
    }
    healthScore = Math.min(100, Math.max(0, healthScore));

    // 3. Finanças & Capital (Taxa de poupança real, zero hardcoded 65)
    const txs = db.getTransactions() || [];
    const subs = db.getSubscriptions() || [];
    let financeScore = 0;
    if (txs.length > 0 || subs.length > 0) {
      const income = txs.filter(t => t.tx_type === 'Receita').reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const expense = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + (Number(b.amount) || 0), 0);
      if (income > 0) {
        const savingsRate = Math.max(0, (income - expense) / income);
        financeScore = Math.min(100, Math.max(15, Math.round(savingsRate * 100)));
      } else if (expense > 0) {
        // Se há apenas despesas lançadas e zero receita, score defensivo proporcional
        financeScore = Math.max(10, Math.round(40 - Math.min(30, expense / 200)));
      } else {
        financeScore = 0;
      }
    }
    financeScore = Math.min(100, Math.max(0, financeScore));

    // 4. Intelectual & Mente (Páginas lidas, livros no acervo e hábito de leitura)
    const books = media.filter(m => m.media_type === 'Livro');
    let intellectScore = 0;
    const isReadHabitChecked = todayLog.h_read_30m === true || todayLog.h_read_30m === 1;
    if (books.length > 0 || isReadHabitChecked) {
      const pages = books.reduce((a, b) => a + (Number(b.current_page) || 0), 0);
      const finishedBooks = books.filter(b => b.status === 'Lido').length;
      const readingHabitBonus = isReadHabitChecked ? 30 : 0;
      const readingProgress = Math.min(70, Math.round((pages / 80) * 35 + finishedBooks * 25));
      intellectScore = Math.min(100, readingProgress + readingHabitBonus);
    }
    intellectScore = Math.min(100, Math.max(0, intellectScore));

    // 5. Equilíbrio Pessoal (Reflexões diárias e journaling)
    let reflectionFilled = 0;
    if (todayLog.reflection_gratitude && String(todayLog.reflection_gratitude).trim().length > 3) reflectionFilled += 25;
    if (todayLog.reflection_better && String(todayLog.reflection_better).trim().length > 3) reflectionFilled += 25;
    if (todayLog.reflection_learning && String(todayLog.reflection_learning).trim().length > 3) reflectionFilled += 25;
    if (todayLog.journal_richtext && String(todayLog.journal_richtext).trim().length > 3) reflectionFilled += 25;
    const personalScore = Math.min(100, reflectionFilled);

    const list = [
      { name: 'Carreira & Projetos', score: workScore, icon: 'work', color: '#06B6D4' },
      { name: 'Saúde & Vitalidade', score: healthScore, icon: 'fitness_center', color: '#10B981' },
      { name: 'Finanças & Blindagem', score: financeScore, icon: 'account_balance_wallet', color: '#F59E0B' },
      { name: 'Intelectual & Mente', score: intellectScore, icon: 'auto_stories', color: '#8B5CF6' },
      { name: 'Equilíbrio & Consciência', score: personalScore, icon: 'self_improvement', color: '#EC4899' }
    ];

    // Índice de Harmonia Holística: média real dos 5 pilares
    const harmonyIndex = Math.round(list.reduce((acc, p) => acc + p.score, 0) / list.length);

    return { list, harmonyIndex };
  }, [selectedDate, propDailyLog, propHabits, updateTick]);

  return (
    <div className="bg-[#111827] border border-[#1F293D] p-5 rounded-2xl space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
            <span className="material-symbols-outlined text-[18px]">radar</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Roda da Vida • 5 Pilares do Projeto
            </h3>
            <span className="text-[11px] text-[#94A3B8]">
              Índice de Harmonia Holística: <strong className="text-[#10B981] font-mono">{pillars.harmonyIndex}%</strong>
            </span>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white p-1">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      <div className="space-y-3 pt-1">
        {pillars.list.map((p) => (
          <div key={p.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <span className="material-symbols-outlined text-[16px]" style={{ color: p.color }}>
                  {p.icon}
                </span>
                {p.name}
              </span>
              <span className="font-mono font-bold" style={{ color: p.color }}>
                {p.score}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#1E293B] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${p.score}%`, backgroundColor: p.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {pillars.harmonyIndex === 0 && (
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center text-[11px] text-[#94A3B8]">
          Ecossistema zerado. Registre tarefas, hábitos, leituras ou finanças para elevar os pilares da sua Roda da Vida.
        </div>
      )}
    </div>
  );
}
