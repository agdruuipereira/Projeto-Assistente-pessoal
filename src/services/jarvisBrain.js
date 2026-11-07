/**
 * src/services/jarvisBrain.js
 * Motor de Intenções e Processamento de Linguagem Natural do J.A.R.V.I.S.
 * Permite controle total do ecossistema do Projeto 2027:
 * - Tarefas (Criar, Concluir, Atualizar, Excluir)
 * - Hábitos & Rotina Diária (Marcar, Criar, Consultar)
 * - Finanças & Tesouraria (Gastos, Receitas, Assinaturas, Saldo)
 * - Metas 2027 (Criar, Atualizar Progresso, Contagem Regressiva)
 * - Saúde & Bio-Métricas (Sono, Água, Treinos, Peso)
 * - Catálogo Cultural (Livros, Filmes, Séries, Progresso de Leitura)
 * - Segundo Cérebro & Cofre (Anotações, Ideias)
 * - Modo Foco / Pomodoro
 * - Navegação & Exportações (.ICS / Relatórios)
 */

import { db } from './db.js';
import { playTactileFeedback } from './haptics.js';
import { calculateUserXP, calculateUserBadges } from './gamification.js';
import { JarvisAIService } from './jarvisAI.js';
import { NotificationCenterService } from './notificationCenter.js';
import { UserGoalsService } from './userGoals.js';
import { ambientAudio } from './ambientAudio.js';

function notifyDataUpdated() {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    try {
      window.dispatchEvent(new CustomEvent('nexus_data_updated'));
      window.dispatchEvent(new CustomEvent('nexus_xp_update'));
    } catch (_) {}
  }
}

function stripAssistantPrefix(text) {
  if (!text || typeof text !== 'string') return '';
  const customName = UserGoalsService.getAssistantName().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const escaped = customName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = customName && customName !== 'jarvis'
    ? new RegExp(`^(?:(?:ei\\s+|ola\\s+|ok\\s+)?(?:jarvis|${escaped})[,.:]?\\s*)+`, 'i')
    : /^(?:(?:ei\s+|ola\\s+|ok\\s+)?jarvis[,.:]?\s*)+/i;
  return text.replace(pattern, '').trim();
}

function safeGetItem(key) {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch (_) {}
  }
  return null;
}

export class JarvisBrain {
  static lastProcessed = { text: '', time: 0, result: null };

  // Função principal de processamento de entrada com memória de diálogo
  static async processCommand(rawInput, conversationHistory = []) {
    if (!rawInput || typeof rawInput !== 'string') {
      return {
        speech: 'Aguardando instruções, Comandante. Você pode comandar tarefas, finanças, hábitos, saúde, metas 2027, livros ou o modo foco.',
        action: null,
        intent: 'UNKNOWN'
      };
    }

    const input = rawInput.trim();
    const now = Date.now();
    if (this.lastProcessed.text === input && (now - this.lastProcessed.time) < 1500 && this.lastProcessed.result) {
      return this.lastProcessed.result;
    }

    const normalized = input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove acentos para facilitar regex

    const executeAndCache = async () => {
      // 1. Briefing Matinal & Status Geral do Dia
      if (
        normalized.includes('bom dia') ||
        normalized.includes('briefing') ||
        normalized.includes('status do sistema') ||
        normalized.includes('status do dia') ||
        normalized.includes('relatorio do dia') ||
        normalized.includes('como estamos hoje')
      ) {
        return this.handleMorningBriefing();
      }

      // 2. Concluir Tarefa por Voz
      if (
        normalized.includes('concluir tarefa') ||
        normalized.includes('finalizar tarefa') ||
        normalized.includes('completar tarefa') ||
        normalized.includes('tarefa feita') ||
        normalized.includes('terminar tarefa') ||
        normalized.includes('conclui a tarefa')
      ) {
        return this.handleCompleteTask(input, normalized);
      }

      // 3. Excluir / Deletar Tarefa por Voz
      if (
        normalized.includes('excluir tarefa') ||
        normalized.includes('deletar tarefa') ||
        normalized.includes('remover tarefa') ||
        normalized.includes('apagar tarefa')
      ) {
        return this.handleDeleteTask(input, normalized);
      }

      // 4. Marcar Hábito como Concluído por Voz
      if (
        normalized.includes('concluir habito') ||
        normalized.includes('marcar habito') ||
        normalized.includes('fiz o habito') ||
        normalized.includes('cumpri o habito') ||
        normalized.includes('habito feito') ||
        normalized.includes('marquei que') ||
        normalized.includes('marquei o habito')
      ) {
        return this.handleCompleteHabit(input, normalized);
      }

      // 5. Criar Novo Hábito na Rotina Diária
      if (
        normalized.includes('criar habito') ||
        normalized.includes('adicionar habito') ||
        normalized.includes('novo habito')
      ) {
        return this.handleCreateHabit(input, normalized);
      }

      // 5.2 Excluir Hábito
      if (
        normalized.includes('excluir habito') ||
        normalized.includes('deletar habito') ||
        normalized.includes('remover habito') ||
        normalized.includes('apagar habito')
      ) {
        return this.handleDeleteHabit(input, normalized);
      }

      // 5.3 Editar / Renomear Hábito
      if (
        normalized.includes('editar habito') ||
        normalized.includes('renomear habito') ||
        normalized.includes('mudar habito') ||
        normalized.includes('mudar nome do habito')
      ) {
        return this.handleEditHabit(input, normalized);
      }

      // 6. Saúde: Registro de Sono ("dormi 8 horas", "meu sono foi de 7h")
      if (
        (normalized.includes('dormi') || normalized.includes('sono')) &&
        /\d+/.test(normalized)
      ) {
        return this.handleLogSleep(input, normalized);
      }

      // 7. Saúde: Registro de Ingestão de Água ("bebi 2 litros de água", "bebi 500ml")
      if (
        (normalized.includes('bebi') || normalized.includes('tomei')) &&
        (normalized.includes('agua') || normalized.includes('ml') || normalized.includes('litro'))
      ) {
        return this.handleLogWater(input, normalized);
      }

      // 8. Saúde: Registro de Treino / Exercício ("treinei 45 minutos", "corri 30 min")
      if (
        normalized.includes('treinei') ||
        normalized.includes('fiz treino') ||
        normalized.includes('corri') ||
        (normalized.includes('treino') && /\d+/.test(normalized))
      ) {
        return this.handleLogWorkout(input, normalized);
      }

      // 9. Saúde: Registro de Peso Corporal ("meu peso é 75kg", "pesei 80kg")
      if (
        normalized.includes('peso') && /\d+/.test(normalized) ||
        normalized.includes('pesei')
      ) {
        return this.handleLogWeight(input, normalized);
      }

      // 10. Consulta de Prioridades / Tarefas de Hoje
      if (
        normalized.includes('priorizar') ||
        normalized.includes('o que fazer hoje') ||
        normalized.includes('minhas tarefas') ||
        normalized.includes('tarefas de hoje') ||
        normalized.includes('tarefas pendentes') ||
        normalized.includes('o que tenho para fazer') ||
        normalized.includes('listar tarefas')
      ) {
        return this.handleTodayPriorities();
      }

      // 10.5. Consultoria Analítica: Auditoria de Hábitos Negligenciados
      if (
        normalized.includes('mais negligenciado') ||
        normalized.includes('mais falhei') ||
        normalized.includes('pior habito') ||
        normalized.includes('auditoria de habitos')
      ) {
        return this.handleHabitAudit();
      }

      // 11. Consulta de Hábitos Diários
      if (
        normalized.includes('habito') ||
        normalized.includes('habitos') ||
        normalized.includes('minha rotina')
      ) {
        return this.handleHabitsInquiry();
      }

      // 12. Contagem Regressiva para 2027
      if (
        normalized.includes('2027') &&
        (normalized.includes('tempo') || normalized.includes('falta') || normalized.includes('dias') || normalized.includes('contagem'))
      ) {
        return this.handleCountdown2027();
      }

      // 13. Metas 2027: Criar Meta ("criar meta de juntar 50 mil", "nova meta...")
      if (
        (normalized.includes('criar meta') || normalized.includes('nova meta') || normalized.includes('adicionar meta'))
      ) {
        return this.handleCreateGoal(input, normalized);
      }

      // 14. Metas 2027: Atualizar Progresso de Meta ("atualizar meta...", "avancar meta...")
      if (
        normalized.includes('atualizar meta') ||
        normalized.includes('avancar meta') ||
        normalized.includes('progresso na meta') ||
        normalized.includes('progresso da meta')
      ) {
        return this.handleUpdateGoal(input, normalized);
      }

      // 15. Leitura & Cinema: Adicionar Livro ("adicionar livro X", "novo livro...")
      if (
        normalized.includes('livro') &&
        (normalized.includes('adicionar') || normalized.includes('novo') || normalized.includes('ler') || normalized.includes('comprar') || normalized.includes('comprei') || normalized.includes('adquiri'))
      ) {
        return this.handleAddBook(input, normalized);
      }

      // 16. Leitura & Cinema: Adicionar Filme / Série ("adicionar filme X", "novo filme...")
      if (
        (normalized.includes('filme') || normalized.includes('serie')) &&
        (normalized.includes('adicionar') || normalized.includes('novo') || normalized.includes('nova') || normalized.includes('ver') || normalized.includes('assistir'))
      ) {
        return this.handleAddMovie(input, normalized);
      }

      // 17. Leitura & Cinema: Atualizar Progresso de Leitura ("li pagina 150", "estou na pagina 80")
      if (
        (normalized.includes('pagina') || normalized.includes('paginas')) &&
        (normalized.includes('li') || normalized.includes('estou') || normalized.includes('livro'))
      ) {
        return this.handleUpdateReading(input, normalized);
      }

      // 18. Nível de XP & Patente
      if (
        normalized.includes('meu nivel') ||
        normalized.includes('meu xp') ||
        normalized.includes('minha patente') ||
        normalized.includes('pontos de experiencia')
      ) {
        return this.handleXpStatus();
      }

      // 19. Finanças: Assinatura Recorrente ("adicionar assinatura netflix 55 reais")
      if (
        normalized.includes('assinatura') &&
        (normalized.includes('adicionar') || normalized.includes('nova') || normalized.includes('registrar') || normalized.includes('reais') || /\d+/.test(normalized))
      ) {
        return this.handleAddSubscriptionByVoice(input, normalized);
      }

      // 19.5. Consultoria Analítica: Gastos por Categoria
      if (
        normalized.includes('quanto gastei') ||
        normalized.includes('gastos com') ||
        normalized.includes('total gasto com')
      ) {
        return this.handleCategoryExpenseInquiry(input, normalized);
      }

      // 20. Finanças: Registro de Despesa / Receita em Linguagem Natural
      if (
        normalized.includes('adicionar gasto') ||
        normalized.includes('adicionar despesa') ||
        normalized.includes('registrar gasto') ||
        normalized.includes('novo gasto') ||
        normalized.includes('nova despesa') ||
        normalized.includes('adicionar receita') ||
        normalized.includes('registrar receita') ||
        normalized.includes('gastei') ||
        normalized.includes('paguei') ||
        normalized.includes('comprei') ||
        normalized.includes('recebi') ||
        normalized.includes('ganhei')
      ) {
        return this.handleAddTransactionByVoice(input, normalized);
      }

      // 21. Resumo Financeiro & Saldo
      if (
        normalized.includes('financa') ||
        normalized.includes('financas') ||
        normalized.includes('saldo') ||
        normalized.includes('quanto tenho') ||
        normalized.includes('despesas') ||
        normalized.includes('gastos do mes')
      ) {
        return this.handleFinancialSummary();
      }

      // 22. Criação & Agendamento de Tarefas no Calendário
      if (
        normalized.includes('adicionar tarefa') ||
        normalized.includes('criar tarefa') ||
        normalized.includes('nova tarefa') ||
        normalized.includes('agendar tarefa') ||
        normalized.includes('anotar tarefa') ||
        normalized.includes('marcar tarefa') ||
        normalized.includes('agendar no calendario') ||
        normalized.includes('marcar no calendario') ||
        normalized.includes('colocar no calendario') ||
        normalized.includes('agendar reuniao') ||
        normalized.includes('marcar reuniao') ||
        normalized.includes('agendar compromisso') ||
        normalized.includes('marcar compromisso') ||
        normalized.includes('agendar consulta') ||
        normalized.includes('marcar consulta') ||
        (normalized.startsWith('agendar ') && (normalized.includes('amanha') || normalized.includes('hoje') || normalized.includes('dia') || normalized.includes('feira') || normalized.includes(' as '))) ||
        (normalized.startsWith('marcar ') && (normalized.includes('amanha') || normalized.includes('hoje') || normalized.includes('dia') || normalized.includes('feira') || normalized.includes(' as ')))
      ) {
        return this.handleCreateTask(input, normalized);
      }

      // 22.2 Reagendamento / Adiar Tarefa no Calendário
      if (
        normalized.includes('adiar tarefa') ||
        normalized.includes('reagendar tarefa') ||
        normalized.includes('mudar data da tarefa') ||
        normalized.includes('mudar data de') ||
        normalized.includes('passar tarefa para') ||
        normalized.includes('mover tarefa para')
      ) {
        return this.handleRescheduleTask(input, normalized);
      }

      // 22.4 Consulta de Agenda / Compromissos no Calendário
      if (
        normalized.includes('compromissos') ||
        normalized.includes('agenda de amanha') ||
        normalized.includes('agendado para') ||
        normalized.includes('no calendario para') ||
        normalized.includes('minha agenda') ||
        (normalized.includes('o que tenho') && (normalized.includes('calendario') || normalized.includes('agenda') || normalized.includes('amanha')))
      ) {
        return this.handleCalendarInquiry(input, normalized);
      }

      // 22.6 Ondas Binaurais Neurais Diretas
      if (
        (normalized.includes('onda') || normalized.includes('binaural') || normalized.includes('frequencia')) &&
        (normalized.includes('gamma') || normalized.includes('beta') || normalized.includes('alpha') || normalized.includes('theta') || normalized.includes('ativar') || normalized.includes('ligar') || normalized.includes('tocar'))
      ) {
        return this.handleBinauralWaveCommand(input, normalized);
      }

      // 23. Salvar Nota ou Ideia Rápida no Cofre
      if (
        normalized.includes('anotar ideia') ||
        normalized.includes('salvar nota') ||
        normalized.includes('lembrar que') ||
        normalized.includes('anotar no cofre') ||
        normalized.includes('anotar')
      ) {
        return this.handleQuickNote(input);
      }

      // 24. Iniciar Pomodoro ou Modo Foco Total
      if (
        normalized.includes('iniciar pomodoro') ||
        normalized.includes('iniciar foco') ||
        normalized.includes('comecar foco') ||
        normalized.includes('abrir pomodoro') ||
        normalized.includes('modo foco')
      ) {
        const matchMin = normalized.match(/(\d+)\s*(?:minutos?|min)?/);
        const minutes = matchMin ? parseInt(matchMin[1], 10) : 25;
        return {
          intent: 'NAVIGATE',
          speech: `Iniciando Modo Foco Total por ${minutes} minutos. Reduzindo distrações sensoriais e ativando frequências binaurais. Boa sessão de hiperfoco, Comandante.`,
          action: {
            type: 'START_FOCUS',
            minutes: minutes,
            view: 'foco-total'
          }
        };
      }

      // 25. Exportação de Calendário .ICS
      if (
        normalized.includes('exportar calendario') ||
        normalized.includes('baixar calendario') ||
        normalized.includes('calendario ics') ||
        normalized.includes('exportar ics')
      ) {
        return {
          intent: 'EXPORT_CALENDAR',
          speech: 'Gerando arquivo de sincronização iCalendar (.ICS) contendo todas as suas tarefas e marcos estratégicos para o Google Calendar e Apple Calendar.',
          action: {
            type: 'EXPORT_CALENDAR'
          }
        };
      }

      // 26. Exportação de Relatório Executivo
      if (
        normalized.includes('exportar relatorio') ||
        normalized.includes('gerar relatorio') ||
        normalized.includes('relatorio executivo') ||
        normalized.includes('imprimir relatorio')
      ) {
        const isPdf = normalized.includes('pdf') || normalized.includes('imprimir');
        return {
          intent: 'EXPORT_REPORT',
          speech: isPdf
            ? 'Preparando telemetria executiva consolidada em formato para impressão e geração de PDF.'
            : 'Exportando relatório executivo de progresso e consistência em Markdown compatível com seu Obsidian Vault.',
          action: {
            type: 'EXPORT_REPORT',
            format: isPdf ? 'pdf' : 'markdown'
          }
        };
      }

      // 27. Exportação Completa de Obsidian Vault (.ZIP)
      if (
        normalized.includes('exportar obsidian') ||
        normalized.includes('exportar cofre') ||
        normalized.includes('exportar vault') ||
        normalized.includes('baixar obsidian') ||
        normalized.includes('obsidian zip')
      ) {
        return {
          intent: 'EXPORT_OBSIDIAN_VAULT',
          speech: 'Compilando e empacotando todo o ecossistema Nexus no formato nativo do Obsidian Vault (.ZIP). O download iniciará em instantes.',
          action: {
            type: 'EXPORT_OBSIDIAN_VAULT'
          }
        };
      }

      // 27.2 Exportação de Extrato Financeiro CSV
      if (
        normalized.includes('exportar extrato') ||
        normalized.includes('exportar financeiro') ||
        normalized.includes('extrato financeiro') ||
        normalized.includes('extrato csv') ||
        normalized.includes('baixar extrato')
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_export_finance_csv'));
        }
        return {
          intent: 'EXPORT_FINANCE_CSV',
          speech: 'Gerando extrato financeiro consolidado em formato CSV para planilhas. O download do arquivo foi iniciado, Comandante.',
          action: {
            type: 'EXPORT_FINANCE_CSV'
          }
        };
      }

      // 27.4 Backup Completo do Ecossistema JSON
      if (
        normalized.includes('backup completo') ||
        normalized.includes('backup do sistema') ||
        normalized.includes('fazer backup') ||
        normalized.includes('salvar backup') ||
        normalized.includes('gerar backup')
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_trigger_full_backup'));
        }
        return {
          intent: 'BACKUP_FULL_SYSTEM',
          speech: 'Compilando snapshot JSON completo de todas as tabelas e dados do Projeto 2027. O arquivo de backup foi gerado para custódia segura.',
          action: {
            type: 'BACKUP_FULL_SYSTEM'
          }
        };
      }

