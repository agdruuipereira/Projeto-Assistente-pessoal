/**
 * src/services/reportExport.js
 * Gerador de Relatórios Executivos de Desempenho e Telemetria para o Projeto 2027.
 * Suporta exportação em Markdown (.md) estruturado para o Obsidian e Impressão / PDF limpo.
 */

import { db } from './db.js';
import { calculateUserXP } from './gamification.js';
import { playTactileFeedback } from './haptics.js';

export function buildExecutiveReportData() {
  let userName = 'Alexandre';
  let userRole = 'Comandante Central';
  try {
    const saved = localStorage.getItem('nexus_user_profile');
    if (saved) {
      const p = JSON.parse(saved);
      if (p.name) userName = p.name;
      if (p.role) userRole = p.role;
    }
  } catch (_) {}

  const tasks = db.getTasks();
  const goals = db.getGoals();
  const media = db.getMediaCatalog();
  const dailyLogs = db.getDailyLogs();
  const txs = db.getTransactions();
  const customHabits = db.getCustomHabits();
  const focusCycles = Number(typeof localStorage !== 'undefined' ? localStorage.getItem('nexus_focus_stats') || 0 : 0);

  const xpStats = calculateUserXP(tasks, goals, media, dailyLogs, focusCycles);

  // Tarefas
  const tasksCompleted = tasks.filter(t => t.status === 'Feito');
  const tasksPending = tasks.filter(t => t.status !== 'Feito');
  const tasksHighPriority = tasks.filter(t => t.priority === 'Alta');

  // Finanças
  const receitas = txs.filter(t => t.tx_type === 'Receita').reduce((a, b) => a + Number(b.amount || 0), 0);
  const gastos = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + Number(b.amount || 0), 0);
  const saldo = receitas - gastos;
  const spentRatio = receitas > 0 ? Math.round((gastos / receitas) * 100) : 100;

  // Hábitos
  const today = new Date().toISOString().split('T')[0];
  const todayLog = db.getDailyLog(today);
  const todayCompletedHabits = customHabits.filter(h => todayLog[h.id]).length;

  return {
    userName,
    userRole,
    dateStr: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date()),
    xpStats,
    tasksCount: tasks.length,
    tasksCompletedCount: tasksCompleted.length,
    tasksPendingCount: tasksPending.length,
    tasksHighPriorityCount: tasksHighPriority.length,
    receitas,
    gastos,
    saldo,
    spentRatio,
    customHabits,
    todayCompletedHabits,
    goals,
    txs: txs.slice(0, 10),
    tasksPending: tasksPending.slice(0, 10)
  };
}

export function generateExecutiveReportMarkdown() {
  const d = buildExecutiveReportData();

  return `---
title: Nexus Command • Relatório Executivo de Produtividade
author: ${d.userName} (${d.userRole})
date: ${new Date().toISOString().split('T')[0]}
tags: [projeto2027, nexus-command, executive-report, produtividade]
---

# 🛡️ PROJETO 2027 — RELATÓRIO EXECUTIVO DE OPERAÇÕES
> **Data:** ${d.dateStr}  
> **Comandante:** ${d.userName} • **Patente:** ${d.xpStats.rank.title} (Nível ${d.xpStats.rank.level})  
> **Pontuação de Disciplina:** ${d.xpStats.totalXP} XP (${d.xpStats.progressPct}% para o próximo nível)

---

## 📊 1. Resumo de Produtividade e Tarefas
* **Total de Tarefas no Sistema:** ${d.tasksCount}
* **Tarefas Concluídas:** ${d.tasksCompletedCount}
* **Tarefas Pendentes:** ${d.tasksPendingCount} (${d.tasksHighPriorityCount} de Alta Prioridade)

### Principais Demandas na Fila Operacional:
${d.tasksPending.length > 0 
  ? d.tasksPending.map(t => `- [ ] [${t.priority}] **${t.title}** (${t.category})`).join('\n')
  : '- Nenhuma tarefa pendente no momento.'}

---

## ⚡ 2. Consistência de Hábitos e Disciplina
* **Hábitos Ativos na Rotina:** ${d.customHabits.length}
* **Hábitos Concluídos Hoje:** ${d.todayCompletedHabits} de ${d.customHabits.length} (${d.customHabits.length > 0 ? Math.round((d.todayCompletedHabits / d.customHabits.length) * 100) : 0}%)
* **Ciclos de Foco Total (Pomodoro) Acumulados:** ${d.xpStats.breakdown.focusCyclesXP / 25} blocos

---

## 💰 3. Balanço de Tesouraria e Fluxo de Caixa
* **Receitas Totais:** R$ ${d.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Despesas Registradas:** R$ ${d.gastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Saldo Líquido em Caixa:** R$ ${d.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
* **Taxa de Queima (*Burn Ratio*):** ${d.spentRatio}% (${d.spentRatio <= 70 ? 'Saudável' : d.spentRatio <= 90 ? 'Atenção' : 'Crítico'})

---

## 🎯 4. Metas Estratégicas do Projeto 2027
${d.goals.map(g => `- **${g.title}** (${g.theme}): ${g.current_value || 0}/${g.target_value || 100} (${Math.round(((g.current_value || 0)/(g.target_value || 100))*100)}%)`).join('\n')}

---
*Gerado automaticamente pelo J.A.R.V.I.S. • Nexus Command Center*
`.trim();
}

export function downloadExecutiveReportMarkdown() {
  try {
    const md = generateExecutiveReportMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Executivo_Nexus_2027_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playTactileFeedback('check');
    return true;
  } catch (err) {
    console.error('[Report Export Error]', err);
    return false;
  }
}

export function printExecutiveReport() {
  const md = generateExecutiveReportMarkdown();
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Relatório Executivo • Projeto 2027</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #111;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { color: #0891b2; border-bottom: 2px solid #0891b2; padding-bottom: 8px; font-size: 24px; }
          h2 { color: #334155; margin-top: 24px; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 6px; }
          blockquote { background: #f8fafc; border-left: 4px solid #0891b2; padding: 10px 16px; margin: 16px 0; font-size: 14px; }
          hr { border: none; border-top: 1px solid #cbd5e1; margin: 20px 0; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div>${md.replace(/\n/g, '<br/>').replace(/#{1,3}\s+(.*?)<br\/>/g, '<h2>$1</h2>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

