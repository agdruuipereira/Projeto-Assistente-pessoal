/**
 * src/services/obsidianVaultExport.js
 * Exportador Completo do Ecossistema para o Formato Nativo do Obsidian Vault (.ZIP)
 * Gera pastas estruturadas, Daily Notes com frontmatter YAML, links internos e tabelas Markdown.
 */

import JSZip from 'jszip';
import { db } from './db.js';

export class ObsidianVaultExportService {
  /**
   * Constrói e faz o download do arquivo .zip contendo toda a estrutura de notas do Obsidian
   */
  static async exportFullVaultZip() {
    const zip = new JSZip();
    const today = new Date().toISOString().split('T')[0];

    // 1. Pasta Daily Notes/
    const dailyFolder = zip.folder('Daily Notes');
    const allLogs = db.getDailyLogs() || [];
    const customHabits = db.getCustomHabits() || [];
    const allTasks = db.getTasks() || [];

    // Se não houver logs suficientes, inclui ao menos o dia atual
    const datesToExport = new Set(allLogs.map(l => l.log_date).filter(Boolean));
    datesToExport.add(today);

    for (const dStr of datesToExport) {
      const log = db.getDailyLog(dStr) || {};
      const dayTasks = allTasks.filter(t => t.due_date === dStr);
      
      let md = `---\n`;
      md += `date: ${dStr}\n`;
      md += `tags:\n  - daily-note\n  - nexus-command\n  - projeto-2027\n`;
      md += `---\n\n`;

      md += `# 🗓️ Registro Diário — ${dStr}\n\n`;

      // Hábitos
      md += `## ⚡ Hábitos & Rituais de Alta Performance\n`;
      for (const h of customHabits) {
        const isDone = log[h.id] === 1;
        md += `- [${isDone ? 'x' : ' '}] **${h.label}**\n`;
      }
      md += `\n`;

      // Tarefas
      md += `## 🎯 Tarefas Executadas\n`;
      if (dayTasks.length === 0) {
        md += `_Nenhuma tarefa registrada para esta data._\n`;
      } else {
        for (const t of dayTasks) {
          const isDone = t.status === 'Feito';
          md += `- [${isDone ? 'x' : ' '}] **${t.title}** \`#${t.category}\` (Prioridade: ${t.priority})\n`;
        }
      }
      md += `\n`;

      // Reflexões do Diário
      md += `## 🧘 Diário & Mentalidade\n`;
      md += `### Pelo que sou grato hoje?\n${log.reflection_gratitude || '_Nenhum registro._'}\n\n`;
      md += `### O que poderia ter sido melhor?\n${log.reflection_better || '_Nenhum registro._'}\n\n`;
      md += `### Principal aprendizado do dia\n${log.reflection_learning || '_Nenhum registro._'}\n\n`;
      if (log.journal_richtext) {
        md += `### 📝 Brain Dump & Anotações Livres\n${log.journal_richtext}\n\n`;
      }

      dailyFolder.file(`${dStr}.md`, md);
    }

    // 2. Pasta Finanças/
    const financeFolder = zip.folder('Finanças');
    const txs = db.getTransactions() || [];
    const subs = db.getSubscriptions() || [];
    const receitas = txs.filter(t => t.tx_type === 'Receita').reduce((a, b) => a + Number(b.amount || 0), 0);
    const gastos = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + Number(b.amount || 0), 0);
    const saldo = receitas - gastos;

    let finMd = `# 💰 Tesouraria & Fluxo de Caixa — Projeto 2027\n\n`;
    finMd += `*Relatório exportado em ${new Date().toLocaleDateString('pt-BR')}*\n\n`;
    finMd += `## 📊 Balanço Consolidado\n`;
    finMd += `- **Receitas Totais:** R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    finMd += `- **Despesas Totais:** R$ ${gastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
    finMd += `- **Saldo Líquido em Caixa:** R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n`;

    finMd += `## 🔄 Assinaturas Recorrentes\n`;
    finMd += `| Serviço | Valor Mensal | Ciclo | Status |\n`;
    finMd += `| :--- | :--- | :--- | :--- |\n`;
    for (const s of subs) {
      finMd += `| **${s.service_name}** | R$ ${Number(s.price).toFixed(2)} | ${s.billing_cycle} | ${s.status} |\n`;
    }
    finMd += `\n`;

    finMd += `## 📜 Extrato de Transações\n`;
    finMd += `| Data | Tipo | Descrição | Categoria | Valor |\n`;
    finMd += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const t of txs.slice(0, 50)) {
      finMd += `| ${t.tx_date || '-'} | ${t.tx_type} | ${t.title} | ${t.category} | R$ ${Number(t.amount).toFixed(2)} |\n`;
    }

    financeFolder.file('Balanço-Financeiro.md', finMd);

    // 3. Pasta Metas/
    const goalsFolder = zip.folder('Metas');
    const goals = db.getGoals() || [];
    let goalsMd = `# 🚀 Horizonte 2027 — Metas Estratégicas\n\n`;
    goalsMd += `> "A disciplina de hoje constrói o império de 2027."\n\n`;
    for (const g of goals) {
      const pct = g.target_value > 0 ? Math.round(((g.current_value || 0) / g.target_value) * 100) : 0;
      goalsMd += `### 🎯 ${g.title}\n`;
      goalsMd += `- **Eixo:** ${g.theme}\n`;
      goalsMd += `- **Ano Alvo:** ${g.target_year || 2027}\n`;
      goalsMd += `- **Progresso:** ${g.current_value || 0} / ${g.target_value} (${pct}%)\n`;
      goalsMd += `- **Status:** ${g.is_completed ? '✅ Concluída' : '⚡ Em Execução'}\n\n`;
    }
    goalsFolder.file('Visao-Estrategica-2027.md', goalsMd);

