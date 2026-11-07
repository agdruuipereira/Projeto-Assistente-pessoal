import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { JarvisAIService } from '../services/jarvisAI';
import { jarvisVoice } from '../services/jarvisVoice';
import { playTactileFeedback } from '../services/haptics';
import { printExecutiveReport } from '../services/reportExport';

export default function WeeklyReviewModal({ isOpen, onClose }) {
  const today = useMemo(() => new Date(), []);
  
  // Calcular o número da semana no ano (ISO week)
  const currentWeekNumber = useMemo(() => {
    const target = new Date(today.valueOf());
    const dayNr = (today.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  }, [today]);

  const weekId = `${today.getFullYear()}-W${String(currentWeekNumber).padStart(2, '0')}`;

  // Resumo dos últimos 7 dias a partir do banco de dados
  const weekStats = useMemo(() => {
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      past7Days.push(d.toISOString().split('T')[0]);
    }

    const allTasks = db.getTasks();
    const tasksCompleted = allTasks.filter(
      t => t.status === 'Feito' && (past7Days.includes(t.due_date) || !t.due_date)
    ).length;

    const habits = db.getCustomHabits();
    let totalHabitsChecked = 0;
    let totalPossibleHabits = past7Days.length * (habits.length || 1);

    past7Days.forEach(dateStr => {
      const log = db.getDailyLog(dateStr);
      habits.forEach(h => {
        if (log[h.id]) totalHabitsChecked++;
      });
    });

    const habitPct = totalPossibleHabits > 0 
      ? Math.round((totalHabitsChecked / totalPossibleHabits) * 100) 
      : 0;

    const txs = db.getTransactions();
    const weekIncome = txs
      .filter(t => t.tx_type === 'Receita')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const weekExpenses = txs
      .filter(t => t.tx_type === 'Gasto')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
    const netFlow = weekIncome - weekExpenses;

    return {
      tasksCompleted,
      habitPct,
      netFlow,
      totalHabitsChecked
    };
  }, [today]);

  // Form states
  const [winOfWeek, setWinOfWeek] = useState('');
  const [obstacleOfWeek, setObstacleOfWeek] = useState('');
  const [nextWeekPriority, setNextWeekPriority] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  // J.A.R.V.I.S. AI Strategic Assessment State
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeakingAnalysis, setIsSpeakingAnalysis] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const reviews = db.getWeeklyReviews();
      const existing = reviews.find(r => r.week_id === weekId);
      if (existing) {
        setWinOfWeek(existing.win_of_week || '');
        setObstacleOfWeek(existing.obstacle_of_week || '');
        setNextWeekPriority(existing.next_week_priority || '');
        if (existing.ai_analysis) setAiAnalysis(existing.ai_analysis);
      }
    }
  }, [isOpen, weekId]);

  if (!isOpen) return null;

  const handleGenerateJarvisAnalysis = async () => {
    setIsAnalyzing(true);
    playTactileFeedback('jarvis_activate');
    try {
      const prompt = `Como J.A.R.V.I.S., realize uma calibração executiva e analítica da minha semana (${weekId}) rumo ao Projeto 2027:
- Tarefas concluídas: ${weekStats.tasksCompleted}
- Consistência de hábitos: ${weekStats.habitPct}% (${weekStats.totalHabitsChecked} rituais cumpridos)
- Saldo financeiro líquido: R$ ${weekStats.netFlow.toFixed(2)}
- Maior vitória: ${winOfWeek || 'Em andamento'}
- Maior obstáculo: ${obstacleOfWeek || 'Não informado'}
- Foco da próxima semana: ${nextWeekPriority || 'Alinhamento geral'}

Estruture sua resposta no tom tático de alto escalão (estilo Jarvis):
1. ANÁLISE DE VELOCIDADE (Pontos fortes e disciplina)
2. AJUSTE DE ROTA (Correção do obstáculo enfrentado)
3. DIRETRIZ ESTRATÉGICA PARA 2027 (Frase-chave de comando)`;

      const result = await JarvisAIService.queryAI(prompt);
      const clean = result.replace(/```[\s\S]*?```/gi, '').trim();
      setAiAnalysis(clean);
      playTactileFeedback('jarvis_confirm');
    } catch (err) {
      setAiAnalysis(`Oscilação na rede neural: ${err.message}. Verifique a chave de API em Configurações.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleToggleSpeakAnalysis = () => {
    if (isSpeakingAnalysis) {
      jarvisVoice.cancelSpeaking();
      setIsSpeakingAnalysis(false);
    } else if (aiAnalysis) {
      setIsSpeakingAnalysis(true);
      jarvisVoice.speak(aiAnalysis, () => setIsSpeakingAnalysis(false));
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    db.saveWeeklyReview({
      week_id: weekId,
      win_of_week: winOfWeek.trim(),
      obstacle_of_week: obstacleOfWeek.trim(),
      next_week_priority: nextWeekPriority.trim(),
      habits_rate: weekStats.habitPct,
      tasks_completed: weekStats.tasksCompleted,
      ai_analysis: aiAnalysis
    });

    setSaveStatus('✓ Retrospectiva salva!');
    setTimeout(() => {
      setSaveStatus('');
      onClose();
    }, 1500);
  };

  const handleExportMarkdown = () => {
    const lines = [];
    lines.push(`# Retrospectiva Semanal Nexus — ${weekId}`);
    lines.push(`*Gerado em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}*\n`);

    lines.push('## 📊 Telemetria da Semana');
    lines.push(`- **Tarefas Concluídas:** ${weekStats.tasksCompleted}`);
    lines.push(`- **Consistência de Hábitos:** ${weekStats.habitPct}% (${weekStats.totalHabitsChecked} rituais)`);
    lines.push(`- **Fluxo Líquido:** R$ ${weekStats.netFlow.toFixed(2)}\n`);

    lines.push('## 🏆 1. Maior Vitória ou Avanço da Semana');
    lines.push(`${winOfWeek || '_Nenhum registro._'}\n`);

    lines.push('## 🚧 2. O Maior Obstáculo ou Distração Enfrentada');
    lines.push(`${obstacleOfWeek || '_Nenhum registro._'}\n`);

    lines.push('## 🎯 3. Prioridade Absoluta Número 1 Para a Próxima Semana');
    lines.push(`${nextWeekPriority || '_Nenhum registro._'}\n`);

    if (aiAnalysis) {
      lines.push('## 🤖 Parecer Estratégico do J.A.R.V.I.S.');
      lines.push(`${aiAnalysis}\n`);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexus_retrospectiva_${weekId}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 flex items-center justify-center text-[#8B5CF6]">
              <span className="material-symbols-outlined text-[24px]">published_with_changes</span>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#8B5CF6]">Calibração Semanal</div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Retrospectiva — Semana {currentWeekNumber} ({weekId})
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-[#94A3B8] hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Telemetria dos últimos 7 dias */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[#1E293B]/60 border border-[#334155]/50 text-center">
            <div className="text-[10px] uppercase text-[#94A3B8]">Tarefas Feitas</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{weekStats.tasksCompleted}</div>
          </div>

          <div className="p-3 rounded-xl bg-[#1E293B]/60 border border-[#334155]/50 text-center">
            <div className="text-[10px] uppercase text-[#94A3B8]">Consistência Hábitos</div>
            <div className="text-xl font-bold text-[#10B981] font-mono mt-0.5">{weekStats.habitPct}%</div>
          </div>

          <div className="p-3 rounded-xl bg-[#1E293B]/60 border border-[#334155]/50 text-center">
            <div className="text-[10px] uppercase text-[#94A3B8]">Saldo Financeiro</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${weekStats.netFlow >= 0 ? 'text-[#06B6D4]' : 'text-[#EF4444]'}`}>
              R$ {weekStats.netFlow.toFixed(0)}
            </div>
          </div>
        </div>

        {/* Cartão de Parecer Estratégico com J.A.R.V.I.S. */}
        <div className="p-4 bg-gradient-to-r from-[#090D16] via-[#111827] to-[#090D16] border border-[#06B6D4]/40 rounded-xl space-y-3 relative overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.1)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#06B6D4]">neurology</span>
              <span className="text-xs font-mono font-bold tracking-wider text-white">PARECER ESTRATÉGICO DO J.A.R.V.I.S.</span>
            </div>

            <div className="flex items-center gap-2">
              {aiAnalysis && (
                <button
                  type="button"
                  onClick={handleToggleSpeakAnalysis}
                  className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-mono text-[#06B6D4] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ouvir análise"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isSpeakingAnalysis ? 'stop' : 'volume_up'}
                  </span>
                  <span>{isSpeakingAnalysis ? 'Parar Áudio' : 'Ouvir Parecer'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateJarvisAnalysis}
                disabled={isAnalyzing}
                className="px-3 py-1.5 rounded-lg bg-[#06B6D4] hover:opacity-90 text-[#001F26] text-xs font-mono font-bold flex items-center gap-1.5 transition-opacity disabled:opacity-40 cursor-pointer shadow-md"
              >
                <span className="material-symbols-outlined text-[15px]">
                  {isAnalyzing ? 'sync' : 'psychology'}
                </span>
                <span>{isAnalyzing ? 'Calibrando Matriz...' : aiAnalysis ? 'Recalibrar com IA' : 'Gerar Parecer'}</span>
              </button>
            </div>
          </div>

          {aiAnalysis ? (
            <div className="p-3.5 bg-[#111827] border border-[#1F293D] rounded-xl text-xs text-[#E2E8F0] whitespace-pre-line leading-relaxed font-sans animate-fade-in shadow-inner">
              {aiAnalysis}
            </div>
          ) : (
            <p className="text-[11px] text-[#94A3B8] leading-relaxed">
              Solicite uma auditoria executiva da sua semana. O J.A.R.V.I.S. correlacionará seus hábitos, tarefas cumpridas e fluxo de caixa para entregar 3 orientações táticas de alta precisão.
            </p>
          )}
        </div>

        {/* Formulário Guiado de 3 Perguntas */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white block mb-1 flex items-center gap-1.5">
              <span className="text-[#10B981]">1.</span> Qual foi minha maior vitória ou avanço nos últimos 7 dias?
            </label>
            <textarea
              rows="3"
              required
              value={winOfWeek}
              onChange={(e) => setWinOfWeek(e.target.value)}
              placeholder="Ex: Concluí o projeto no prazo, mantive os treinos em 5 dias e avancei na leitura..."
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#8B5CF6] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white block mb-1 flex items-center gap-1.5">
              <span className="text-[#EF4444]">2.</span> O que drenou minha energia ou foi o maior gargalo/distração?
            </label>
            <textarea
              rows="3"
              value={obstacleOfWeek}
              onChange={(e) => setObstacleOfWeek(e.target.value)}
              placeholder="Ex: Procrastinação após o almoço na quarta, uso excessivo de redes sociais..."
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#8B5CF6] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white block mb-1 flex items-center gap-1.5">
              <span className="text-[#06B6D4]">3.</span> Qual é a prioridade absoluta número 1 para a próxima semana?
            </label>
            <textarea
              rows="2"
              required
              value={nextWeekPriority}
              onChange={(e) => setNextWeekPriority(e.target.value)}
              placeholder="Ex: Finalizar a entrega do cliente e manter hidratação em 3L todos os dias..."
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-[#06B6D4] resize-none"
            />
          </div>

          {/* Rodapé de Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1F293D]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="px-3 py-2 rounded-xl bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/25 text-[#A78BFA] border border-[#8B5CF6]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Exportar (.md)</span>
              </button>

              <button
                type="button"
                onClick={printExecutiveReport}
                className="px-3 py-2 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Imprimir ou gerar PDF limpo do Relatório de Operações"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
                <span>Imprimir / PDF</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {saveStatus && (
                <span className="text-xs text-[#10B981] font-semibold animate-pulse">{saveStatus}</span>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white text-xs font-semibold transition-colors"
              >
                Fechar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#10B981] text-[#06231A] font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              >
                Salvar Retrospectiva
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

