// scripts/test_jarvis.js
// Script de verificação automatizada de todo o ecossistema do J.A.R.V.I.S.

import { JarvisBrain } from '../src/services/jarvisBrain.js';
import { db } from '../src/services/db.js';

console.log('=====================================================');
console.log('⚡ TESTE DE CONTROLE TOTAL DO ECOSSISTEMA DO J.A.R.V.I.S.');
console.log('=====================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  async function assertIntent(description, command, expectedIntent, checkAction = null) {
    total++;
    try {
      const res = await JarvisBrain.processCommand(command);
      const isIntentMatch = res.intent === expectedIntent;
      let actionMatch = true;
      if (checkAction && typeof checkAction === 'function') {
        actionMatch = checkAction(res);
      }

      if (isIntentMatch && actionMatch) {
        passed++;
        console.log(`✅ [PASS] ${description}`);
        console.log(`   Comando: "${command}"`);
        console.log(`   Resposta: ${res.speech.slice(0, 100)}...`);
      } else {
        console.log(`❌ [FAIL] ${description}`);
        console.log(`   Comando: "${command}"`);
        console.log(`   Esperado: ${expectedIntent}, Recebido: ${res.intent}`);
        if (!actionMatch) console.log(`   Ação retornada falhou na verificação customizada.`);
      }
    } catch (e) {
      console.log(`❌ [ERROR] ${description}: ${e.message}`);
    }
    console.log('-----------------------------------------------------');
  }

  // 1. Briefing matinal
  await assertIntent(
    'Briefing Matinal',
    'Bom dia Jarvis, me dê o status do sistema',
    'BRIEFING'
  );

  // 2. Consulta de Prioridades do Dia
  await assertIntent(
    'Prioridades do Dia',
    'O que priorizar hoje no meu dia?',
    'TODAY_PRIORITIES'
  );

  // 3. Consulta de Hábitos
  await assertIntent(
    'Consulta de Hábitos',
    'Como estão meus hábitos hoje?',
    'HABITS_STATUS'
  );

  // 4. Criação de Tarefa Dinâmica
  await assertIntent(
    'Criação de Tarefa Dinâmica',
    'Adicionar tarefa Revisar arquitetura de microsserviços para Trabalho com prioridade alta',
    'TASK_CREATED',
    (res) => res.action && res.action.task && res.action.task.priority === 'Alta'
  );

  // 5. Conclusão de Tarefa
  await assertIntent(
    'Concluir Tarefa',
    'Concluir tarefa Revisar arquitetura',
    'TASK_COMPLETED'
  );

  // 6. Excluir Tarefa
  await assertIntent(
    'Excluir Tarefa',
    'Excluir tarefa Revisar arquitetura',
    'TASK_DELETED'
  );

  // 7. Registro de Gasto em Linguagem Natural
  await assertIntent(
    'Gasto Natural por Voz',
    'Gastei 45 reais no almoço',
    'TRANSACTION_RECORDED',
    (res) => res.speech.includes('45')
  );

  // 8. Registro de Receita em Linguagem Natural
  await assertIntent(
    'Receita Natural por Voz',
    'Recebi 2500 de salário',
    'TRANSACTION_RECORDED',
    (res) => res.speech.includes('2.500') || res.speech.includes('2500')
  );

  // 9. Registro de Assinatura Recorrente
  await assertIntent(
    'Registrar Assinatura Recorrente',
    'Adicionar assinatura da Netflix de 55 reais',
    'SUBSCRIPTION_CREATED'
  );

  // 10. Marcar Hábito como Concluído
  await assertIntent(
    'Marcar Hábito por Voz',
    'Fiz o hábito de leitura',
    'HABIT_COMPLETED'
  );

  // 11. Criar Novo Hábito na Rotina
  await assertIntent(
    'Criar Novo Hábito',
    'Criar hábito de meditar 10 minutos',
    'HABIT_CREATED'
  );

  // 12. Saúde: Registro de Sono
  await assertIntent(
    'Saúde: Registro de Sono',
    'Dormi 8 horas',
    'HEALTH_LOGGED'
  );

  // 13. Saúde: Registro de Água
  await assertIntent(
    'Saúde: Registro de Água',
    'Bebi 2 litros de água',
    'HEALTH_LOGGED'
  );

  // 14. Saúde: Registro de Treino
  await assertIntent(
    'Saúde: Registro de Treino',
    'Treinei 45 minutos de musculação',
    'HEALTH_LOGGED'
  );

  // 15. Saúde: Registro de Peso
  await assertIntent(
    'Saúde: Registro de Peso',
    'Meu peso hoje é 75kg',
    'HEALTH_LOGGED'
  );

  // 16. Metas 2027: Criar Meta
  await assertIntent(
    'Metas 2027: Criar Meta',
    'Criar meta de juntar 50 mil reais',
    'GOAL_CREATED'
  );

  // 17. Metas 2027: Atualizar Meta
  await assertIntent(
    'Metas 2027: Atualizar Progresso',
    'Atualizar meta juntar 50 mil para 15000',
    'GOAL_UPDATED'
  );

  // 18. Leitura & Cinema: Adicionar Livro
  await assertIntent(
    'Catálogo: Adicionar Livro',
    'Adicionar o livro Pai Rico Pai Pobre',
    'MEDIA_CREATED'
  );

  // 19. Resumo Financeiro
  await assertIntent(
    'Resumo Financeiro',
    'Qual o meu saldo e finanças do mês?',
    'FINANCIAL_SUMMARY'
  );

  // 20. Contagem Regressiva para 2027
  await assertIntent(
    'Contagem Regressiva 2027',
    'Quanto tempo falta para 2027?',
    'COUNTDOWN_2027'
  );

  // 21. Nível de XP & Gamificação
  await assertIntent(
    'Status de XP e Patente',
    'Qual é o meu nível e minha patente?',
    'XP_STATUS'
  );

  // 22. Iniciar Modo Foco / Pomodoro
  await assertIntent(
    'Iniciar Modo Foco',
    'Iniciar foco de 25 minutos',
    'NAVIGATE',
    (res) => res.action && res.action.view === 'foco-total'
  );

  // 23. Exportar Calendário .ICS
  await assertIntent(
    'Exportar Calendário .ICS',
    'Exportar calendário',
    'EXPORT_CALENDAR'
  );

  // 24. Exportar Relatório Executivo
  await assertIntent(
    'Exportar Relatório Executivo',
    'Exportar relatório executivo',
    'EXPORT_REPORT'
  );

  // 25. Exportar Obsidian Vault (.ZIP)
  await assertIntent(
    'Exportar Obsidian Vault',
    'Exportar cofre do obsidian',
    'EXPORT_OBSIDIAN_VAULT'
  );

  // 26. Consultoria Analítica: Gastos por Categoria
  await assertIntent(
    'Consultoria: Gastos por Categoria',
    'Quanto gastei com alimentação este mês?',
    'FINANCIAL_CATEGORY_SUMMARY'
  );

  // 27. Consultoria Analítica: Auditoria de Hábitos
  await assertIntent(
    'Consultoria: Auditoria de Hábitos',
    'Qual meu hábito mais negligenciado?',
    'HABIT_AUDIT'
  );

  // 28. Consultoria Analítica: Projeção de Metas
  await assertIntent(
    'Consultoria: Projeção de Metas',
    'Em quantos meses bato a meta de 2027?',
    'GOAL_PROJECTION'
  );

  // 29. Central de Notificações: Consulta de Alertas
  await assertIntent(
    'Central de Notificações: Consulta',
    'Quais são minhas notificações pendentes?',
    'GET_NOTIFICATIONS'
  );

  // 30. Central de Notificações: Ativar Modo Não Incomodar
  await assertIntent(
    'Central de Notificações: Silenciar Alertas',
    'Ativar modo não incomodar',
    'SET_DND'
  );

  // 31. Central de Notificações: Limpar Notificações
  await assertIntent(
    'Central de Notificações: Limpar Alertas',
    'Limpar todas as notificações',
    'CLEAR_NOTIFICATIONS'
  );

  // 32. Metas Personalizadas: Consulta de Meta de Leitura
  await assertIntent(
    'Metas Personalizadas: Consultar Meta de Leitura',
    'Qual é a minha meta de leitura?',
    'GET_USER_GOAL'
  );

  // 33. Metas Personalizadas: Alterar Meta de Leitura
  await assertIntent(
    'Metas Personalizadas: Alterar Meta de Leitura',
    'Mudar meta de leitura para 60 livros',
    'SET_USER_GOAL'
  );

  // 34. Metas Personalizadas: Alterar Meta de Hidratação
  await assertIntent(
    'Metas Personalizadas: Alterar Meta de Água',
    'Mudar meta de agua para 3 litros',
    'SET_USER_GOAL'
  );

  // 35. Finanças: Exportar Extrato CSV
  await assertIntent(
    'Finanças: Exportar Extrato CSV',
    'Exportar extrato financeiro',
    'EXPORT_FINANCE_CSV'
  );

  // 36. Soberania de Dados: Backup Completo
  await assertIntent(
    'Soberania de Dados: Backup Completo',
    'Fazer backup completo do sistema',
    'BACKUP_FULL_SYSTEM'
  );

  // 37. Hub Diário: Exportar Daily Note
  await assertIntent(
    'Hub Diário: Exportar Daily Note',
    'Exportar daily note de hoje para o obsidian',
    'EXPORT_DAILY_NOTE'
  );

  // 38. Gamificação: Consultar Medalhas e Conquistas
  await assertIntent(
    'Gamificação: Consultar Medalhas e Conquistas',
    'Quais são minhas medalhas e conquistas?',
    'GET_ACHIEVEMENTS'
  );

  // 39. Personalização: Mudar Nome do Assistente
  await assertIntent(
    'Personalização: Mudar Nome do Assistente',
    'Mudar o seu nome para FRIDAY',
    'SET_ASSISTANT_NAME',
    (res) => res.speech.includes('FRIDAY')
  );

  // 40. Personalização: Consultar Nome do Assistente
  await assertIntent(
    'Personalização: Consultar Nome do Assistente',
    'Qual e o seu nome de assistente?',
    'GET_ASSISTANT_NAME'
  );

  // 41. Calendário: Agendar Tarefa para Amanhã com Horário
  await assertIntent(
    'Calendário: Agendar para Amanhã com Horário',
    'Agendar reuniao com investidores para amanha as 14 horas',
    'TASK_CREATED',
    (res) => res.action && res.action.task && res.action.task.start_time === '14:00' && res.action.task.due_date !== new Date().toISOString().split('T')[0]
  );

  // 42. Calendário: Consulta de Agenda
  await assertIntent(
    'Calendário: Consulta de Compromissos',
    'Quais sao meus compromissos agendados para amanha no calendario?',
    'CALENDAR_SCHEDULE'
  );

  // 43. Foco & Ondas Binaurais: Ativar Frequência Gamma
  await assertIntent(
    'Foco: Ativar Onda Binaural Gamma',
    'Ativar onda gamma',
    'SET_BINAURAL_WAVE',
    (res) => res.speech.includes('Gamma 40Hz')
  );

  // 44. Calendário: Reagendar Tarefa
  await assertIntent(
    'Calendário: Reagendar Tarefa',
    'Adiar tarefa investidores para sexta-feira as 16h',
    'TASK_RESCHEDULED',
    (res) => res.action && res.action.task && res.action.task.start_time === '16:00'
  );

  // 45. Interface: Ativar Modo Clean / Essencial
  await assertIntent(
    'Interface: Ativar Modo Clean / Essencial',
    'Ativar modo clean',
    'SET_CLEAN_MODE',
    (res) => res.action && res.action.isUltraClean === true
  );

  // 46. Interface: Restaurar Visão Completa
  await assertIntent(
    'Interface: Restaurar Visão Completa',
    'Restaurar visao completa',
    'SET_CLEAN_MODE',
    (res) => res.action && res.action.isUltraClean === false
  );

  // 47. Hábitos: Renomear Hábito
  await assertIntent(
    'Hábitos: Renomear Hábito',
    'Renomear habito leitura para Leitura Estratégica 30m',
    'HABIT_UPDATED',
    (res) => res.speech.includes('Leitura Estratégica 30m')
  );

  // 48. Hábitos: Excluir Hábito
  await assertIntent(
    'Hábitos: Excluir Hábito',
    'Excluir habito meditar',
    'HABIT_DELETED',
    (res) => res.action && res.action.type === 'DELETE_HABIT'
  );

  console.log(`\n🎉 RESULTADO FINAL: ${passed}/${total} testes aprovados com sucesso!`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();