    // 4. Pasta Segundo Cérebro (Knowledge Hub)
    const secondBrainFolder = zip.folder('Segundo Cérebro');
    const notes = db.getKnowledgeItems() || [];
    for (const n of notes) {
      const safeTitle = (n.title || 'Nota').replace(/[/\\?%*:|"<>]/g, '-').slice(0, 40);
      let noteMd = `---\n`;
      noteMd += `title: "${n.title}"\n`;
      noteMd += `category: "${n.category || 'Ideias'}"\n`;
      noteMd += `type: "${n.item_type || 'Nota'}"\n`;
      noteMd += `tags:\n  - second-brain\n  - ${String(n.category || 'ideias').toLowerCase()}\n`;
      noteMd += `---\n\n`;
      noteMd += `# ${n.title}\n\n`;
      noteMd += `${n.content_or_url || ''}\n`;
      secondBrainFolder.file(`${safeTitle}.md`, noteMd);
    }

    // 5. Pasta Acervo Cultural/
    const mediaFolder = zip.folder('Acervo Cultural');
    const mediaList = db.getMediaCatalog() || [];
    let mediaMd = `# 📚 Acervo Cultural — Livros, Filmes & Séries\n\n`;
    mediaMd += `| Tipo | Título | Autor / Criador | Status | Progresso | Avaliação |\n`;
    mediaMd += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const m of mediaList) {
      const prog = m.total_pages > 1 ? `${m.current_page || 0}/${m.total_pages} págs` : '-';
      mediaMd += `| ${m.media_type} | **${m.title}** | ${m.creator || '-'} | ${m.status} | ${prog} | ${'⭐'.repeat(m.rating || 5)} |\n`;
    }
    mediaFolder.file('Catalogo-Cultural.md', mediaMd);

    // 6. Arquivo Raiz README.md
    const readmeMd = `# 💎 Obsidian Nexus Command — Vault Export
Exportação consolidada gerada automaticamente pelo **J.A.R.V.I.S. & Nexus Command**.

### 📁 Estrutura do Vault:
- \`Daily Notes/\`: Registros diários com tags, rituais e hábitos.
- \`Finanças/\`: Balanço geral de caixa e assinaturas.
- \`Metas/\`: Objetivos estratégicos para o horizonte 2027.
- \`Segundo Cérebro/\`: Notas, ideias e cadernos.
- \`Acervo Cultural/\`: Livros e filmes catalogados.
`;
    zip.file('README.md', readmeMd);

    // Gera o blob e dispara download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Obsidian_Nexus_Vault_${today}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);

    return true;
  }

  /**
   * Constrói e faz o download direto de um único arquivo Daily Note (.md) formatado para o Obsidian
   */
  static exportSingleDailyNote(dateStr = new Date().toISOString().split('T')[0]) {
    const log = db.getDailyLog(dateStr) || {};
    const customHabits = db.getCustomHabits() || [];
    const allTasks = db.getTasks() || [];
    const dayTasks = allTasks.filter(t => t.due_date === dateStr);

    let md = `---\n`;
    md += `date: ${dateStr}\n`;
    md += `tags:\n  - daily-note\n  - nexus-command\n  - projeto-2027\n`;
    md += `---\n\n`;

    md += `# 🗓️ Registro Diário — ${dateStr}\n\n`;

    // Hábitos
    md += `## ⚡ Hábitos & Rituais de Alta Performance\n`;
    if (customHabits.length === 0) {
      md += `_Nenhum hábito cadastrado._\n`;
    } else {
      for (const h of customHabits) {
        const isDone = log[h.id] === 1 || log[h.id] === true;
        md += `- [${isDone ? 'x' : ' '}] **${h.label}**\n`;
      }
    }
    md += `\n`;

    // Tarefas
    md += `## 🎯 Tarefas Executadas\n`;
    if (dayTasks.length === 0) {
      md += `_Nenhuma tarefa registrada para esta data._\n`;
    } else {
      for (const t of dayTasks) {
        const isDone = t.status === 'Feito';
        md += `- [${isDone ? 'x' : ' '}] **${t.title}** \`#${t.category}\` (Prioridade: ${t.priority})\n`;
      }
    }
    md += `\n`;

    // Telemetria de Saúde
    if (log.sleep_hours || log.water_liters || log.workout_duration_min || log.daily_weight_kg) {
      md += `## 🧬 Bio-Telemetria\n`;
      if (log.sleep_hours) md += `- **Sono:** ${log.sleep_hours} horas\n`;
      if (log.water_liters) md += `- **Hidratação:** ${log.water_liters}L\n`;
      if (log.workout_duration_min) md += `- **Treino:** ${log.workout_duration_min} min (${log.workout_type || 'Geral'})\n`;
      if (log.daily_weight_kg) md += `- **Peso:** ${log.daily_weight_kg} kg\n`;
      md += `\n`;
    }

    // Diário & Mentalidade
    md += `## 🧘 Diário & Mentalidade\n`;
    md += `### Pelo que sou grato hoje?\n${log.reflection_gratitude || '_Nenhum registro._'}\n\n`;
    md += `### O que poderia ter sido melhor?\n${log.reflection_better || '_Nenhum registro._'}\n\n`;
    md += `### Principal aprendizado do dia\n${log.reflection_learning || '_Nenhum registro._'}\n\n`;
    if (log.journal_richtext) {
      md += `### 📝 Brain Dump & Anotações Livres\n${log.journal_richtext}\n\n`;
    }

    if (typeof document !== 'undefined') {
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dateStr}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return md;
  }
}

