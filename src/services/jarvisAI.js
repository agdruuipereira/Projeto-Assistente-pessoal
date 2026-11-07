/**
 * src/services/jarvisAI.js
 * Módulo de Inteligência Artificial Generativa para o J.A.R.V.I.S.
 * Suporta Google Gemini API (Recomendado/Gratuito) e OpenAI / Groq.
 * Conecta o LLM ao contexto do banco de dados do Projeto 2027.
 */

import { db } from './db.js';
import { UserGoalsService } from './userGoals.js';

const STORAGE_KEY_API_KEY = 'nexus_jarvis_api_key';
const STORAGE_KEY_PROVIDER = 'nexus_jarvis_provider'; // 'gemini' | 'openai'
const STORAGE_KEY_MODEL = 'nexus_jarvis_model';

// Chave de fallback obtida das variáveis de ambiente (.env)
const DEFAULT_API_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) || '';

function safeGetItem(key) {
  if (typeof localStorage !== 'undefined') {
    try {
      return localStorage.getItem(key);
    } catch (_) {}
  }
  return null;
}

function safeSetItem(key, val) {
  if (typeof localStorage !== 'undefined') {
    try {
      if (val === null || val === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, String(val));
      }
    } catch (_) {}
  }
}

export class JarvisAIService {
  static getApiKey() {
    return safeGetItem(STORAGE_KEY_API_KEY) || DEFAULT_API_KEY;
  }

  static setApiKey(key, provider = 'gemini', model = '') {
    if (!key) {
      safeSetItem(STORAGE_KEY_API_KEY, null);
    } else {
      safeSetItem(STORAGE_KEY_API_KEY, key.trim());
    }
    safeSetItem(STORAGE_KEY_PROVIDER, provider);
    if (model) {
      safeSetItem(STORAGE_KEY_MODEL, model);
    }
  }

  static getProvider() {
    return safeGetItem(STORAGE_KEY_PROVIDER) || 'gemini';
  }

  static getModel() {
    const saved = safeGetItem(STORAGE_KEY_MODEL);
    if (saved) return saved;
    return this.getProvider() === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o-mini';
  }

  static isConfigured() {
    return Boolean(this.getApiKey());
  }