      // 27.6 Exportação Direta de Daily Note do Dia
      if (
        normalized.includes('daily note') ||
        normalized.includes('nota de hoje') ||
        normalized.includes('nota do dia') ||
        (normalized.includes('exportar reflexao') && normalized.includes('obsidian'))
      ) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_export_daily_note'));
        }
        return {
          intent: 'EXPORT_DAILY_NOTE',
          speech: 'Exportando nota diária formatada em Markdown com frontmatter, hábitos e reflexões do dia para o seu Obsidian.',
          action: {
            type: 'EXPORT_DAILY_NOTE'
          }
        };
      }

      // 27.8 Consulta de Medalhas e Conquistas Gamificadas
      if (
        normalized.includes('medalha') ||
        normalized.includes('conquista') ||
        normalized.includes('trofeu') ||
        normalized.includes('badges')
      ) {
        const badgesSummary = calculateUserBadges(
          db.getTasks(),
          db.getGoals(),
          db.getMediaCatalog(),
          db.getDailyLogs(),
          typeof localStorage !== 'undefined' ? Number(localStorage.getItem('foco_pomodoro_cycles_count') || 0) : 0,
          db.getTransactions(),
          db.getKnowledgeItems(),
          0
        );
        const nextBadge = badgesSummary.badges.find(b => !b.unlocked);
        let speech = `Comandante, você já desbloqueou ${badgesSummary.unlockedCount} de ${badgesSummary.totalBadges} medalhas de honra (${badgesSummary.percentage}% de conclusão).`;
        if (nextBadge) {
          speech += ` Sua próxima conquista ao alcance é "${nextBadge.title}": ${nextBadge.description} (progresso: ${nextBadge.current}/${nextBadge.target}).`;
        }
        return {
          intent: 'GET_ACHIEVEMENTS',
          speech,
          action: {
            type: 'GET_ACHIEVEMENTS',
            unlockedCount: badgesSummary.unlockedCount,
            totalBadges: badgesSummary.totalBadges
          }
        };
      }

      // 28. Consultoria Analítica: Projeção de Metas para 2027
      if (
        (normalized.includes('quanto tempo') || normalized.includes('quantos meses') || normalized.includes('projecao')) &&
        (normalized.includes('meta') || normalized.includes('bato') || normalized.includes('atingir'))
      ) {
        return this.handleGoalProjection();
      }

      // 28.5. Consulta e Personalização de Metas Pessoais (Livros, Água, Sono, Orçamento)
      if (
        (normalized.includes('meta de leitura') || normalized.includes('meta de livro') || normalized.includes('quantos livros')) ||
        (normalized.includes('meta de agua') || normalized.includes('teto de gasto') || normalized.includes('meta de economia'))
      ) {
        // Alterar meta de leitura
        const bookChangeMatch = normalized.match(/(?:mudar|alterar|definir|colocar)\s+(?:a\s+)?meta\s+de\s+(?:leitura|livros?)\s+(?:para\s+)?(\d+)/i);
        if (bookChangeMatch) {
          const newTarget = parseInt(bookChangeMatch[1], 10);
          UserGoalsService.setBooksTarget(newTarget);
          playTactileFeedback('level_up');
          return {
            intent: 'SET_USER_GOAL',
            speech: `Meta de leitura ajustada com sucesso para ${newTarget} livros, Comandante. Suas métricas do Acervo foram recalculadas.`,
            action: { type: 'SET_USER_GOAL', key: 'booksTarget', value: newTarget }
          };
        }

        // Alterar meta de água
        const waterChangeMatch = normalized.match(/(?:mudar|alterar|definir|colocar)\s+(?:a\s+)?meta\s+de\s+agua\s+(?:para\s+)?(\d+(?:[.,]\d+)?)/i);
        if (waterChangeMatch) {
          const newTarget = parseFloat(waterChangeMatch[1].replace(',', '.'));
          UserGoalsService.setWaterTarget(newTarget);
          playTactileFeedback('level_up');
          return {
            intent: 'SET_USER_GOAL',
            speech: `Meta diária de hidratação ajustada para ${newTarget} litros por dia.`,
            action: { type: 'SET_USER_GOAL', key: 'waterTarget', value: newTarget }
          };
        }

        // Alterar teto de gastos
        const budgetChangeMatch = normalized.match(/(?:mudar|alterar|definir|colocar)\s+(?:o\s+)?teto\s+de\s+gastos?\s+(?:para\s+)?(\d+)/i);
        if (budgetChangeMatch) {
          const newTarget = parseInt(budgetChangeMatch[1], 10);
          UserGoalsService.setMonthlyBudget(newTarget);
          playTactileFeedback('level_up');
          return {
            intent: 'SET_USER_GOAL',
            speech: `Teto de gastos mensal fixado em R$ ${newTarget.toLocaleString('pt-BR')}.`,
            action: { type: 'SET_USER_GOAL', key: 'monthlyBudget', value: newTarget }
          };
        }

        // Consulta de meta de leitura
        if (normalized.includes('leitura') || normalized.includes('livro')) {
          const bTarget = UserGoalsService.getBooksTarget();
          const booksRead = (db.getMediaCatalog() || []).filter(m => m.media_type === 'Livro' && m.status === 'Lido').length;
          return {
            intent: 'GET_USER_GOAL',
            speech: `Sua meta de leitura atual é de ${bTarget} livros até 2027. Você já concluiu ${booksRead} obra(s) (${Math.round((booksRead / bTarget) * 100)}% da meta).`,
            action: { type: 'GET_USER_GOAL', key: 'booksTarget', value: bTarget }
          };
        }

        // Consulta de meta de água
        if (normalized.includes('agua')) {
          const wTarget = UserGoalsService.getWaterTarget();
          return {
            intent: 'GET_USER_GOAL',
            speech: `Sua meta diária de hidratação está configurada para ${wTarget} litros de água por dia.`,
            action: { type: 'GET_USER_GOAL', key: 'waterTarget', value: wTarget }
          };
        }
      }

      // 28.7 Consulta ou Alteração do Nome da IA / Assistente
      if (
        normalized.includes('qual e o seu nome') ||
        normalized.includes('como voce se chama') ||
        normalized.includes('qual seu nome') ||
        normalized.includes('seu nome') ||
        normalized.includes('mudar nome') ||
        normalized.includes('trocar nome') ||
        normalized.includes('alterar nome') ||
        normalized.includes('nome da ia') ||
        normalized.includes('nome do assistente') ||
        normalized.includes('chamar de')
      ) {
        const changeNameMatch = normalized.match(/(?:mudar|alterar|definir|trocar)\s+(?:o\s+)?(?:seu\s+)?nome\s+(?:para\s+)?([a-z0-9_-]+)/i) ||
                                normalized.match(/(?:chamar|chame)\s+(?:voce\s+de\s+|de\s+)([a-z0-9_-]+)/i);
        if (changeNameMatch) {
          const rawName = changeNameMatch[1].trim();
          const cleanName = rawName.toUpperCase();
          UserGoalsService.setAssistantName(cleanName);
          playTactileFeedback('level_up');
          return {
            intent: 'SET_ASSISTANT_NAME',
            speech: `Entendido, Comandante. Minha matriz foi reconfigurada e meu nome operacional agora é ${cleanName}.`,
            action: { type: 'SET_ASSISTANT_NAME', name: cleanName }
          };
        }

        const currentName = UserGoalsService.getAssistantName();
        return {
          intent: 'GET_ASSISTANT_NAME',
          speech: `Meu nome operacional é ${currentName}, sua inteligência artificial e copiloto tático. Você pode me chamar como preferir configurando um novo nome a qualquer momento.`,
          action: { type: 'GET_ASSISTANT_NAME', name: currentName }
        };
      }

      // 26.8 Alternância do Modo Ultra-Clean / Visão Essencial
      if (
        normalized.includes('modo clean') ||
        normalized.includes('modo essencial') ||
        normalized.includes('modo minimalista') ||
        normalized.includes('visao essencial') ||
        normalized.includes('visao completa') ||
        normalized.includes('modo completo')
      ) {
        const isDisabling = normalized.includes('desativar') || 
                            normalized.includes('desligar') || 
                            normalized.includes('sair do') || 
                            normalized.includes('visao completa') || 
                            normalized.includes('modo completo');
        const enableClean = !isDisabling;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('projeto_ultra_clean', enableClean ? 'true' : 'false');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nexus_toggle_ultra_clean', { detail: { isUltraClean: enableClean } }));
        }
        playTactileFeedback(enableClean ? 'level_up' : 'uncheck');
        return {
          intent: 'SET_CLEAN_MODE',
          speech: enableClean
            ? 'Modo Essencial ativado, Comandante. Otimizando layout para máxima clareza e eliminação de ruído cognitivo.'
            : 'Visão Completa restaurada. Todos os painéis, métricas aprofundadas e ferramentas complementares estão visíveis.',
          action: {
            type: 'SET_CLEAN_MODE',
            isUltraClean: enableClean
          }
        };
      }

      // 27. Navegação entre Telas
      const navMatch = this.handleNavigation(normalized);
      if (navMatch) {
        return navMatch;
      }

      // 28. Gerenciamento e Consulta da Central de Notificações & Não Incomodar
      if (
        normalized.includes('notific') ||
        normalized.includes('nao incomodar') ||
        normalized.includes('silenciar alertas') ||
        normalized.includes('modo dnd')
      ) {
        if (normalized.includes('limpar') || normalized.includes('ler todas') || normalized.includes('marcar como lid')) {
          NotificationCenterService.markAllAsRead();
          playTactileFeedback('check');
          return {
            intent: 'CLEAR_NOTIFICATIONS',
            speech: 'Todas as notificações foram marcadas como lidas, Comandante. Sua Central de Alertas está 100% limpa.',
            action: { type: 'CLEAR_NOTIFICATIONS' }
          };
        }

        if (normalized.includes('ativar') || normalized.includes('ligar') || normalized.includes('silenciar')) {
          NotificationCenterService.setManualDND(true);
          playTactileFeedback('check');
          return {
            intent: 'SET_DND',
            speech: 'Modo Não Incomodar ativado, Comandante. Alertas sonoros e visuais secundários foram suspensos.',
            action: { type: 'SET_DND', enabled: true }
          };
        }

        if (normalized.includes('desativar') || normalized.includes('desligar') || normalized.includes('reativar')) {
          NotificationCenterService.setManualDND(false);
          playTactileFeedback('check');
          return {
            intent: 'SET_DND',
            speech: 'Modo Não Incomodar desativado. Alertas e notificações operacionais restabelecidos.',
            action: { type: 'SET_DND', enabled: false }
          };
        }

        // Consulta de notificações pendentes
        const notifications = NotificationCenterService.getNotifications();
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) {
          return {
            intent: 'GET_NOTIFICATIONS',
            speech: 'Você não possui notificações pendentes no momento, Comandante. Todos os sistemas operando normalmente.',
            action: { type: 'GET_NOTIFICATIONS', count: 0 }
          };
        }

        const preview = unread.slice(0, 2).map(n => `"${n.title}"`).join(' e ');
        return {
          intent: 'GET_NOTIFICATIONS',
          speech: `Comandante, você possui ${unread.length} notificação(ões) pendente(s) na sua Central, incluindo ${preview}. Deseja que eu as marque como lidas?`,
          action: { type: 'GET_NOTIFICATIONS', count: unread.length, items: unread }
        };
      }

      // 29. Pergunta sobre Identidade & Capacidades
      if (
        normalized.includes('quem e voce') ||
        normalized.includes('o que voce faz') ||
        normalized.includes('comandos') ||
        normalized.includes('ajuda') ||
        normalized.includes('capacidades')
      ) {
        return {
          intent: 'CAPABILITIES',
          speech: 'Sou J.A.R.V.I.S., sua inteligência de comando central para o Projeto 2027. Posso gerenciar tarefas, marcar hábitos, registrar receitas e despesas, acompanhar assinaturas, monitorar sono e água, catalogar livros e filmes, criar e atualizar metas para 2027, ativar o Modo Foco e gerar relatórios. Em qual módulo deseja atuar agora, Senhor?',
          action: null
        };
      }

      // 29. Conexão com IA Generativa (Google Gemini Neural) com memória contínua
      if (JarvisAIService.isConfigured()) {
        try {
          const aiResponse = await JarvisAIService.queryAI(input, conversationHistory);

          // Extrai bloco de ação executável, se fornecido pela IA
          const actionMatch = aiResponse.match(/```(?:action|json)?\s*([\s\S]*?)\s*```/i);
          let cleanSpeech = aiResponse.replace(/```(?:action|json)?[\s\S]*?```/gi, '').trim();
          let executedAction = null;

          if (actionMatch) {
            try {
              const rawAction = actionMatch[1].trim();
              if (rawAction.startsWith('{') && rawAction.endsWith('}')) {
                const actionData = JSON.parse(rawAction);
                executedAction = this.executeAction(actionData);
              }
            } catch (e) {
              console.warn('[J.A.R.V.I.S. Action Parse Error]', e);
            }
          }

          return {
            intent: 'AI_REASONING',
            speech: cleanSpeech || aiResponse,
            action: executedAction
          };
        } catch (err) {
          console.warn('[J.A.R.V.I.S. AI Fallback]', err);
          return {
            intent: 'AI_ERROR',
            speech: `Comandante, identifiquei uma oscilação na rede neural: ${err.message}. Alternando para o protocolo tático local.`,
            action: null
          };
        }
      }

      // 30. Fallback Tático Local (Sem Chave de API)
      return {
        intent: 'FALLBACK',
        speech: `Comando registrado: "${input}". Posso criar uma tarefa, registrar despesa, marcar hábito ou navegar pelo sistema. Para raciocínio livre irrestrito, conecte sua chave do Google Gemini em Configurações.`,
        action: {
          type: 'SUGGEST_ACTION',
          text: input
        }
      };
    };

    const result = await executeAndCache();
    this.lastProcessed = { text: input, time: now, result };
    return result;
  }

  // --------------------------------------------------------------------------
  // HANDLERS LOCAIS ESPECÍFICOS DO ECOSSISTEMA
  // --------------------------------------------------------------------------

  // Briefing Matinal Completo
  static handleMorningBriefing() {
    let userName = 'Alexandre';
    try {
      const saved = safeGetItem('nexus_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) userName = parsed.name;
      }
    } catch (_) {}

    const today = new Date().toISOString().split('T')[0];
    const tasks = db.getTasks().filter(t => t.due_date === today && t.status !== 'Feito');
    const highPriorityTasks = tasks.filter(t => t.priority === 'Alta');

    const dailyLog = db.getDailyLog(today);
    const customHabits = db.getCustomHabits();
    const completedHabits = customHabits.filter(h => dailyLog[h.id]).length;
    const totalHabits = customHabits.length;

    const txs = db.getTransactions();
    const receitas = txs.filter(t => t.tx_type === 'Receita').reduce((a, b) => a + Number(b.amount || 0), 0);
    const gastos = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + Number(b.amount || 0), 0);
    const saldo = receitas - gastos;

    let speech = `Bom dia, Comandante ${userName}. Todos os subsistemas do Projeto 2027 estão operacionais. `;
    speech += `Você possui ${tasks.length} tarefa(s) pendente(s) para hoje`;
    if (highPriorityTasks.length > 0) {
      speech += `, sendo prioridade máxima: "${highPriorityTasks[0].title}". `;
    } else {
      speech += '. ';
    }

    speech += `Nos hábitos, você completou ${completedHabits} de ${totalHabits}. `;
    speech += `Saldo atual em caixa de R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. `;
    speech += 'Deseja iniciar pelas prioridades do dia ou entrar no Modo Foco?';

    return {
      intent: 'BRIEFING',
      speech,
      action: {
        type: 'BRIEFING_GENERATED',
        data: { tasksCount: tasks.length, completedHabits, totalHabits, saldo }
      }
    };
  }

  // Concluir Tarefa por Voz
  static handleCompleteTask(originalInput, normalized) {
    const tasks = db.getTasks();
    const pendingTasks = tasks.filter(t => t.status !== 'Feito');

    let cleanTarget = normalized
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(concluir|finalizar|completar|terminar|conclui)\s+tarefa\s*/i, '')
      .replace(/\s+feita$/i, '')
      .trim();

    let matched = null;
    if (cleanTarget) {
      matched = pendingTasks.find(t => 
        t.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cleanTarget)
      );
    }

    if (!matched && pendingTasks.length > 0) {
      matched = pendingTasks[0];
    }

    if (!matched) {
      return {
        intent: 'TASK_NOT_FOUND',
        speech: 'Não encontrei nenhuma tarefa pendente correspondente para concluir.',
        action: null
      };
    }

    db.updateTask(matched.id, { status: 'Feito' });
    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'TASK_COMPLETED',
      speech: `Confirmado, Comandante. A tarefa "${matched.title}" foi marcada como concluída com sucesso. Excelente progresso!`,
      action: {
        type: 'TASK_UPDATED',
        task: matched
      }
    };
  }

  // Excluir Tarefa por Voz
  static handleDeleteTask(originalInput, normalized) {
    const tasks = db.getTasks();
    let cleanTarget = normalized
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(excluir|deletar|remover|apagar)\s+tarefa\s*/i, '')
      .trim();

    let matched = tasks.find(t =>
      t.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cleanTarget)
    );

    if (!matched) {
      return {
        intent: 'TASK_NOT_FOUND',
        speech: 'Não localizei a tarefa que solicitou remover.',
        action: null
      };
    }

    db.deleteTask(matched.id);
    playTactileFeedback('uncheck');
    notifyDataUpdated();

    return {
      intent: 'TASK_DELETED',
      speech: `Comandante, a tarefa "${matched.title}" foi excluída permanentemente da sua fila.`,
      action: {
        type: 'TASK_DELETED',
        id: matched.id
      }
    };
  }

  // Marcar Hábito como Concluído por Voz
  static handleCompleteHabit(originalInput, normalized) {
    const today = new Date().toISOString().split('T')[0];
    const customHabits = db.getCustomHabits();
    const dailyLog = db.getDailyLog(today);

    let matchedHabit = null;

    // Mapeamento semântico rápido para hábitos padrão
    if (normalized.includes('leitura') || normalized.includes('ler') || normalized.includes('livro')) {
      matchedHabit = customHabits.find(h => h.id === 'h_read_30m' || h.label.toLowerCase().includes('ler'));
    } else if (normalized.includes('agua') || normalized.includes('hidratacao')) {
      matchedHabit = customHabits.find(h => h.id === 'h_water_2l' || h.label.toLowerCase().includes('agua'));
    } else if (normalized.includes('sono') || normalized.includes('dormir')) {
      matchedHabit = customHabits.find(h => h.id === 'h_sleep_8h' || h.label.toLowerCase().includes('dormir') || h.label.toLowerCase().includes('sono'));
    } else if (normalized.includes('treino') || normalized.includes('exercicio') || normalized.includes('musculacao') || normalized.includes('academia')) {
      matchedHabit = customHabits.find(h => h.id === 'h_exercise_1h' || h.label.toLowerCase().includes('exercitar') || h.label.toLowerCase().includes('treino'));
    } else if (normalized.includes('dieta') || normalized.includes('alimentacao')) {
      matchedHabit = customHabits.find(h => h.id === 'h_healthy_diet' || h.label.toLowerCase().includes('dieta'));
    } else if (normalized.includes('matinal') || normalized.includes('manha')) {
      matchedHabit = customHabits.find(h => h.id === 'h_morning_routine' || h.label.toLowerCase().includes('matinal'));
    } else if (normalized.includes('planejar') || normalized.includes('amanha')) {
      matchedHabit = customHabits.find(h => h.id === 'h_plan_tomorrow' || h.label.toLowerCase().includes('planejar'));
    }

    if (!matchedHabit) {
      for (const h of customHabits) {
        const hNorm = h.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const keywords = hNorm.split(/\s+/).filter(w => w.length > 2);
        if (normalized.includes(hNorm) || keywords.some(k => normalized.includes(k))) {
          matchedHabit = h;
          break;
        }
      }
    }

    if (!matchedHabit) {
      matchedHabit = customHabits.find(h => !dailyLog[h.id]);
    }

    if (!matchedHabit && customHabits.length > 0) {
      matchedHabit = customHabits[0];
    }

    if (!matchedHabit) {
      return {
        intent: 'HABIT_NOT_FOUND',
        speech: 'Não identifiquei nenhum hábito registrado para atualizar no momento.',
        action: null
      };
    }

    const updatedLog = {
      ...dailyLog,
      log_date: today,
      [matchedHabit.id]: 1
    };

    db.saveDailyLog(updatedLog);
    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'HABIT_COMPLETED',
      speech: `Excelente, Comandante. O hábito "${matchedHabit.label}" foi marcado como concluído no seu registro diário.`,
      action: {
        type: 'HABIT_UPDATED',
        habit: matchedHabit
      }
    };
  }

  // Criar Novo Hábito Customizado
  static handleCreateHabit(originalInput, normalized) {
    let clean = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(criar|adicionar|novo)\s+habito\s+(?:de\s+)?/i, '')
      .trim();

    if (!clean) clean = 'Novo Hábito Tático';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    const habits = db.getCustomHabits();
    const newHabit = {
      id: 'h_' + Date.now(),
      label: clean,
      icon: 'check_circle'
    };
    habits.push(newHabit);
    db.saveCustomHabits(habits);
    playTactileFeedback('level_up');
    notifyDataUpdated();

    return {
      intent: 'HABIT_CREATED',
      speech: `Novo hábito de disciplina incorporado à sua rotina: "${clean}".`,
      action: {
        type: 'NAVIGATE',
        view: 'hub-diario'
      }
    };
  }

  // Localizador inteligente e semântico de hábitos
  static findHabitByQuery(habits, query) {
    if (!query) return null;
    const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 1. Correspondência direta por título ou ID
    let matched = habits.find(h =>
      h.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q) ||
      h.id.toLowerCase().includes(q)
    );
    if (matched) return matched;

    // 2. Mapeamento semântico avançado
    if (q.includes('leitura') || q.includes('ler') || q.includes('livro')) {
      return habits.find(h => h.id === 'h_read_30m' || h.label.toLowerCase().includes('ler'));
    }
    if (q.includes('agua') || q.includes('hidratacao')) {
      return habits.find(h => h.id === 'h_water_2l' || h.label.toLowerCase().includes('agua'));
    }
    if (q.includes('sono') || q.includes('dormir')) {
      return habits.find(h => h.id === 'h_sleep_8h' || h.label.toLowerCase().includes('dormir') || h.label.toLowerCase().includes('sono'));
    }
    if (q.includes('treino') || q.includes('exercicio') || q.includes('musculacao') || q.includes('academia')) {
      return habits.find(h => h.id === 'h_exercise_1h' || h.label.toLowerCase().includes('exercitar') || h.label.toLowerCase().includes('treino'));
    }
    if (q.includes('dieta') || q.includes('alimentacao')) {
      return habits.find(h => h.id === 'h_healthy_diet' || h.label.toLowerCase().includes('dieta'));
    }
    if (q.includes('manha') || q.includes('matinal')) {
      return habits.find(h => h.id === 'h_morning_routine' || h.label.toLowerCase().includes('matinal'));
    }
    if (q.includes('planejar') || q.includes('dia seguinte')) {
      return habits.find(h => h.id === 'h_plan_tomorrow' || h.label.toLowerCase().includes('planejar'));
    }
    if (q.includes('meditar') || q.includes('meditacao')) {
      return habits.find(h => h.label.toLowerCase().includes('meditar') || h.label.toLowerCase().includes('meditacao'));
    }
    return null;
  }

  // Excluir Hábito Customizado
  static handleDeleteHabit(originalInput, normalized) {
    const habits = db.getCustomHabits();
    let cleanTarget = normalized
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(excluir|deletar|remover|apagar)\s+(?:o\s+)?habito\s+(?:de\s+)?/i, '')
      .trim();

    const matched = this.findHabitByQuery(habits, cleanTarget);

    if (matched) {
      db.deleteCustomHabit(matched.id);
      playTactileFeedback('uncheck');
      notifyDataUpdated();
      return {
        intent: 'HABIT_DELETED',
        speech: `Comandante, o hábito "${matched.label}" foi excluído da sua rotina diária.`,
        action: {
          type: 'DELETE_HABIT',
          target: matched.id
        }
      };
    }

    return {
      intent: 'HABIT_NOT_FOUND',
      speech: `Não localizei o hábito "${cleanTarget}" para exclusão. Verifique os hábitos cadastrados no Hub Diário.`,
      action: { type: 'NAVIGATE', view: 'hub-diario' }
    };
  }

  // Editar / Renomear Hábito Customizado
  static handleEditHabit(originalInput, normalized) {
    const habits = db.getCustomHabits();
    const match = normalized.match(/(?:editar|renomear|mudar|alterar)\s+(?:o\s+)?(?:nome\s+do\s+)?habito\s+(?:de\s+)?(.+?)\s+(?:para|por)\s+(.+)/i);
    if (match) {
      const searchTarget = match[1].trim();
      const matchOriginal = originalInput.match(/(?:editar|renomear|mudar|alterar)\s+(?:o\s+)?(?:nome\s+do\s+)?h[aá]bito\s+(?:de\s+)?(.+?)\s+(?:para|por)\s+(.+)/i);
      const rawNewName = matchOriginal ? matchOriginal[2].trim() : match[2].trim();
      const newName = rawNewName.charAt(0).toUpperCase() + rawNewName.slice(1);

      const matched = this.findHabitByQuery(habits, searchTarget);

      if (matched) {
        db.updateCustomHabit(matched.id, { label: newName });
        playTactileFeedback('check');
        notifyDataUpdated();
        return {
          intent: 'HABIT_UPDATED',
          speech: `Afirmativo, Comandante. O hábito "${matched.label}" foi renomeado para "${newName}".`,
          action: {
            type: 'UPDATE_HABIT',
            target: matched.id,
            label: newName
          }
        };
      }
    }

    return {
      intent: 'HABIT_NOT_FOUND',
      speech: 'Comandante, para editar um hábito, você pode dizer: "Renomear hábito [antigo] para [novo]".',
      action: { type: 'NAVIGATE', view: 'hub-diario' }
    };
  }

  // Saúde: Registro de Sono
  static handleLogSleep(originalInput, normalized) {
    const match = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:h|horas?)?/);
    const hours = match ? parseFloat(match[1].replace(',', '.')) : 8;
    const today = new Date().toISOString().split('T')[0];

    db.saveHealthMetric({
      date: today,
      sleep_hours: hours
    });

    // Se dormiu pelo menos 7.5h, marca também o hábito de sono se existir
    if (hours >= 7.5) {
      const dailyLog = db.getDailyLog(today);
      dailyLog.h_sleep_8h = 1;
      db.saveDailyLog(dailyLog);
    }

    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'HEALTH_LOGGED',
      speech: `Registro de sono bio-métrico efetuado: ${hours} horas computadas para recuperação neuromuscular.`,
      action: {
        type: 'NAVIGATE',
        view: 'saude'
      }
    };
  }

  // Saúde: Registro de Água
  static handleLogWater(originalInput, normalized) {
    let liters = 2.0;
    const matchL = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:l|litros?)/);
    const matchMl = normalized.match(/(\d+)\s*ml/);

    if (matchMl) {
      liters = parseFloat(matchMl[1]) / 1000;
    } else if (matchL) {
      liters = parseFloat(matchL[1].replace(',', '.'));
    }

    const today = new Date().toISOString().split('T')[0];
    db.saveHealthMetric({
      date: today,
      water_liters: liters
    });

    if (liters >= 2.0) {
      const dailyLog = db.getDailyLog(today);
      dailyLog.h_water_2l = 1;
      db.saveDailyLog(dailyLog);
    }

    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'HEALTH_LOGGED',
      speech: `Telemetria de hidratação atualizada: ${liters}L de água registrados. Manutenção do foco e cognição assegurados.`,
      action: {
        type: 'NAVIGATE',
        view: 'saude'
      }
    };
  }

  // Saúde: Registro de Treino Enriquecido (Minutos, Grupamento, Intensidade & Calorias)
  static handleLogWorkout(originalInput, normalized) {
    const matchMin = normalized.match(/(\d+)\s*(?:minutos?|min)?/);
    const minutes = matchMin ? parseInt(matchMin[1], 10) : 45;

    let workoutType = 'Musculação';
    if (normalized.includes('corrida') || normalized.includes('corri') || normalized.includes('esteira')) workoutType = 'Corrida';
    else if (normalized.includes('ciclismo') || normalized.includes('pedal') || normalized.includes('bike')) workoutType = 'Ciclismo';
    else if (normalized.includes('natacao') || normalized.includes('nadar')) workoutType = 'Natação';
    else if (normalized.includes('luta') || normalized.includes('artes marciais') || normalized.includes('boxe') || normalized.includes('jiu')) workoutType = 'Luta';
    else if (normalized.includes('yoga') || normalized.includes('alongamento') || normalized.includes('mobilidade')) workoutType = 'Yoga / Mobilidade';

    let workoutIntensity = 'Moderado';
    let factor = 1.0;
    if (normalized.includes('leve') || normalized.includes('suave')) {
      workoutIntensity = 'Leve';
      factor = 0.8;
    } else if (normalized.includes('intenso') || normalized.includes('pesado') || normalized.includes('puxado')) {
      workoutIntensity = 'Intenso';
      factor = 1.25;
    } else if (normalized.includes('maximo') || normalized.includes('alta performance') || normalized.includes('extremo')) {
      workoutIntensity = 'Alta Performance';
      factor = 1.5;
    }

    let workoutFocus = 'Full Body';
    if (normalized.includes('peito') || normalized.includes('triceps')) workoutFocus = 'Peito & Tríceps';
    else if (normalized.includes('costas') || normalized.includes('biceps')) workoutFocus = 'Costas & Bíceps';
    else if (normalized.includes('perna') || normalized.includes('gluteo') || normalized.includes('inferiores')) workoutFocus = 'Pernas & Glúteos';
    else if (normalized.includes('ombro') || normalized.includes('trapezio')) workoutFocus = 'Ombros & Trapézio';
    else if (normalized.includes('abdomen') || normalized.includes('core')) workoutFocus = 'Abdômen & Core';
    else if (normalized.includes('cardio') || normalized.includes('hit')) workoutFocus = 'Cardio / HIT';

    const userWeight = UserGoalsService.getTargetWeight() || 75;
    let baseMET = 6.0;
    if (workoutType === 'Corrida') baseMET = 9.5;
    else if (workoutType === 'Ciclismo') baseMET = 8.0;
    else if (workoutType === 'Natação') baseMET = 8.5;
    else if (workoutType === 'Luta') baseMET = 10.0;
    else if (workoutType === 'Yoga / Mobilidade') baseMET = 3.5;

    const estimatedCalories = Math.round((minutes / 60) * baseMET * userWeight * factor * 0.95);

    const today = new Date().toISOString().split('T')[0];
    db.saveHealthMetric({
      date: today,
      workout_type: workoutType,
      workout_minutes: minutes,
      workout_intensity: workoutIntensity,
      workout_focus: workoutFocus,
      calories_burned: estimatedCalories
    });

    const dailyLog = db.getDailyLog(today);
    dailyLog.h_exercise_1h = 1;
    db.saveDailyLog(dailyLog);

    playTactileFeedback('level_up');
    notifyDataUpdated();

    return {
      intent: 'HEALTH_LOGGED',
      speech: `Excelente, Comandante. Sessão de ${workoutType} de ${minutes} minutos (${workoutFocus}, intensidade ${workoutIntensity}) registrada com sucesso! ~${estimatedCalories} kcal computadas.`,
      action: {
        type: 'NAVIGATE',
        view: 'saude'
      }
    };
  }

  // Saúde: Registro de Peso
  static handleLogWeight(originalInput, normalized) {
    const matchWeight = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:k|kg|quilos?)?/);
    const weight = matchWeight ? parseFloat(matchWeight[1].replace(',', '.')) : 75;
    const today = new Date().toISOString().split('T')[0];

    db.saveHealthMetric({
      date: today,
      weight: weight
    });

    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'HEALTH_LOGGED',
      speech: `Peso corporal registrado em ${weight} kg na sua telemetria de bio-hacking.`,
      action: {
        type: 'NAVIGATE',
        view: 'saude'
      }
    };
  }

  // Metas 2027: Criar Meta
  static handleCreateGoal(originalInput, normalized) {
    const matchTarget = originalInput.match(/(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais|k|mil)?/i);
    let targetVal = 100;
    if (matchTarget) {
      let val = parseFloat(matchTarget[1].replace(',', '.'));
      if (originalInput.toLowerCase().includes('mil') && val < 1000) val *= 1000;
      targetVal = val;
    }

    let clean = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(criar|adicionar|nova)\s+meta\s+(?:de\s+)?/i, '')
      .trim();

    if (!clean) clean = 'Meta Estratégica 2027';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    let theme = 'Profissional';
    if (normalized.includes('reais') || normalized.includes('dinheiro') || normalized.includes('juntar') || normalized.includes('investir')) {
      theme = 'Financeiro';
    } else if (normalized.includes('peso') || normalized.includes('correr') || normalized.includes('saude')) {
      theme = 'Saúde';
    }

    const newGoal = db.createGoal({
      title: clean,
      target_value: targetVal,
      current_value: 0,
      theme: theme,
      target_year: 2027
    });

    playTactileFeedback('level_up');
    notifyDataUpdated();

    return {
      intent: 'GOAL_CREATED',
      speech: `Nova meta para o horizonte 2027 estabelecida: "${clean}" com objetivo de ${targetVal} (${theme}). Rumo ao topo, Senhor.`,
      action: {
        type: 'NAVIGATE',
        view: 'metas'
      }
    };
  }

  // Metas 2027: Atualizar Progresso de Meta
  static handleUpdateGoal(originalInput, normalized) {
    const goals = db.getGoals();
    const matchVal = originalInput.match(/para\s*(\d+(?:[.,]\d+)?)/i) || originalInput.match(/(\d+(?:[.,]\d+)?)(?!.*\d)/);
    const progressVal = matchVal ? parseFloat(matchVal[1].replace(',', '.')) : null;

    let clean = normalized
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(atualizar|avancar|progresso\s+na|progresso\s+da)\s+meta\s*/i, '')
      .replace(/\s*para\s*\d+.*$/i, '')
      .trim();

    let matched = goals.find(g =>
      g.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(clean)
    );

    if (!matched && clean) {
      const words = clean.split(/\s+/).filter(w => w.length > 3);
      matched = goals.find(g => {
        const gNorm = g.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return words.some(w => gNorm.includes(w));
      });
    }

    if (!matched && goals.length > 0) matched = goals[0];

    if (!matched || progressVal === null) {
      return {
        intent: 'GOAL_NOT_FOUND',
        speech: 'Por favor, indique a meta e o novo valor de progresso. Exemplo: "Atualizar meta Reserva para 15000".',
        action: null
      };
    }

    db.updateGoal(matched.id, { current_value: progressVal });
    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'GOAL_UPDATED',
      speech: `Meta "${matched.title}" atualizada para ${progressVal}/${matched.target_value}. Excelente avanço rumo a 2027!`,
      action: {
        type: 'NAVIGATE',
        view: 'metas'
      }
    };
  }

  // Leitura & Cinema: Adicionar Livro
  static handleAddBook(originalInput, normalized) {
    let clean = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(adicionar|novo|quero ler|ler|comprei|adquiri)\s+(?:o\s+)?livro\s+(?:de\s+|do\s+)?/i, '')
      .trim();

    if (!clean) clean = 'Obra Sem Título';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    const newMedia = db.createMedia({
      title: clean,
      media_type: 'Livro',
      creator: '',
      status: 'Em leitura',
      total_pages: 300,
      current_page: 0
    });

    playTactileFeedback('level_up');
    notifyDataUpdated();

    return {
      intent: 'MEDIA_CREATED',
      speech: `Livro "${clean}" catalogado com sucesso no seu acervo cultural do Segundo Cérebro.`,
      action: {
        type: 'NAVIGATE',
        view: 'leitura-cinema'
      }
    };
  }

  // Leitura & Cinema: Adicionar Filme
  static handleAddMovie(originalInput, normalized) {
    let clean = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(adicionar|novo|ver)\s+(?:o\s+)?(?:filme|serie)\s+/i, '')
      .trim();

    if (!clean) clean = 'Produção Cinematográfica';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    const isSerie = normalized.includes('serie');
    db.createMedia({
      title: clean,
      media_type: isSerie ? 'Série' : 'Filme',
      status: 'Lista de Desejos',
      rating: 5
    });

    playTactileFeedback('level_up');
    notifyDataUpdated();

    return {
      intent: 'MEDIA_CREATED',
      speech: `${isSerie ? 'Série' : 'Filme'} "${clean}" adicionado à sua lista de obras para assistir.`,
      action: {
        type: 'NAVIGATE',
        view: 'leitura-cinema'
      }
    };
  }

  // Leitura & Cinema: Atualizar Progresso de Leitura
  static handleUpdateReading(originalInput, normalized) {
    const match = normalized.match(/(\d+)\s*(?:paginas?|pags?)?/);
    const pageNum = match ? parseInt(match[1], 10) : 0;
    const media = db.getMediaCatalog().filter(m => m.media_type === 'Livro');

    if (media.length === 0 || pageNum <= 0) {
      return {
        intent: 'MEDIA_NOT_FOUND',
        speech: 'Indique o número da página e o livro que está lendo atualmente.',
        action: null
      };
    }

    const currentBook = media.find(m => m.status === 'Em leitura') || media[0];
    db.updateMedia(currentBook.id, { current_page: pageNum });

    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'MEDIA_UPDATED',
      speech: `Progresso do livro "${currentBook.title}" atualizado para a página ${pageNum}/${currentBook.total_pages}. Conhecimento é poder, Comandante.`,
      action: {
        type: 'NAVIGATE',
        view: 'leitura-cinema'
      }
    };
  }

  // Finanças: Assinatura Recorrente por Voz
  static handleAddSubscriptionByVoice(originalInput, normalized) {
    const matchAmount = originalInput.match(/(\d+(?:[.,]\d{1,2})?)/);
    const price = matchAmount ? parseFloat(matchAmount[1].replace(',', '.')) : 0;

    let clean = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(adicionar|nova|registrar)\s+assinatura\s+(?:da|do|de)?\s*/i, '')
      .replace(new RegExp(`(?:de\\s+)?${matchAmount ? matchAmount[1] : ''}\\s*(?:reais|r\\$)?.*$`, 'i'), '')
      .trim();

    if (!clean) clean = 'Assinatura';
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    db.createSubscription({
      service_name: clean,
      price: price,
      billing_cycle: 'Mensal',
      status: 'Ativa'
    });

    playTactileFeedback('check');
    notifyDataUpdated();

    return {
      intent: 'SUBSCRIPTION_CREATED',
      speech: `Assinatura de "${clean}" fixada em R$ ${price.toFixed(2)} ao mês registrada nas despesas recorrentes.`,
      action: {
        type: 'NAVIGATE',
        view: 'financas'
      }
    };
  }

  // Contagem Regressiva para 2027
  static handleCountdown2027() {
    const now = new Date();
    const target2027 = new Date('2027-12-31T23:59:59');
    const diffMs = target2027 - now;
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const monthsLeft = Math.ceil(daysLeft / 30.4);

    const speech = `Calculando telemetria temporal: restam exatamente ${daysLeft} dias para o encerramento do Projeto 2027, o que equivale a aproximadamente ${monthsLeft} meses de execução estratégica. Cada dia de disciplina conta.`;

    return {
      intent: 'COUNTDOWN_2027',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'metas'
      }
    };
  }

  // Consulta de Nível de XP & Patente
  static handleXpStatus() {
    const tasks = db.getTasks();
    const goals = db.getGoals();
    const media = db.getMediaCatalog();
    const dailyLogs = db.getDailyLogs();
    let focusCycles = 0;
    try {
      if (typeof localStorage !== 'undefined') {
        focusCycles = Number(localStorage.getItem('nexus_focus_stats') || 0);
      }
    } catch (_) {}

    const xpStats = calculateUserXP(tasks, goals, media, dailyLogs, focusCycles);

    const speech = `Relatório de desempenho do Operador: você é Nível ${xpStats.rank.level}, com a patente de ${xpStats.rank.title}. Seu acúmulo total é de ${xpStats.totalXP} pontos de experiência, estando a ${xpStats.progressPct}% do próximo nível de disciplina.`;

    return {
      intent: 'XP_STATUS',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'configuracoes'
      }
    };
  }

  // Consulta de Hábitos Diários
  static handleHabitsInquiry() {
    const today = new Date().toISOString().split('T')[0];
    const dailyLog = db.getDailyLog(today);
    const customHabits = db.getCustomHabits();
    const completed = customHabits.filter(h => dailyLog[h.id]);
    const pending = customHabits.filter(h => !dailyLog[h.id]);
    const total = customHabits.length;
    const pct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

    let speech = `Senhor, consultando os registros de hoje: você completou ${completed.length} de ${total} hábitos, totalizando ${pct}% de consistência. `;
    
    if (pending.length === 0 && total > 0) {
      speech += 'Extraordinário! Todos os hábitos do dia foram 100% cumpridos!';
    } else if (pending.length > 0) {
      const pendingNames = pending.slice(0, 3).map(p => p.label).join(', ');
      speech += `Restam pendentes: ${pendingNames}${pending.length > 3 ? ' e outros' : ''}. Manter o ritmo é fundamental para o Projeto 2027.`;
    }

    return {
      intent: 'HABITS_STATUS',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'hub-diario'
      }
    };
  }

  // Consulta de Prioridades / Tarefas de Hoje
  static handleTodayPriorities() {
    const today = new Date().toISOString().split('T')[0];
    const tasks = db.getTasks().filter(t => t.due_date === today && t.status !== 'Feito');
    
    if (tasks.length === 0) {
      return {
        intent: 'TODAY_PRIORITIES',
        speech: 'Comandante, você não possui tarefas pendentes para hoje no momento. Excelente trabalho! Deseja planejar novos objetivos ou entrar no Modo Foco?',
        action: { type: 'NAVIGATE', view: 'hub-diario' }
      };
    }

    const high = tasks.filter(t => t.priority === 'Alta');
    const others = tasks.filter(t => t.priority !== 'Alta');

    let speech = `Comandante, identifiquei ${tasks.length} tarefa(s) pendente(s) para hoje. `;
    if (high.length > 0) {
      speech += `Sua prioridade máxima recomendada é "${high[0].title}" na categoria ${high[0].category}. `;
      if (high.length > 1) {
        speech += `Também temos em destaque: "${high.slice(1, 3).map(t => t.title).join('", "')}". `;
      }
    } else {
      speech += `A principal tarefa da sua fila é "${others[0].title}". `;
    }
    speech += 'Deseja iniciar o cronômetro de Foco Total agora?';

    return {
      intent: 'TODAY_PRIORITIES',
      speech,
      action: { type: 'NAVIGATE', view: 'hub-diario' }
    };
  }

  // Resumo Financeiro
  static handleFinancialSummary() {
    const txs = db.getTransactions();
    const receitas = txs.filter(t => t.tx_type === 'Receita').reduce((a, b) => a + Number(b.amount || 0), 0);
    const gastos = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + Number(b.amount || 0), 0);
    const saldo = receitas - gastos;
    const spentRatio = receitas > 0 ? Math.round((gastos / receitas) * 100) : 100;
    const status = spentRatio <= 70 ? 'Saudável' : spentRatio <= 90 ? 'Atenção' : 'Crítico';

    const speech = `Avaliando tesouraria e fluxo de caixa: seu saldo atual em caixa é de R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, com R$ ${receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em receitas e R$ ${gastos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em despesas registradas. A taxa de consumo está em ${spentRatio}%, com índice classificado como ${status}.`;

    return {
      intent: 'FINANCIAL_SUMMARY',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'financas'
      }
    };
  }

  // Adicionar Despesa ou Receita por Comando de Voz
  static handleAddTransactionByVoice(originalInput, normalized) {
    const isReceita = normalized.includes('receita') || normalized.includes('recebi') || normalized.includes('ganhei');
    const txType = isReceita ? 'Receita' : 'Gasto';

    const matchAmount = originalInput.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:reais|r\$)?/i);
    let amount = 0;
    if (matchAmount) {
      amount = parseFloat(matchAmount[1].replace(',', '.'));
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return {
        intent: 'TRANSACTION_NEED_AMOUNT',
        speech: 'Por favor, informe o valor da transação. Por exemplo: "Gastei 50 reais no almoço" ou "Recebi 2500 de salário".',
        action: null
      };
    }

    let clean = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(adicionar|registrar|novo|nova)\s+(gasto|despesa|receita)\s+(?:de\s+)?/i, '')
      .replace(/^(gastei|paguei|comprei|recebi|ganhei)\s+/i, '')
      .replace(new RegExp(`(?:de\\s+)?${matchAmount[1]}\\s*(?:reais|r\\$)?\\s*(?:com|em|para|no|na|pela|pelo)?\\s*`, 'i'), '')
      .replace(/\s*(?:com|em|para|no|na)\s*/i, ' ')
      .trim();

    if (!clean) {
      clean = isReceita ? 'Receita Avulsa' : 'Gasto Avulso';
    }
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);

    let category = 'Outros';
    if (normalized.includes('almoco') || normalized.includes('jantar') || normalized.includes('comida') || normalized.includes('mercado') || normalized.includes('restaurante')) {
      category = 'Alimentação';
    } else if (normalized.includes('uber') || normalized.includes('gasolina') || normalized.includes('transporte')) {
      category = 'Transporte';
    } else if (normalized.includes('servidor') || normalized.includes('software') || normalized.includes('trabalho') || normalized.includes('salario')) {
      category = 'Trabalho';
    } else if (isReceita) {
      category = 'Receita';
    }

    const today = new Date().toISOString().split('T')[0];
    db.createTransaction({
      title: clean,
      amount: amount,
      tx_date: today,
      tx_type: txType,
      category: category,
      payment_status: 'Pago'
    });

    playTactileFeedback('check');
    notifyDataUpdated();

    const speech = `${txType === 'Receita' ? 'Receita' : 'Despesa'} de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} referente a "${clean}" registrada com sucesso na tesouraria.`;

    return {
      intent: 'TRANSACTION_RECORDED',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'financas'
      }
    };
  }

  // Parser Inteligente de Datas e Horários Naturais em Português
  static parseNaturalDateAndTime(originalInput, normalized) {
    const now = new Date();
    let targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let dateFound = false;
    let dateLabel = 'hoje';

    // 1. Termos relativos diretos
    if (normalized.includes('amanha') && !normalized.includes('depois de amanha')) {
      targetDate.setDate(targetDate.getDate() + 1);
      dateFound = true;
      dateLabel = 'amanhã';
    } else if (normalized.includes('depois de amanha')) {
      targetDate.setDate(targetDate.getDate() + 2);
      dateFound = true;
      dateLabel = 'depois de amanhã';
    } else if (normalized.includes('hoje')) {
      dateFound = true;
      dateLabel = 'hoje';
    }

    // 2. Dias da semana (segunda, terça, quarta, quinta, sexta, sábado, domingo)
    const weekdays = [
      { names: ['domingo'], dayIndex: 0 },
      { names: ['segunda-feira', 'segunda feira', 'segunda'], dayIndex: 1 },
      { names: ['terca-feira', 'terca feira', 'terca'], dayIndex: 2 },
      { names: ['quarta-feira', 'quarta feira', 'quarta'], dayIndex: 3 },
      { names: ['quinta-feira', 'quinta feira', 'quinta'], dayIndex: 4 },
      { names: ['sexta-feira', 'sexta feira', 'sexta'], dayIndex: 5 },
      { names: ['sabado'], dayIndex: 6 }
    ];

    if (!dateFound) {
      for (const w of weekdays) {
        if (w.names.some(name => normalized.includes(name))) {
          const currentDay = now.getDay();
          let diff = w.dayIndex - currentDay;
          if (diff <= 0) diff += 7; // Próxima ocorrência da semana
          targetDate.setDate(targetDate.getDate() + diff);
          dateFound = true;
          dateLabel = w.names[0].charAt(0).toUpperCase() + w.names[0].slice(1);
          break;
        }
      }
    }

    // 3. Datas numéricas com nome de mês (ex: "dia 15 de novembro", "dia 25 de dezembro de 2026")
    if (!dateFound) {
      const matchMonthName = normalized.match(/dia\s+(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+de\s+(\d{4}))?/);
      if (matchMonthName) {
        const d = parseInt(matchMonthName[1], 10);
        const monthMap = {
          janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5,
          julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
        };
        const m = monthMap[matchMonthName[2]];
        const y = matchMonthName[3] ? parseInt(matchMonthName[3], 10) : now.getFullYear();
        targetDate = new Date(y, m, d);
        dateFound = true;
        dateLabel = `dia ${d} de ${matchMonthName[2]}`;
      }
    }

    // 4. Formato barra (ex: "15/11", "20/12/2026")
    if (!dateFound) {
      const matchSlash = normalized.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (matchSlash) {
        const d = parseInt(matchSlash[1], 10);
        const m = parseInt(matchSlash[2], 10) - 1;
        let y = matchSlash[3] ? parseInt(matchSlash[3], 10) : now.getFullYear();
        if (y < 100) y += 2000;
        targetDate = new Date(y, m, d);
        dateFound = true;
        dateLabel = `dia ${d}/${m + 1}`;
      }
    }

    // 5. Dia avulso (ex: "dia 15", "dia 28")
    if (!dateFound) {
      const matchDayOnly = normalized.match(/dia\s+(\d{1,2})\b/);
      if (matchDayOnly) {
        const d = parseInt(matchDayOnly[1], 10);
        let m = now.getMonth();
        let y = now.getFullYear();
        if (d < now.getDate()) {
          m += 1;
          if (m > 11) { m = 0; y += 1; }
        }
        targetDate = new Date(y, m, d);
        dateFound = true;
        dateLabel = `dia ${d}`;
      }
    }

    const yearStr = targetDate.getFullYear();
    const monthStr = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(targetDate.getDate()).padStart(2, '0');
    const isoDate = `${yearStr}-${monthStr}-${dayStr}`;

    // Horário (ex: "às 15h", "às 14:30", "às 09 horas", "15:30")
    const matchTime = normalized.match(/(?:as|para\s+as)\s+(\d{1,2})(?:h|:(\d{2}))?(?:\s*horas?)?/i) ||
                      normalized.match(/\b(\d{1,2})h(\d{2})?\b/i) ||
                      normalized.match(/\b(\d{1,2}):(\d{2})\b/);
    let startTime = null;
    if (matchTime) {
      const hh = String(matchTime[1]).padStart(2, '0');
      const mm = matchTime[2] ? String(matchTime[2]).padStart(2, '0') : '00';
      startTime = `${hh}:${mm}`;
    }

    return {
      dueDate: isoDate,
      startTime,
      dateLabel,
      formattedDate: `${dayStr}/${monthStr}/${yearStr}`
    };
  }

  // Criação & Agendamento Inteligente de Tarefas no Calendário
  static handleCreateTask(originalInput, normalized) {
    const { dueDate, startTime, dateLabel, formattedDate } = this.parseNaturalDateAndTime(originalInput, normalized);

    let priority = 'Alta';
    if (normalized.includes('baixa')) priority = 'Baixa';
    else if (normalized.includes('media')) priority = 'Média';
    else if (normalized.includes('alta')) priority = 'Alta';

    let category = 'Trabalho';
    if (normalized.includes('saude') || normalized.includes('medico') || normalized.includes('dentista') || normalized.includes('treino')) category = 'Saúde';
    else if (normalized.includes('financeiro') || normalized.includes('financas') || normalized.includes('banco') || normalized.includes('pagar')) category = 'Financeiro';
    else if (normalized.includes('pessoal') || normalized.includes('familia') || normalized.includes('casa')) category = 'Pessoal';

    // Limpar o título da tarefa removendo palavras de comando, datas e horários
    let title = originalInput
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(adicionar|criar|nova|agendar|anotar|marcar|colocar)\s+(?:tarefa|compromisso|reunião|reuniao|consulta|evento|no calendário|no calendario)?\s*/i, '')
      .replace(/\s+para\s+(trabalho|saúde|saude|financeiro|pessoal)/i, '')
      .replace(/\s+com\s+prioridade\s+(alta|média|media|baixa)/i, '')
      .replace(/\s+prioridade\s+(alta|média|media|baixa)/i, '')
      .replace(/\s*(?:para\s+)?(amanhã|amanha|depois de amanhã|depois de amanha|hoje)\s*/i, ' ')
      .replace(/\s*(?:para\s+)?(?:na\s+|no\s+)?(segunda-feira|segunda|terça-feira|terça|terca|quarta-feira|quarta|quinta-feira|quinta|sexta-feira|sexta|sábado|sabado|domingo)\s*/i, ' ')
      .replace(/\s*(?:para\s+)?(?:o\s+)?dia\s+\d{1,2}(?:\s+de\s+[a-zç]+(?:\s+de\s+\d{4})?)?\s*/i, ' ')
      .replace(/\s*(?:para\s+)?\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\s*/i, ' ')
      .replace(/\s*(?:para\s+)?(?:às|as)\s+\d{1,2}(?:h|:\d{2})?(?:\s*horas?)?\s*/i, ' ')
      .replace(/\s*\b\d{1,2}h(?:\d{2})?\b\s*/i, ' ')
      .replace(/\s*no\s+calend[aá]rio\s*/i, ' ')
      .trim();

    if (!title) {
      if (normalized.includes('reuniao')) title = 'Reunião Agendada';
      else if (normalized.includes('consulta')) title = 'Consulta Agendada';
      else if (normalized.includes('compromisso')) title = 'Compromisso Agendado';
      else title = 'Tarefa Agendada';
    }
    title = title.charAt(0).toUpperCase() + title.slice(1);

    const newTask = db.createTask({
      title,
      category,
      priority,
      due_date: dueDate,
      start_time: startTime,
      status: 'Não iniciado'
    });

    playTactileFeedback('check');
    notifyDataUpdated();

    const timeMsg = startTime ? ` às ${startTime}` : '';
    const dateSpeech = dateLabel === 'hoje' ? 'para hoje' : `para ${dateLabel} (${formattedDate})`;
    const speech = `Afirmativo, Comandante. Agendei "${title}" no seu calendário ${dateSpeech}${timeMsg} [${category} • Prioridade ${priority}].`;

    return {
      intent: 'TASK_CREATED',
      speech,
      action: {
        type: 'TASK_CREATED',
        task: newTask,
        view: 'calendario'
      }
    };
  }

  // Reagendamento / Adiar Tarefa no Calendário
  static handleRescheduleTask(originalInput, normalized) {
    const { dueDate, startTime, dateLabel, formattedDate } = this.parseNaturalDateAndTime(originalInput, normalized);
    const tasks = db.getTasks();

    let cleanTarget = normalized
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(adiar|reagendar|mudar data da|mudar data de|passar|mover)\s+tarefa\s*/i, '')
      .replace(/\s*(?:para|pra)\s+(amanha|hoje|depois de amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d+).*/i, '')
      .trim();

    let matched = tasks.find(t =>
      t.status !== 'Feito' &&
      t.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(cleanTarget)
    );

    if (!matched && tasks.length > 0) {
      matched = tasks.find(t => t.status !== 'Feito');
    }

    if (!matched) {
      return {
        intent: 'TASK_NOT_FOUND',
        speech: 'Não encontrei nenhuma tarefa pendente para reagendar.',
        action: null
      };
    }

    db.updateTask(matched.id, {
      due_date: dueDate,
      ...(startTime ? { start_time: startTime } : {})
    });

    playTactileFeedback('check');
    notifyDataUpdated();

    const timeMsg = startTime ? ` às ${startTime}` : '';
    return {
      intent: 'TASK_RESCHEDULED',
      speech: `Tarefa "${matched.title}" reagendada com sucesso para ${dateLabel} (${formattedDate})${timeMsg}, Comandante.`,
      action: {
        type: 'TASK_UPDATED',
        task: { ...matched, due_date: dueDate, start_time: startTime },
        view: 'calendario'
      }
    };
  }

  // Consulta de Agenda & Compromissos no Calendário
  static handleCalendarInquiry(originalInput, normalized) {
    const { dueDate, dateLabel, formattedDate } = this.parseNaturalDateAndTime(originalInput, normalized);
    const tasks = db.getTasks().filter(t => t.due_date === dueDate && t.status !== 'Feito');

    if (tasks.length === 0) {
      return {
        intent: 'CALENDAR_SCHEDULE',
        speech: `Comandante, você não possui compromissos ou tarefas pendentes na sua agenda para ${dateLabel} (${formattedDate}).`,
        action: { type: 'NAVIGATE', view: 'calendario' }
      };
    }

    const list = tasks.map(t => {
      const timeStr = t.start_time ? `às ${t.start_time}` : '';
      return `• ${t.title} ${timeStr} [${t.priority}]`;
    }).join(', ');

    return {
      intent: 'CALENDAR_SCHEDULE',
      speech: `Consultando sua agenda para ${dateLabel} (${formattedDate}): você possui ${tasks.length} compromisso(s): ${list}.`,
      action: { type: 'NAVIGATE', view: 'calendario' }
    };
  }

  // Comando de Frequências Neurais Binaurais
  static handleBinauralWaveCommand(originalInput, normalized) {
    let wave = 'gamma';
    let waveName = 'Gamma 40Hz (Hiperfoco Cognitivo)';

    if (normalized.includes('beta')) {
      wave = 'beta';
      waveName = 'Beta 18Hz (Atenção Ativa)';
    } else if (normalized.includes('alpha')) {
      wave = 'alpha';
      waveName = 'Alpha 10Hz (Estado de Flow & Criatividade)';
    } else if (normalized.includes('theta')) {
      wave = 'theta';
      waveName = 'Theta 6Hz (Absorção de Aprendizado & Calma)';
    } else if (normalized.includes('gamma')) {
      wave = 'gamma';
      waveName = 'Gamma 40Hz (Hiperfoco Cognitivo)';
    }

    if (normalized.includes('desligar') || normalized.includes('parar') || normalized.includes('pausar') || normalized.includes('mutar')) {
      ambientAudio.stop();
      playTactileFeedback('uncheck');
      return {
        intent: 'SET_BINAURAL_WAVE',
        speech: 'Frequências sonoras pausadas, Comandante. Modo silencioso restabelecido.',
        action: { type: 'STOP_AUDIO' }
      };
    }

    ambientAudio.start(wave, 0.25);
    playTactileFeedback('check');

    return {
      intent: 'SET_BINAURAL_WAVE',
      speech: `Ativando frequência binaural ${waveName}, Comandante. Fones de ouvido estéreo recomendados para indução neural ideal.`,
      action: {
        type: 'SET_BINAURAL_WAVE',
        wave,
        view: 'foco-total'
      }
    };
  }

  // Criação Rápida de Nota no Cofre
  static handleQuickNote(input) {
    let clean = input
      .replace(/^(jarvis[,.]?\s*)?/i, '')
      .replace(/^(anotar ideia|salvar nota|lembrar que|anotar no cofre|anotar)\s*:?\s*/i, '')
      .trim();

    if (!clean) clean = 'Registro rápido via J.A.R.V.I.S.';
    const title = clean.slice(0, 40) + (clean.length > 40 ? '...' : '');

    db.createKnowledgeItem({
      title,
      item_type: 'Ideia',
      category: 'Ideias',
      content_or_url: clean
    });

    playTactileFeedback('level_up');
    notifyDataUpdated();

    return {
      intent: 'NOTE_CREATED',
      speech: `Nota catalogada e blindada com sucesso no Cofre Nexus sob o título "${title}".`,
      action: {
        type: 'NAVIGATE',
        view: 'cofre'
      }
    };
  }

  // Navegação por comando de voz
  static handleNavigation(normalized) {
    const navMap = [
      { keys: ['foco', 'pomodoro', 'concentracao', 'modo foco'], view: 'foco-total', phrase: 'Iniciando Modo Foco Total. Reduzindo distrações sensoriais.' },
      { keys: ['hub', 'inicio', 'painel do dia', 'hub diario'], view: 'hub-diario', phrase: 'Retornando à Central do Hub Diário.' },
      { keys: ['calendario', 'agenda', 'prazos'], view: 'calendario', phrase: 'Acessando Calendário Interativo e cronograma operacional.' },
      { keys: ['metas', 'objetivos', 'visao 2027'], view: 'metas', phrase: 'Projetando painel de Metas e Vision Board 2027.' },
      { keys: ['financas', 'extrato', 'fluxo de caixa', 'gastos', 'tesouraria'], view: 'financas', phrase: 'Carregando tesouraria e gestão de capital.' },
      { keys: ['saude', 'treino', 'sono', 'biometria', 'agua'], view: 'saude', phrase: 'Acessando telemetria biométrica, sono e histórico de treinos.' },
      { keys: ['leitura', 'cinema', 'livros', 'filmes', 'acervo'], view: 'leitura-cinema', phrase: 'Abrindo catálogo cultural e acervo de livros e filmes.' },
      { keys: ['cofre', 'senhas', 'segundo cerebro', 'notas'], view: 'cofre', phrase: 'Desbloqueando Cofre Criptográfico Zero-Knowledge.' },
      { keys: ['configuracao', 'configuracoes', 'ajustes', 'perfil'], view: 'configuracoes', phrase: 'Abrindo configurações de sistema e perfil de comando.' }
    ];

    for (const item of navMap) {
      if (item.keys.some(k => normalized.includes(k))) {
        return {
          intent: 'NAVIGATE',
          speech: item.phrase,
          action: {
            type: 'NAVIGATE',
            view: item.view
          }
        };
      }
    }

    return null;
  }

  // Consultoria Analítica: Gastos por Categoria
  static handleCategoryExpenseInquiry(originalInput, normalized) {
    let cat = 'Outros';
    if (normalized.includes('alimentacao') || normalized.includes('almoco') || normalized.includes('jantar') || normalized.includes('restaurante') || normalized.includes('comida') || normalized.includes('mercado')) {
      cat = 'Alimentação';
    } else if (normalized.includes('transporte') || normalized.includes('uber') || normalized.includes('gasolina')) {
      cat = 'Transporte';
    } else if (normalized.includes('trabalho') || normalized.includes('software') || normalized.includes('servidor')) {
      cat = 'Trabalho';
    } else if (normalized.includes('saude') || normalized.includes('farmacia') || normalized.includes('suplemento')) {
      cat = 'Saúde';
    } else if (normalized.includes('lazer') || normalized.includes('viagem') || normalized.includes('cinema')) {
      cat = 'Lazer';
    }

    const txs = db.getTransactions() || [];
    const catTxs = txs.filter(t => t.tx_type === 'Gasto' && (t.category === cat || t.title.toLowerCase().includes(cat.toLowerCase())));
    const totalCat = catTxs.reduce((a, b) => a + Number(b.amount || 0), 0);
    const allExpenses = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + Number(b.amount || 0), 0);
    const pct = allExpenses > 0 ? Math.round((totalCat / allExpenses) * 100) : 0;

    const speech = `Consultando a tesouraria: seus gastos registrados na categoria ${cat} somam R$ ${totalCat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, representando aproximadamente ${pct}% de todas as suas despesas.`;

    return {
      intent: 'FINANCIAL_CATEGORY_SUMMARY',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'financas'
      }
    };
  }

  // Consultoria Analítica: Auditoria de Hábitos
  static handleHabitAudit() {
    const habits = db.getCustomHabits() || [];
    const logs = db.getDailyLogs() || [];

    if (!habits.length || !logs.length) {
      return {
        intent: 'HABIT_AUDIT',
        speech: 'Ainda não possuo histórico diário suficiente para auditar inconsistências. Continue registrando seus hábitos diariamente.',
        action: { type: 'NAVIGATE', view: 'hub-diario' }
      };
    }

    let lowestHabit = habits[0];
    let lowestRate = 100;

    for (const h of habits) {
      const completedCount = logs.filter(l => l[h.id] === 1).length;
      const rate = Math.round((completedCount / logs.length) * 100);
      if (rate < lowestRate) {
        lowestRate = rate;
        lowestHabit = h;
      }
    }

    const speech = `Auditoria de consistência concluída: seu hábito mais vulnerável recente é "${lowestHabit.label}", cumprido em ${lowestRate}% dos dias registrados. Recomendo reposicioná-lo para a primeira hora da manhã para proteger a consistência até 2027.`;

    return {
      intent: 'HABIT_AUDIT',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'hub-diario'
      }
    };
  }

  // Consultoria Analítica: Projeção de Metas
  static handleGoalProjection() {
    const goals = db.getGoals() || [];
    const primaryGoal = goals.find(g => g.theme === 'Financeiro') || goals[0];

    if (!primaryGoal) {
      return {
        intent: 'GOAL_PROJECTION',
        speech: 'Você ainda não possui metas financeiras cadastradas. Diga "Criar meta de juntar 50 mil reais" para iniciarmos.',
        action: { type: 'NAVIGATE', view: 'metas' }
      };
    }

    const target = primaryGoal.target_value || 10000;
    const current = primaryGoal.current_value || 0;
    const remaining = Math.max(0, target - current);
    const estimatedMonthly = 1500;
    const monthsNeeded = Math.ceil(remaining / estimatedMonthly);

    const speech = `Projetando horizonte temporal: para a meta "${primaryGoal.title}" (alvo: R$ ${target.toLocaleString('pt-BR')}), restam R$ ${remaining.toLocaleString('pt-BR')}. Com um aporte médio estimado de R$ 1.500,00 ao mês, você alcançará este objetivo em aproximadamente ${monthsNeeded} meses, perfeitamente alinhado ao cronograma de 2027.`;

    return {
      intent: 'GOAL_PROJECTION',
      speech,
      action: {
        type: 'NAVIGATE',
        view: 'metas'
      }
    };
  }

  // --------------------------------------------------------------------------
  // EXECUTOR DE AÇÕES ESTRUTURADAS (CONTROLE TOTAL DO ECOSSISTEMA)
  // --------------------------------------------------------------------------
  static executeAction(actionData) {
    if (!actionData || !actionData.type) return null;
    const today = new Date().toISOString().split('T')[0];

    // 1. Criar Tarefa(s) com suporte total a data e horário no calendário
    if (actionData.type === 'CREATE_TASKS' || actionData.type === 'CREATE_TASK' || actionData.type === 'ADD_TASK' || actionData.type === 'SCHEDULE_TASK') {
      const list = Array.isArray(actionData.tasks) ? actionData.tasks : [actionData];
      const created = [];
      for (const t of list) {
        if (!t.title) continue;
        const newTask = db.createTask({
          title: t.title,
          category: t.category || 'Trabalho',
          priority: t.priority || 'Alta',
          due_date: t.due_date || t.date || today,
          start_time: t.start_time || t.time || null,
          status: 'Não iniciado'
        });
        created.push(newTask);
      }
      playTactileFeedback('check');
      notifyDataUpdated();
      return { type: 'TASKS_CREATED', tasks: created, view: 'calendario' };
    }

    // 1.5. Reagendar / Adiar Tarefa no Calendário
    if (actionData.type === 'RESCHEDULE_TASK') {
      const target = (actionData.target || actionData.id || actionData.title || '').toLowerCase();
      const tasks = db.getTasks();
      const matched = tasks.find(t => t.id === target || t.title.toLowerCase().includes(target));
      if (matched) {
        db.updateTask(matched.id, {
          due_date: actionData.due_date || actionData.date || today,
          ...(actionData.start_time ? { start_time: actionData.start_time } : {})
        });
        playTactileFeedback('check');
        notifyDataUpdated();
        return { type: 'TASK_UPDATED', task: matched, view: 'calendario' };
      }
    }

    // 2. Concluir Tarefa
    if (actionData.type === 'COMPLETE_TASK' || actionData.type === 'COMPLETE_TASKS') {
      const target = (actionData.target || actionData.id || actionData.title || '').toLowerCase();
      const tasks = db.getTasks();
      const matched = tasks.find(t =>
        t.id === actionData.target ||
        t.title.toLowerCase().includes(target)
      );
      if (matched) {
        db.updateTask(matched.id, { status: 'Feito' });
        playTactileFeedback('check');
        notifyDataUpdated();
        return { type: 'TASK_COMPLETED', task: matched };
      }
    }

    // 3. Excluir Tarefa
    if (actionData.type === 'DELETE_TASK') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const tasks = db.getTasks();
      const matched = tasks.find(t => t.id === target || t.title.toLowerCase().includes(target));
      if (matched) {
        db.deleteTask(matched.id);
        playTactileFeedback('uncheck');
        notifyDataUpdated();
        return { type: 'TASK_DELETED', id: matched.id };
      }
    }

    // 4. Marcar Hábito como Concluído
    if (actionData.type === 'COMPLETE_HABIT' || actionData.type === 'CHECK_HABIT') {
      const target = (actionData.habit || actionData.id || actionData.target || actionData.label || '').toLowerCase();
      const habits = db.getCustomHabits();
      const matched = habits.find(h =>
        h.id === target ||
        h.label.toLowerCase().includes(target)
      );
      if (matched) {
        const dailyLog = db.getDailyLog(today);
        dailyLog[matched.id] = 1;
        db.saveDailyLog(dailyLog);
        playTactileFeedback('check');
        notifyDataUpdated();
        return { type: 'HABIT_COMPLETED', habit: matched };
      }
    }

    // 5. Criar Novo Hábito
    if (actionData.type === 'CREATE_HABIT') {
      const label = actionData.label || actionData.title;
      if (label) {
        const habits = db.getCustomHabits();
        const newHabit = {
          id: 'h_' + Date.now(),
          label,
          icon: actionData.icon || 'check_circle'
        };
        habits.push(newHabit);
        db.saveCustomHabits(habits);
        playTactileFeedback('level_up');
        notifyDataUpdated();
        return { type: 'HABIT_CREATED', habit: newHabit };
      }
    }

    // 5.1 Excluir Hábito
    if (actionData.type === 'DELETE_HABIT') {
      const target = (actionData.target || actionData.id || actionData.habit || '').toLowerCase();
      const habits = db.getCustomHabits();
      const matched = habits.find(h => h.id === target || h.label.toLowerCase().includes(target));
      if (matched) {
        db.deleteCustomHabit(matched.id);
        playTactileFeedback('uncheck');
        notifyDataUpdated();
        return { type: 'HABIT_DELETED', habit: matched };
      }
    }

    // 5.2 Atualizar Hábito
    if (actionData.type === 'UPDATE_HABIT') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const habits = db.getCustomHabits();
      const matched = habits.find(h => h.id === target || h.label.toLowerCase().includes(target));
      if (matched && actionData.label) {
        db.updateCustomHabit(matched.id, { label: actionData.label });
        playTactileFeedback('check');
        notifyDataUpdated();
        return { type: 'HABIT_UPDATED', habit: matched };
      }
    }

    // 6. Registrar Transação Financeira (Gasto ou Receita)
    if (actionData.type === 'ADD_TRANSACTION' || actionData.type === 'CREATE_TRANSACTION') {
      const tx = db.createTransaction({
        title: actionData.title || actionData.description || 'Registro financeiro',
        amount: Number(actionData.amount) || 0,
        tx_type: actionData.tx_type || 'Gasto',
        category: actionData.category || 'Outros',
        tx_date: actionData.tx_date || today,
        payment_status: 'Pago'
      });
      playTactileFeedback('check');
      notifyDataUpdated();
      return { type: 'NAVIGATE', view: 'financas' };
    }

    // 7. Excluir Transação Financeira
    if (actionData.type === 'DELETE_TRANSACTION') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const txs = db.getTransactions();
      const matched = txs.find(t => t.id === target || t.title.toLowerCase().includes(target));
      if (matched) {
        db.deleteTransaction(matched.id);
        playTactileFeedback('uncheck');
        notifyDataUpdated();
        return { type: 'TRANSACTION_DELETED', id: matched.id };
      }
    }

    // 8. Adicionar Assinatura Recorrente
    if (actionData.type === 'ADD_SUBSCRIPTION') {
      const sub = db.createSubscription({
        service_name: actionData.service_name || actionData.name || 'Nova Assinatura',
        price: Number(actionData.price || actionData.amount) || 0,
        billing_cycle: actionData.billing_cycle || 'Mensal',
        status: 'Ativa'
      });
      playTactileFeedback('check');
      notifyDataUpdated();
      return { type: 'NAVIGATE', view: 'financas' };
    }

    // 9. Excluir Assinatura
    if (actionData.type === 'DELETE_SUBSCRIPTION') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const subs = db.getSubscriptions();
      const matched = subs.find(s => s.id === target || s.service_name.toLowerCase().includes(target));
      if (matched) {
        db.deleteSubscription(matched.id);
        playTactileFeedback('uncheck');
        notifyDataUpdated();
        return { type: 'SUBSCRIPTION_DELETED', id: matched.id };
      }
    }

    // 10. Criar Meta 2027
    if (actionData.type === 'CREATE_GOAL') {
      const goal = db.createGoal({
        title: actionData.title || actionData.name || 'Meta 2027',
        target_value: Number(actionData.target_value) || 100,
        current_value: Number(actionData.current_value) || 0,
        theme: actionData.theme || 'Profissional',
        target_year: Number(actionData.target_year) || 2027
      });
      playTactileFeedback('level_up');
      notifyDataUpdated();
      return { type: 'NAVIGATE', view: 'metas' };
    }

    // 11. Atualizar Meta 2027
    if (actionData.type === 'UPDATE_GOAL') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const goals = db.getGoals();
      const matched = goals.find(g => g.id === target || g.title.toLowerCase().includes(target));
      if (matched) {
        let current_value = matched.current_value || 0;
        if (actionData.increment) {
          current_value += Number(actionData.increment);
        } else if (actionData.progress !== undefined) {
          current_value = Number(actionData.progress);
        } else if (actionData.current_value !== undefined) {
          current_value = Number(actionData.current_value);
        }
        db.updateGoal(matched.id, { current_value });
        playTactileFeedback('check');
        notifyDataUpdated();
        return { type: 'NAVIGATE', view: 'metas' };
      }
    }

    // 12. Excluir Meta 2027
    if (actionData.type === 'DELETE_GOAL') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const goals = db.getGoals();
      const matched = goals.find(g => g.id === target || g.title.toLowerCase().includes(target));
      if (matched) {
        db.deleteGoal(matched.id);
        playTactileFeedback('uncheck');
        notifyDataUpdated();
        return { type: 'GOAL_DELETED', id: matched.id };
      }
    }

    // 13. Saúde & Bio-Métricas (Sono, Água, Treino, Peso)
    if (actionData.type === 'LOG_HEALTH') {
      const metric = db.saveHealthMetric({
        date: actionData.date || today,
        sleep_hours: Number(actionData.sleep_hours) || 0,
        water_liters: Number(actionData.water_liters) || 0,
        workout_type: actionData.workout_type || '',
        workout_minutes: Number(actionData.workout_minutes) || 0,
        weight: Number(actionData.weight) || 0,
        notes: actionData.notes || ''
      });

      // Sincroniza hábitos do dia se preenchidos
      const dailyLog = db.getDailyLog(today);
      if (Number(actionData.water_liters) >= 2) dailyLog.h_water_2l = 1;
      if (Number(actionData.sleep_hours) >= 7.5) dailyLog.h_sleep_8h = 1;
      if (Number(actionData.workout_minutes) > 0) dailyLog.h_exercise_1h = 1;
      db.saveDailyLog(dailyLog);

      playTactileFeedback('check');
      notifyDataUpdated();
      return { type: 'NAVIGATE', view: 'saude' };
    }

    // 14. Adicionar Mídia (Livro, Filme, Série)
    if (actionData.type === 'ADD_MEDIA') {
      const media = db.createMedia({
        title: actionData.title,
        media_type: actionData.media_type || 'Livro',
        creator: actionData.creator || '',
        genre: actionData.genre || '',
        status: actionData.status || (actionData.media_type === 'Filme' ? 'Assistido' : 'Em leitura'),
        total_pages: Number(actionData.total_pages) || 300,
        current_page: Number(actionData.current_page) || 0
      });
      playTactileFeedback('level_up');
      notifyDataUpdated();
      return { type: 'NAVIGATE', view: 'leitura-cinema' };
    }

    // 15. Atualizar Mídia
    if (actionData.type === 'UPDATE_MEDIA') {
      const target = (actionData.target || actionData.id || '').toLowerCase();
      const mediaList = db.getMediaCatalog();
      const matched = mediaList.find(m => m.id === target || m.title.toLowerCase().includes(target));
      if (matched) {
        const updates = {};
        if (actionData.current_page !== undefined) updates.current_page = Number(actionData.current_page);
        if (actionData.status) updates.status = actionData.status;
        if (actionData.rating) updates.rating = Number(actionData.rating);
        db.updateMedia(matched.id, updates);
        playTactileFeedback('check');
        notifyDataUpdated();
        return { type: 'NAVIGATE', view: 'leitura-cinema' };
      }
    }

    // 16. Criar Nota no Cofre
    if (actionData.type === 'CREATE_NOTE') {
      db.createKnowledgeItem({
        title: actionData.title || 'Nota via J.A.R.V.I.S.',
        item_type: 'Ideia',
        category: actionData.category || 'Ideias',
        content_or_url: actionData.content || ''
      });
      playTactileFeedback('level_up');
      notifyDataUpdated();
      return { type: 'NAVIGATE', view: 'cofre' };
    }

    // 17. Iniciar Pomodoro / Modo Foco
    if (actionData.type === 'START_FOCUS') {
      playTactileFeedback('jarvis_activate');
      return {
        type: 'START_FOCUS',
        minutes: actionData.minutes || 25,
        view: 'foco-total'
      };
    }

    // 17.5. Ondas Binaurais Neurais
    if (actionData.type === 'SET_BINAURAL_WAVE' || actionData.type === 'START_AUDIO') {
      const wave = actionData.wave || 'gamma';
      ambientAudio.start(wave, 0.25);
      return { type: 'SET_BINAURAL_WAVE', wave, view: 'foco-total' };
    }
    if (actionData.type === 'STOP_AUDIO') {
      ambientAudio.stop();
      return { type: 'STOP_AUDIO' };
    }

    // 18. Navegação
    if (actionData.type === 'NAVIGATE') {
      return { type: 'NAVIGATE', view: actionData.view };
    }

    // 19. Exportações
    if (actionData.type === 'EXPORT_CALENDAR') {
      return { type: 'EXPORT_CALENDAR' };
    }
    if (actionData.type === 'EXPORT_REPORT') {
      return { type: 'EXPORT_REPORT', format: actionData.format || 'markdown' };
    }
    if (actionData.type === 'EXPORT_OBSIDIAN_VAULT') {
      return { type: 'EXPORT_OBSIDIAN_VAULT' };
    }
    if (actionData.type === 'EXPORT_FINANCE_CSV') {
      return { type: 'EXPORT_FINANCE_CSV' };
    }
    if (actionData.type === 'BACKUP_FULL_SYSTEM') {
      return { type: 'BACKUP_FULL_SYSTEM' };
    }
    if (actionData.type === 'EXPORT_DAILY_NOTE') {
      return { type: 'EXPORT_DAILY_NOTE' };
    }
    if (actionData.type === 'GET_ACHIEVEMENTS') {
      return { type: 'GET_ACHIEVEMENTS' };
    }
    if (actionData.type === 'SET_ASSISTANT_NAME') {
      return { type: 'SET_ASSISTANT_NAME', name: actionData.name };
    }
    if (actionData.type === 'GET_ASSISTANT_NAME') {
      return { type: 'GET_ASSISTANT_NAME', name: actionData.name };
    }
    if (actionData.type === 'SET_CLEAN_MODE') {
      const isClean = Boolean(actionData.isUltraClean);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('projeto_ultra_clean', isClean ? 'true' : 'false');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_toggle_ultra_clean', { detail: { isUltraClean: isClean } }));
      }
      return { type: 'SET_CLEAN_MODE', isUltraClean: isClean };
    }

    return null;
  }

  // Compatibilidade com referências antigas
  static executeNeuralAction(actionData) {
    return this.executeAction(actionData);
  }
}