  // Gera o contexto completo do sistema e ecossistema para o prompt da IA
  static buildSystemContext() {
    let userName = 'Alexandre';
    try {
      const saved = safeGetItem('nexus_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) userName = parsed.name;
      }
    } catch (_) {}

    const today = new Date().toISOString().split('T')[0];
    const allTasks = db.getTasks() || [];
    const pendingTasks = allTasks.filter(t => t.status !== 'Feito');
    const todayTasks = allTasks.filter(t => t.due_date === today);

    const goals = db.getGoals() || [];
    const dailyLog = db.getDailyLog(today) || {};
    const customHabits = db.getCustomHabits() || [];
    const habitsStatus = customHabits.map(h => `${dailyLog[h.id] ? '[CONCLUÍDO]' : '[PENDENTE]'} ${h.label} (id: ${h.id})`);

    const txs = db.getTransactions() || [];
    const receitas = txs.filter(t => t.tx_type === 'Receita').reduce((a, b) => a + Number(b.amount || 0), 0);
    const gastos = txs.filter(t => t.tx_type === 'Gasto').reduce((a, b) => a + Number(b.amount || 0), 0);
    const saldo = receitas - gastos;
    const subs = db.getSubscriptions() || [];
    const subsList = subs.map(s => `• ${s.service_name}: R$ ${Number(s.price).toFixed(2)} (${s.billing_cycle})`);

    const healthList = db.getHealthMetrics() || [];
    const latestHealth = healthList.find(h => h.date === today) || healthList[0] || {};

    const mediaList = db.getMediaCatalog() || [];
    const activeMedia = mediaList.map(m => `• [${m.media_type}] "${m.title}" (${m.status}${m.current_page ? `, pág ${m.current_page}/${m.total_pages}` : ''})`);

    const taskTitles = pendingTasks.slice(0, 10).map(t => `• [${t.priority}] "${t.title}" (categoria: ${t.category}, id: ${t.id}, status: ${t.status})`).join('\n');
    const goalTitles = goals.map(g => `• "${g.title}" (Progresso: ${g.current_value || 0}/${g.target_value || 100}, tema: ${g.theme}, id: ${g.id})`).join('\n');

    const assistantName = UserGoalsService.getAssistantName();
    const appTitle = UserGoalsService.getAppTitle();

    return `
Você é o ${assistantName}, o assistente de inteligência artificial de elite, mordomo tático e sistema de comando central do ${appTitle}.
Seu usuário e comandante é ${userName}.
A data atual é ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date())} (${today}).

ESTADO ATUAL DO ECOSSISTEMA DO ${appTitle.toUpperCase()}:
- Tarefas Pendentes (${pendingTasks.length}):
${taskTitles || 'Nenhuma tarefa pendente no momento.'}

- Hábitos Cadastrados para Hoje:
${habitsStatus.join('\n') || 'Nenhum hábito cadastrado.'}

- Finanças e Tesouraria:
Saldo atual em caixa: R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Receitas: R$ ${receitas.toFixed(2)}, Gastos: R$ ${gastos.toFixed(2)}).
Assinaturas recorrentes ativas (${subs.length}):
${subsList.join('\n') || 'Nenhuma assinatura cadastrada.'}

- Metas Estratégicas para 2027 (${goals.length}):
${goalTitles || 'Nenhuma meta registrada.'}

- Saúde & Bio-Métricas:
Último registro (${latestHealth.date || 'Hoje'}): Sono: ${latestHealth.sleep_hours || 0}h | Água: ${latestHealth.water_liters || 0}L | Treino: ${latestHealth.workout_type || 'Nenhum'} (${latestHealth.workout_minutes || 0}min) | Peso: ${latestHealth.weight || 0}kg.

- Leitura & Cinema (Catálogo Cultural):
${activeMedia.slice(0, 5).join('\n') || 'Nenhum item cultural cadastrado.'}

DIRETRIZES DE PERSONALIDADE E CONTROLE TOTAL DO ECOSSISTEMA:
1. Tom: Extremamente inteligente, analítico, cortês, britânico, estratégico e focado em alta performance (estilo Jarvis do Homem de Ferro).
2. Chame o usuário de "Comandante", "Senhor" ou "${userName}".
3. Você tem CONTROLE TOTAL sobre todo o ecossistema do projeto (Tarefas, Hábitos, Finanças, Metas 2027, Saúde/Bio-métricas, Leitura/Filmes, Cofre de Ideias, Modo Foco e Navegação).
4. Seja conciso e direto na fala falada (2 a 4 frases elegantes).
5. Responda SEMPRE em português do Brasil (pt-BR).
6. SEMPRE que o usuário expressar qualquer intenção de criar, atualizar, concluir, excluir ou navegar no sistema, anexe OBRIGATORIAMENTE no final da resposta um bloco de ação executável no formato:

\`\`\`action
{ "type": "TIPO_DA_ACAO", ...parametros }
\`\`\`

CATÁLOGO DE AÇÕES EXECUTÁVEIS DISPONÍVEIS:
• Criar ou Agendar Tarefa(s) no Calendário:
{"type": "CREATE_TASKS", "tasks": [{"title": "Nome da Tarefa", "category": "Trabalho|Saúde|Financeiro|Pessoal", "priority": "Alta|Média|Baixa", "due_date": "YYYY-MM-DD", "start_time": "HH:MM"}]}

• Reagendar Tarefa no Calendário:
{"type": "RESCHEDULE_TASK", "target": "Nome da Tarefa ou ID", "due_date": "YYYY-MM-DD", "start_time": "HH:MM"}

• Ondas Binaurais Neurais:
{"type": "SET_BINAURAL_WAVE", "wave": "gamma|beta|alpha|theta"}

• Concluir Tarefa:
{"type": "COMPLETE_TASK", "target": "Nome da Tarefa ou ID"}

• Excluir Tarefa:
{"type": "DELETE_TASK", "target": "Nome da Tarefa ou ID"}

• Marcar Hábito como Concluído:
{"type": "COMPLETE_HABIT", "habit": "Nome do Hábito ou ID (ex: h_water_2l, h_sleep_8h, etc.)"}

• Criar Novo Hábito na Rotina:
{"type": "CREATE_HABIT", "label": "Nome do Novo Hábito", "icon": "check_circle"}

• Editar / Renomear Hábito:
{"type": "UPDATE_HABIT", "target": "Nome do Hábito ou ID", "label": "Novo Nome"}

• Excluir Hábito:
{"type": "DELETE_HABIT", "target": "Nome do Hábito ou ID"}

• Registrar Gasto ou Receita:
{"type": "ADD_TRANSACTION", "title": "Descrição", "amount": 45.0, "tx_type": "Gasto|Receita", "category": "Alimentação|Transporte|Trabalho|Saúde|Lazer|Outros"}

• Excluir Transação:
{"type": "DELETE_TRANSACTION", "target": "Descrição ou ID"}

• Adicionar Assinatura Recorrente:
{"type": "ADD_SUBSCRIPTION", "service_name": "Nome do Serviço", "price": 55.0, "billing_cycle": "Mensal"}

• Excluir Assinatura Recorrente:
{"type": "DELETE_SUBSCRIPTION", "target": "Nome do Serviço ou ID"}

• Criar Meta Estratégica 2027:
{"type": "CREATE_GOAL", "title": "Nome da Meta", "target_value": 50000, "current_value": 0, "theme": "Financeiro|Profissional|Saúde|Pessoal", "target_year": 2027}

• Atualizar Progresso de Meta:
{"type": "UPDATE_GOAL", "target": "Nome da Meta ou ID", "progress": 15000, "increment": false}

• Excluir Meta:
{"type": "DELETE_GOAL", "target": "Nome da Meta ou ID"}

• Registrar Saúde & Bio-Métricas (Sono, Água, Treino, Peso):
{"type": "LOG_HEALTH", "sleep_hours": 8.0, "water_liters": 2.5, "workout_type": "Musculação", "workout_minutes": 60, "weight": 75.0}

• Adicionar Livro ou Filme ao Catálogo Cultural:
{"type": "ADD_MEDIA", "title": "Nome da Obra", "media_type": "Livro|Filme|Série", "creator": "Autor ou Diretor", "status": "Em leitura|Assistido|Lido|Lista de Desejos", "total_pages": 300, "current_page": 0}

• Atualizar Progresso de Livro ou Filme:
{"type": "UPDATE_MEDIA", "target": "Nome do Livro", "current_page": 150, "status": "Em leitura"}

• Anotar Ideia ou Nota no Cofre Nexus:
{"type": "CREATE_NOTE", "title": "Título", "content": "Conteúdo da nota", "category": "Ideias|Resumos|Negócios"}

• Iniciar Modo Foco / Pomodoro:
{"type": "START_FOCUS", "minutes": 25}

• Navegar para Tela:
{"type": "NAVIGATE", "view": "hub-diario|calendario|foco-total|metas|financas|saude|leitura-cinema|cofre|configuracoes"}

• Exportar Calendário:
{"type": "EXPORT_CALENDAR"}

• Gerar Relatório Executivo:
{"type": "EXPORT_REPORT", "format": "markdown|pdf"}

• Alternar Modo Ultra-Clean / Essencial:
{"type": "SET_CLEAN_MODE", "isUltraClean": true}
`.trim();
  }

  // Enviar requisição para a IA com suporte a memória e histórico de diálogo
  static async queryAI(userPrompt, conversationHistory = []) {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Chave de API não configurada.');
    }

    const provider = this.getProvider();
    const systemInstruction = this.buildSystemContext();

    if (provider === 'gemini') {
      return this.callGemini(apiKey, systemInstruction, userPrompt, conversationHistory);
    } else {
      return this.callOpenAI(apiKey, systemInstruction, userPrompt, conversationHistory);
    }
  }

  // Integração com Google Gemini REST API (v1beta) com multi-turn history & fallback
  static async callGemini(apiKey, systemInstruction, userPrompt, conversationHistory = []) {
    const requestedModel = this.getModel().startsWith('gemini') ? this.getModel() : 'gemini-3.5-flash';
    const candidateModels = [
      requestedModel,
      'gemini-3.5-flash',
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest'
    ];
    // Remove duplicatas
    const uniqueModels = [...new Set(candidateModels)];

    // Montar histórico conversacional contínuo
    const contents = [];
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-8);
      for (const msg of recent) {
        if (!msg.text || !msg.text.trim()) continue;
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
    // Adiciona o turno atual
    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    let lastError = null;

    for (const model of uniqueModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const payload = {
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        };

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            return text.trim();
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = new Error(errData.error?.message || `Erro HTTP ${response.status} no modelo ${model}.`);
          // Se for erro temporário de capacidade (503) ou modelo não encontrado (404), tenta o próximo
          if (response.status === 503 || response.status === 404) {
            continue;
          }
          throw lastError;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Não foi possível obter resposta dos servidores Google Gemini.');
  }

  // Integração com OpenAI / Groq REST API com memória de turnos
  static async callOpenAI(apiKey, systemInstruction, userPrompt, conversationHistory = []) {
    const model = this.getModel().startsWith('gpt') ? this.getModel() : 'gpt-4o-mini';
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages = [{ role: 'system', content: systemInstruction }];
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const msg of conversationHistory.slice(-8)) {
        if (!msg.text) continue;
        messages.push({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        });
      }
    }
    messages.push({ role: 'user', content: userPrompt });

    const payload = {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || `Erro HTTP ${response.status} na OpenAI.`;
      throw new Error(msg);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Resposta vazia da OpenAI.');
    }

    return text.trim();
  }

  // Análise multimodal de imagens (Comprovantes fiscais, recibos, anotações e documentos)
  static async analyzeImage(base64Data, mimeType = 'image/jpeg', prompt = '') {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Chave de API não configurada para análise de imagem.');
    }

    const defaultPrompt = `
Você é o módulo de visão computacional do J.A.R.V.I.S. para o Projeto 2027.
Analise detalhadamente esta imagem:
1. Se for um RECIBO, COMPROVANTE FISCAL ou CUPOM:
   - Extraia o valor total (amount), a descrição/estabelecimento (title) e a categoria sugerida (Alimentação, Transporte, Saúde, Trabalho, Outros).
   - Responda com um resumo elegante em português e inclua OBRIGATORIAMENTE um bloco executável no final:
   \`\`\`action
   {"type": "ADD_TRANSACTION", "title": "Nome do Estabelecimento", "amount": 0.00, "tx_type": "Gasto", "category": "Categoria"}
   \`\`\`
2. Se for uma ANOTAÇÃO, DOCUMENTO ou CADERNO MANUSCRITO:
   - Transcreva o conteúdo com precisão e inclua no final:
   \`\`\`action
   {"type": "CREATE_NOTE", "title": "Título da Nota", "content": "Conteúdo transcrito"}
   \`\`\`
3. Se for outro tipo de imagem, descreva seus elementos com o tom analítico do J.A.R.V.I.S.
`.trim();

    const userInstruction = prompt ? `${defaultPrompt}\n\nInstrução adicional do Comandante: ${prompt}` : defaultPrompt;
    const requestedModel = this.getModel().startsWith('gemini') ? this.getModel() : 'gemini-2.5-flash';
    const modelsToTry = [requestedModel, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
    const uniqueModels = [...new Set(modelsToTry)];

    let lastError = null;

    for (const model of uniqueModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                { text: userInstruction },
                {
                  inlineData: {
                    mimeType: mimeType || 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = new Error(errData.error?.message || `Erro HTTP ${res.status}`);
          continue;
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Não foi possível analisar a imagem.');
  }

  // Testar conexão com a API
  static async testConnection(apiKey, provider = 'gemini', model = '') {
    if (!apiKey) return { success: false, message: 'Chave de API não informada.' };

    try {
      if (provider === 'gemini') {
        const targetModel = model || 'gemini-3.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey 
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas: "Online"' }] }]
          })
        });
        if (!res.ok) {
          // Se o modelo especificado der 503 ou 404, testa com os modelos de fallback estáveis
          const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash-lite'];
          for (const fbModel of fallbackModels) {
            try {
              const fallbackRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${fbModel}:generateContent`, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'x-goog-api-key': apiKey 
                },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: 'Online' }] }]
                })
              });
              if (fallbackRes.ok) {
                return { success: true, message: `✓ Conexão com Google Gemini Neural ativa e operacional (via ${fbModel})!` };
              }
            } catch (_) {}
          }

          const err = await res.json().catch(() => ({}));
          return { success: false, message: err.error?.message || 'Chave Gemini inválida ou sem permissão.' };
        }
        return { success: true, message: '✓ Conexão com Google Gemini Neural ativa e operacional!' };
      } else {
        const targetModel = model || 'gpt-4o-mini';
        const url = 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'Responda apenas: Online' }],
            max_tokens: 10
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { success: false, message: err.error?.message || 'Chave OpenAI inválida.' };
        }
        return { success: true, message: '✓ Conexão com OpenAI Neural ativa e operacional!' };
      }
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
}

