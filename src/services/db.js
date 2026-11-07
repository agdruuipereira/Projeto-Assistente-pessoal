/**
 * src/services/db.js
 * Camada unificada de dados do Projeto 2027.
 * Opera nativamente no Node.js via node:sqlite (conectando a database/projeto2027.db)
 * e oferece persistência reativa (localStorage) no navegador para a aplicação Vite/React.
 */

const STORAGE_PREFIX = 'projeto2027_';

let inMemoryCustomHabits = null;

// Dados semente iniciais baseados nos protótipos Obsidian Nexus do Stitch
const INITIAL_DATA = {
  daily_logs: [
    {
      log_date: new Date().toISOString().split('T')[0],
      h_sleep_8h: true,
      h_morning_routine: true,
      h_exercise_1h: true,
      h_read_30m: true,
      h_healthy_diet: true,
      h_water_2l: true,
      h_plan_tomorrow: true,
      reflection_gratitude: 'Avanço significativo na arquitetura e desenvolvimento do Projeto 2027.',
      reflection_better: 'Manter intervalos estritos nos blocos de hiperfoco para sustentar energia.',
      reflection_learning: 'A consistência diária nos hábitos cria uma barreira defensiva contra o estresse.',
      journal_richtext: 'Hoje iniciamos a consolidação de todos os módulos. Disciplina impecável.'
    }
  ],
  goals_2027: [
    {
      id: 'g-1',
      title: 'Atingir Fluência Técnica & IA Avançada',
      theme: 'Intelectual',
      target_month: 6,
      target_value: 100,
      current_value: 75,
      is_completed: false
    },
    {
      id: 'g-2',
      title: 'Construir Reserva de Blindagem Financeira',
      theme: 'Financeiro',
      target_month: 12,
      target_value: 100,
      current_value: 68,
      is_completed: false
    },
    {
      id: 'g-3',
      title: 'Condicionamento Físico de Elite (Sub 12% BF)',
      theme: 'Saúde e Bem-estar',
      target_month: 8,
      target_value: 100,
      current_value: 82,
      is_completed: false
    },
    {
      id: 'g-4',
      title: 'Lançar Plataforma SaaS com Receita Recorrente',
      theme: 'Profissional',
      target_month: 10,
      target_value: 100,
      current_value: 45,
      is_completed: false
    }
  ],
  tasks: [
    {
      id: 't-1',
      goal_id: 'g-1',
      title: 'Leitura de 30 páginas de "Atomic Habits"',
      due_date: new Date().toISOString().split('T')[0],
      status: 'Feito',
      priority: 'Alta',
      category: 'Pessoal'
    },
    {
      id: 't-2',
      goal_id: 'g-4',
      title: 'Implementar serviço criptográfico AES-256 no Cofre',
      due_date: new Date().toISOString().split('T')[0],
      status: 'Feito',
      priority: 'Alta',
      category: 'Trabalho'
    },
    {
      id: 't-3',
      goal_id: 'g-2',
      title: 'Revisar fluxo de caixa e assinaturas ativas',
      due_date: new Date().toISOString().split('T')[0],
      status: 'Iniciado',
      priority: 'Média',
      category: 'Financeiro'
    },
    {
      id: 't-4',
      goal_id: 'g-3',
      title: 'Treino de Força e Hipertrofia (Membros Superiores)',
      due_date: new Date().toISOString().split('T')[0],
      status: 'Feito',
      priority: 'Alta',
      category: 'Saúde'
    },
    {
      id: 't-5',
      goal_id: 'g-1',
      title: 'Estruturação dos componentes React da aplicação',
      due_date: new Date().toISOString().split('T')[0],
      status: 'Iniciado',
      priority: 'Alta',
      category: 'Trabalho'
    }
  ],
  transactions: [
    {
      id: 'tx-1',
      title: 'Consultoria de Arquitetura de Software',
      amount: 18500.00,
      tx_date: '2027-06-15',
      tx_type: 'Receita',
      category: 'Trabalho',
      payment_status: 'Pago',
      is_recurring: true
    },
    {
      id: 'tx-2',
      title: 'Infraestrutura Cloud & Servidores GPU',
      amount: 2450.00,
      tx_date: '2027-06-18',
      tx_type: 'Gasto',
      category: 'Infraestrutura',
      payment_status: 'Pago',
      is_recurring: true
    },
    {
      id: 'tx-3',
      title: 'Alimentação Estratégica & Suplementação',
      amount: 1800.00,
      tx_date: '2027-06-20',
      tx_type: 'Gasto',
      category: 'Saúde',
      payment_status: 'Pago',
      is_recurring: false
    },
    {
      id: 'tx-4',
      title: 'Dividendos & Rendimentos Passivos',
      amount: 3200.00,
      tx_date: '2027-06-22',
      tx_type: 'Receita',
      category: 'Investimentos',
      payment_status: 'Pago',
      is_recurring: true
    }
  ],
  subscriptions: [
    {
      id: 'sub-1',
      service_name: 'GitHub Enterprise',
      price: 105.00,
      billing_cycle: 'Mensal',
      start_date: '2024-01-01',
      next_payment_date: '2027-07-01',
      status: 'Ativa'
    },
    {
      id: 'sub-2',
      service_name: 'AWS Cloud Services',
      price: 340.00,
      billing_cycle: 'Mensal',
      start_date: '2024-01-01',
      next_payment_date: '2027-07-05',
      status: 'Ativa'
    },
    {
      id: 'sub-3',
      service_name: 'OpenAI API Platform',
      price: 180.00,
      billing_cycle: 'Mensal',
      start_date: '2024-02-01',
      next_payment_date: '2027-07-10',
      status: 'Ativa'
    }
  ],
  media_catalog: [
    {
      id: 'm-1',
      media_type: 'Livro',
      title: 'Atomic Habits',
      creator: 'James Clear',
      genre: 'Comportamento & Produtividade',
      cover_url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300',
      status: 'Lido',
      rating: 5,
      current_page: 320,
      total_pages: 320,
      is_favorite: true
    },
    {
      id: 'm-2',
      media_type: 'Livro',
      title: 'Deep Work: Rules for Focused Success',
      creator: 'Cal Newport',
      genre: 'Foco Profundo',
      cover_url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300',
      status: 'Em leitura',
      rating: 5,
      current_page: 185,
      total_pages: 304,
      is_favorite: true
    },
    {
      id: 'm-3',
      media_type: 'Filme',
      title: 'Oppenheimer',
      creator: 'Christopher Nolan',
      genre: 'Drama / Biografia',
      cover_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
      status: 'Assistido',
      rating: 5,
      current_page: 1,
      total_pages: 1,
      is_favorite: true
    }
  ],
  knowledge_hub: [
    {
      id: 'k-1',
      item_type: 'Caderno',
      category: 'Resumos',
      title: 'Princípios da Lei da Potência e Concentração de Esforço',
      content_or_url: '# Princípios de 2027\n80% dos resultados emergem de 20% das ações de alto valor.',
      is_favorite: true
    },
    {
      id: 'k-2',
      item_type: 'Link',
      category: 'Negócios',
      title: 'Documentação da Web Crypto API W3C',
      content_or_url: 'https://www.w3.org/TR/WebCryptoAPI/',
      is_favorite: true
    }
  ],
  password_vault: [
    {
      id: 'v-1',
      service_name: 'AWS Cloud Console',
      login_identifier: 'admin@projeto2027.tech',
      encrypted_cipher: '2j7eMP+jCVfONaBNJ3in4VwOSfErgvICZJh22YZQ5cj799gAouT2',
      iv_vector: 'DsTtB1+8GLj6R6Lq',
      salt: 'cLHCf/CZN4ppOWv9kIoPBw=='
    },
    {
      id: 'v-2',
      service_name: 'GitHub Pro Enterprise',
      login_identifier: 'eng-lead-2027',
      encrypted_cipher: '5qTyWQ57qotHi02bMWLNGsiEsR3fdNDZSAbGsqxD5/8YSRsrRGYwRr9SkN7NXHZH7g==',
      iv_vector: 'YXlFGPfgqvTD9Mc6',
      salt: '4xgy1MlRM4TYyRuBm393Bw=='
    },
    {
      id: 'v-3',
      service_name: 'Banco Inter PJ',
      login_identifier: 'financeiro@projeto2027.com',
      encrypted_cipher: 'IiBM3oveBUeExvZ+Ma2/L4/v6+g6lcylgK6s3dSg0Xd8vQqV0urmCgl6HX/i',
      iv_vector: 'r0DjcoCNcU+HbI2t',
      salt: 'C/wkx4XtRjQ8fGunld2aQg=='
    },
    {
      id: 'v-4',
      service_name: 'Stripe Dashboard',
      login_identifier: 'billing-lead-2027',
      encrypted_cipher: 'uIT/qWCmj4fDbyXFGRktfmwyyYCduZMCoozyCc3RRNXt7hLWPN6zYx+jaUVXNulJhLk=',
      iv_vector: 'WKAq38fnoXoB8rcG',
      salt: 'G07RZkqorrcyPCylgPshPw=='
    },
    {
      id: 'v-5',
      service_name: 'OpenAI API Platform',
      login_identifier: 'ai-systems-2027',
      encrypted_cipher: 'qIoN/bvsrL4nQpmXjK+JtIJr5gZRxbB/Icknz25iG4I2RNt3O23aEuqmlSOzGQA=',
      iv_vector: '74Ugwqt5GviWa01e',
      salt: '4gA/dA5jamIsxpnbhEXUAg=='
    }
  ],
  caixinhas: [
    { id: 'cx-1', name: 'Reserva de Emergência', target_amount: 15000, current_amount: 5000, icon: 'shield', color: '#10B981', category: 'Segurança' },
    { id: 'cx-2', name: 'Horizonte 2027', target_amount: 50000, current_amount: 12000, icon: 'rocket_launch', color: '#06B6D4', category: 'Investimentos' },
    { id: 'cx-3', name: 'Viagem & Lazer', target_amount: 8000, current_amount: 2400, icon: 'flight_takeoff', color: '#8B5CF6', category: 'Sonhos' }
  ]
};

function getStorage(table) {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + table);
    const isEmptyMode = window.localStorage.getItem(STORAGE_PREFIX + 'is_empty_mode') === 'true';
    if (raw === null) {
      const initial = isEmptyMode ? [] : (INITIAL_DATA[table] || []);
      window.localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }
  return INITIAL_DATA[table] || [];
}

function setStorage(table, data) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(STORAGE_PREFIX + table, JSON.stringify(data));
  }
  INITIAL_DATA[table] = data;
}

const BACKEND_URL = 'http://localhost:3001/api';

async function bgSync(path, method = 'POST', body = null) {
  if (typeof window === 'undefined') return;
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body && method !== 'GET' && method !== 'HEAD') {
      opts.body = JSON.stringify(body);
    }
    await fetch(`${BACKEND_URL}${path}`, opts);
  } catch (_) {
    // Operação offline segura: o localStorage preserva os dados
  }
}

export const db = {
  // Sincronização e hidratação com o banco de dados físico SQLite
  async hydrateFromBackend() {
    if (typeof window === 'undefined') return false;
    try {
      const health = await fetch(`${BACKEND_URL}/health`).catch(() => null);
      if (!health || !health.ok) {
        window.dispatchEvent(new CustomEvent('nexus_sqlite_status', { detail: { isConnected: false } }));
        return false;
      }

      // Se servidor online, hidrata dados locais a partir do banco físico
      const [tasksRes, txsRes, goalsRes, subsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/tasks`).catch(() => null),
        fetch(`${BACKEND_URL}/transactions`).catch(() => null),
        fetch(`${BACKEND_URL}/goals`).catch(() => null),
        fetch(`${BACKEND_URL}/subscriptions`).catch(() => null)
      ]);

      if (tasksRes && tasksRes.ok) {
        const tasks = await tasksRes.json();
        if (tasks && tasks.length > 0) setStorage('tasks', tasks);
      }
      if (txsRes && txsRes.ok) {
        const txs = await txsRes.json();
        if (txs && txs.length > 0) setStorage('transactions', txs);
      }
      if (goalsRes && goalsRes.ok) {
        const goals = await goalsRes.json();
        if (goals && goals.length > 0) setStorage('goals_2027', goals);
      }
      if (subsRes && subsRes.ok) {
        const subs = await subsRes.json();
        if (subs && subs.length > 0) setStorage('subscriptions', subs);
      }

      window.dispatchEvent(new CustomEvent('nexus_sqlite_status', { detail: { isConnected: true, database: 'projeto2027.db' } }));
      return true;
    } catch (_) {
      window.dispatchEvent(new CustomEvent('nexus_sqlite_status', { detail: { isConnected: false } }));
      return false;
    }
  },

  // Verificação de status do servidor SQLite
  async checkServerHealth() {
    try {
      const res = await fetch(`${BACKEND_URL}/health`);
      if (res.ok) {
        const data = await res.json();
        return { isOnline: true, database: data.database };
      }
    } catch (_) {}
    return { isOnline: false };
  },
  // Daily Logs
  getDailyLogs() {
    return getStorage('daily_logs');
  },

  getDailyLog(date = new Date().toISOString().split('T')[0]) {
    const logs = getStorage('daily_logs');
    return logs.find(l => l.log_date === date) || {
      log_date: date,
      h_sleep_8h: false,
      h_morning_routine: false,
      h_exercise_1h: false,
      h_read_30m: false,
      h_healthy_diet: false,
      h_water_2l: false,
      h_plan_tomorrow: false,
      reflection_gratitude: '',
      reflection_better: '',
      reflection_learning: '',
      journal_richtext: ''
    };
  },

  saveDailyLog(log) {
    const logs = getStorage('daily_logs');
    const idx = logs.findIndex(l => l.log_date === log.log_date);
    if (idx >= 0) {
      logs[idx] = { ...logs[idx], ...log };
    } else {
      logs.unshift(log);
    }
    setStorage('daily_logs', logs);
    bgSync('/daily-logs', 'POST', log);
    return log;
  },

  // Goals
  getGoals() {
    return getStorage('goals_2027');
  },

  createGoal(goal) {
    const goals = getStorage('goals_2027');
    const newGoal = {
      id: 'g-' + Date.now(),
      title: goal.title,
      theme: goal.theme || 'Profissional',
      target_year: Number(goal.target_year) || 2027,
      target_month: Number(goal.target_month) || 12,
      target_value: Number(goal.target_value) || 100,
      current_value: Number(goal.current_value) || 0,
      is_completed: Boolean(goal.is_completed),
      image_url: goal.image_url || '',
      milestones: Array.isArray(goal.milestones) ? goal.milestones : [],
      unit: goal.unit || '%',
      notes: goal.notes || ''
    };
    goals.push(newGoal);
    setStorage('goals_2027', goals);
    bgSync('/goals', 'POST', newGoal);
    return newGoal;
  },

  updateGoal(id, updates) {
    const goals = getStorage('goals_2027');
    const idx = goals.findIndex(g => g.id === id);
    if (idx >= 0) {
      goals[idx] = { ...goals[idx], ...updates };
      setStorage('goals_2027', goals);
      bgSync(`/goals/${id}`, 'PATCH', updates);
      return goals[idx];
    }
    return null;
  },

  deleteGoal(id) {
    const goals = getStorage('goals_2027').filter(g => g.id !== id);
    setStorage('goals_2027', goals);
    bgSync(`/goals/${id}`, 'DELETE');
  },

  // Tasks
  getTasks() {
    return getStorage('tasks');
  },

  createTask(task) {
    const tasks = getStorage('tasks');
    const newTask = {
      id: 't-' + Date.now(),
      goal_id: task.goal_id || null,
      title: task.title,
      due_date: task.due_date || new Date().toISOString().split('T')[0],
      start_time: task.start_time || null,
      status: task.status || 'Não iniciado',
      priority: task.priority || 'Sem prioridade',
      category: task.category || 'Sem grupo',
      created_at: new Date().toISOString()
    };
    tasks.unshift(newTask);
    setStorage('tasks', tasks);
    bgSync('/tasks', 'POST', newTask);
    return newTask;
  },

  updateTask(id, updates) {
    const tasks = getStorage('tasks');
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) {
      tasks[idx] = { ...tasks[idx], ...updates };
      setStorage('tasks', tasks);
      bgSync(`/tasks/${id}`, 'PATCH', updates);
      return tasks[idx];
    }
    return null;
  },

  deleteTask(id) {
    const tasks = getStorage('tasks').filter(t => t.id !== id);
    setStorage('tasks', tasks);
    bgSync(`/tasks/${id}`, 'DELETE');
  },

  // Transactions & Subscriptions
  getTransactions() {
    return getStorage('transactions');
  },

  createTransaction(tx) {
    const list = getStorage('transactions');
    const newTx = {
      id: 'tx-' + Date.now(),
      title: tx.title,
      amount: Number(tx.amount) || 0,
      tx_date: tx.tx_date || new Date().toISOString().split('T')[0],
      tx_type: tx.tx_type || 'Gasto',
      category: tx.category || 'Outros',
      payment_status: tx.payment_status || 'Pago',
      is_recurring: !!tx.is_recurring
    };
    list.unshift(newTx);
    setStorage('transactions', list);
    bgSync('/transactions', 'POST', newTx);
    return newTx;
  },

  deleteTransaction(id) {
    const list = getStorage('transactions').filter(t => t.id !== id);
    setStorage('transactions', list);
    bgSync(`/transactions/${id}`, 'DELETE');
  },

  getSubscriptions() {
    return getStorage('subscriptions');
  },

  createSubscription(sub) {
    const list = getStorage('subscriptions');
    const newSub = {
      id: 'sub-' + Date.now(),
      service_name: sub.service_name,
      price: Number(sub.price) || 0,
      billing_cycle: sub.billing_cycle || 'Mensal',
      start_date: sub.start_date || new Date().toISOString().split('T')[0],
      next_payment_date: sub.next_payment_date || new Date().toISOString().split('T')[0],
      status: sub.status || 'Ativa'
    };
    list.push(newSub);
    setStorage('subscriptions', list);
    bgSync('/subscriptions', 'POST', newSub);
    return newSub;
  },

  updateSubscription(id, updates) {
    const list = getStorage('subscriptions');
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      setStorage('subscriptions', list);
      bgSync(`/subscriptions/${id}`, 'PATCH', updates);
      return list[idx];
    }
    return null;
  },

  deleteSubscription(id) {
    const list = getStorage('subscriptions').filter(s => s.id !== id);
    setStorage('subscriptions', list);
    bgSync(`/subscriptions/${id}`, 'DELETE');
  },

  deleteMedia(id) {
    const list = getStorage('media_catalog').filter(m => m.id !== id);
    setStorage('media_catalog', list);
  },

  // Hábitos Customizáveis e Editáveis
  getCustomHabits() {
    const defaultHabits = [
      { id: 'h_sleep_8h', label: 'Dormir 8 horas', icon: 'bedtime' },
      { id: 'h_morning_routine', label: 'Rotina matinal', icon: 'wb_sunny' },
      { id: 'h_exercise_1h', label: 'Exercitar-se por 1 hora', icon: 'fitness_center' },
      { id: 'h_read_30m', label: 'Ler por 30 minutos', icon: 'menu_book' },
      { id: 'h_healthy_diet', label: 'Seguir dieta saudável', icon: 'restaurant' },
      { id: 'h_water_2l', label: 'Beber 2 litros de água', icon: 'water_drop' },
      { id: 'h_plan_tomorrow', label: 'Planejar o dia seguinte', icon: 'event_upcoming' }
    ];
    if (typeof window !== 'undefined' && window.localStorage) {
      const isEmptyMode = window.localStorage.getItem(STORAGE_PREFIX + 'is_empty_mode') === 'true';
      const raw = window.localStorage.getItem(STORAGE_PREFIX + 'custom_habits');
      if (raw !== null) {
        try { return JSON.parse(raw); } catch (_) {}
      }
      const initial = isEmptyMode ? [] : defaultHabits;
      window.localStorage.setItem(STORAGE_PREFIX + 'custom_habits', JSON.stringify(initial));
      return initial;
    }
    if (inMemoryCustomHabits) return inMemoryCustomHabits;
    return defaultHabits;
  },

  saveCustomHabits(habits) {
    inMemoryCustomHabits = [...habits];
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_PREFIX + 'custom_habits', JSON.stringify(habits));
      window.dispatchEvent(new CustomEvent('nexus_data_updated'));
    }
    return habits;
  },

  updateCustomHabit(id, updates) {
    const habits = this.getCustomHabits();
    const index = habits.findIndex(h => h.id === id);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates };
      this.saveCustomHabits(habits);
      return habits[index];
    }
    return null;
  },

  deleteCustomHabit(id) {
    const habits = this.getCustomHabits().filter(h => h.id !== id);
    this.saveCustomHabits(habits);
    return true;
  },

  // Media
  getMediaCatalog() {
    return getStorage('media_catalog');
  },

  createMedia(item) {
    const list = getStorage('media_catalog');
    const newMedia = {
      id: 'm-' + Date.now(),
      media_type: item.media_type || 'Livro',
      title: item.title,
      creator: item.creator || '',
      genre: item.genre || '',
      cover_url: item.cover_url || '',
      status: item.status || 'Lista de Desejos',
      rating: Number(item.rating) || 5,
      current_page: Number(item.current_page) || 0,
      total_pages: Number(item.total_pages) || 1,
      is_favorite: !!item.is_favorite,
      notes: item.notes || '',
      key_quotes: Array.isArray(item.key_quotes) ? item.key_quotes : [],
      completed_at: item.completed_at || null,
      ...item
    };
    list.unshift(newMedia);
    setStorage('media_catalog', list);
    return newMedia;
  },

  updateMedia(id, updates) {
    const list = getStorage('media_catalog');
    const idx = list.findIndex(m => m.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      setStorage('media_catalog', list);
      return list[idx];
    }
    return null;
  },

  // Knowledge Hub & Vault
  getKnowledgeItems() {
    return getStorage('knowledge_hub');
  },

  createKnowledgeItem(item) {
    const list = getStorage('knowledge_hub');
    const newItem = {
      id: 'k-' + Date.now(),
      item_type: item.item_type || 'Caderno',
      category: item.category || 'Ideias',
      title: item.title,
      content_or_url: item.content_or_url || '',
      is_favorite: !!item.is_favorite
    };
    list.unshift(newItem);
    setStorage('knowledge_hub', list);
    return newItem;
  },

  updateKnowledgeItem(id, updates) {
    const list = getStorage('knowledge_hub');
    const idx = list.findIndex(k => k.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      setStorage('knowledge_hub', list);
      return list[idx];
    }
    return null;
  },

  deleteKnowledgeItem(id) {
    const list = getStorage('knowledge_hub').filter(k => k.id !== id);
    setStorage('knowledge_hub', list);
    try {
      if (typeof fetch !== 'undefined') {
        fetch(`http://localhost:3001/api/knowledge/${id}`, { method: 'DELETE' }).catch(() => {});
      }
    } catch (_) {}
    return true;
  },

  getVaultItems() {
    return getStorage('password_vault');
  },

  createVaultItem(entry) {
    const list = getStorage('password_vault');
    const newEntry = {
      id: 'v-' + Date.now(),
      service_name: entry.service_name,
      login_identifier: entry.login_identifier || '',
      encrypted_cipher: entry.encrypted_cipher,
      iv_vector: entry.iv_vector,
      salt: entry.salt
    };
    list.unshift(newEntry);
    setStorage('password_vault', list);
    return newEntry;
  },

  deleteVaultItem(id) {
    const list = getStorage('password_vault').filter(v => v.id !== id);
    setStorage('password_vault', list);
  },

  // Saúde e Métricas Corporais
  getHealthMetrics() {
    return getStorage('health_metrics');
  },

  saveHealthMetric(data) {
    const list = getStorage('health_metrics');
    const dateStr = data.date || new Date().toISOString().split('T')[0];
    const idx = list.findIndex(h => h.date === dateStr);
    const existing = idx >= 0 ? list[idx] : {};
    const entry = {
      id: idx >= 0 ? existing.id : 'hm-' + Date.now(),
      date: dateStr,
      weight: data.weight !== undefined && data.weight !== '' ? Number(data.weight) : (existing.weight || 0),
      sleep_hours: data.sleep_hours !== undefined && data.sleep_hours !== '' ? Number(data.sleep_hours) : (existing.sleep_hours || 0),
      water_liters: data.water_liters !== undefined && data.water_liters !== '' ? Number(data.water_liters) : (existing.water_liters || 0),
      workout_type: data.workout_type !== undefined ? data.workout_type : (existing.workout_type || ''),
      workout_minutes: data.workout_minutes !== undefined && data.workout_minutes !== '' ? Number(data.workout_minutes) : (existing.workout_minutes || 0),
      workout_intensity: data.workout_intensity !== undefined ? data.workout_intensity : (existing.workout_intensity || 'Moderado'),
      workout_focus: data.workout_focus !== undefined ? data.workout_focus : (existing.workout_focus || ''),
      calories_burned: data.calories_burned !== undefined && data.calories_burned !== '' ? Number(data.calories_burned) : (existing.calories_burned || 0),
      notes: data.notes !== undefined ? data.notes : (existing.notes || ''),
      exercises: data.exercises !== undefined ? data.exercises : (existing.exercises || [])
    };
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.unshift(entry);
    }
    setStorage('health_metrics', list);
    return entry;
  },

  deleteHealthMetric(id) {
    const list = getStorage('health_metrics').filter(h => h.id !== id);
    setStorage('health_metrics', list);
  },

  // Caixinhas e Cofres de Poupança com Objetivos Específicos
  getCaixinhas() {
    const list = getStorage('caixinhas');
    return Array.isArray(list) ? list : [];
  },

  saveCaixinha(data) {
    const list = this.getCaixinhas();
    const id = data.id || 'cx-' + Date.now();
    const idx = list.findIndex(c => c && String(c.id) === String(id));
    const entry = {
      id,
      name: data.name || 'Nova Caixinha',
      target_amount: Number(data.target_amount) || 1000,
      current_amount: Number(data.current_amount) || 0,
      icon: data.icon || 'savings',
      color: data.color || '#10B981',
      category: data.category || 'Geral'
    };
    if (idx >= 0) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    setStorage('caixinhas', list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus_data_updated'));
    }
    return entry;
  },

  deleteCaixinha(id) {
    const list = this.getCaixinhas().filter(c => c && String(c.id) !== String(id));
    setStorage('caixinhas', list);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus_data_updated'));
    }
    return list;
  },

  depositCaixinha(id, amount) {
    const list = this.getCaixinhas();
    const idx = list.findIndex(c => c && String(c.id) === String(id));
    if (idx >= 0) {
      list[idx].current_amount = Math.round((Number(list[idx].current_amount || 0) + Number(amount)) * 100) / 100;
      setStorage('caixinhas', list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_data_updated'));
      }
      return list[idx];
    }
    return null;
  },

  withdrawCaixinha(id, amount) {
    const list = this.getCaixinhas();
    const idx = list.findIndex(c => c && String(c.id) === String(id));
    if (idx >= 0) {
      list[idx].current_amount = Math.max(0, Math.round((Number(list[idx].current_amount || 0) - Number(amount)) * 100) / 100);
      setStorage('caixinhas', list);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus_data_updated'));
      }
      return list[idx];
    }
    return null;
  },

  // Retrospectivas Semanais
  getWeeklyReviews() {
    return getStorage('weekly_reviews');
  },

  saveWeeklyReview(data) {
    const list = getStorage('weekly_reviews');
    const idx = list.findIndex(w => w.week_id === data.week_id);
    const entry = {
      id: idx >= 0 ? list[idx].id : 'wr-' + Date.now(),
      week_id: data.week_id,
      created_at: new Date().toISOString(),
      win_of_week: data.win_of_week || '',
      obstacle_of_week: data.obstacle_of_week || '',
      next_week_priority: data.next_week_priority || '',
      habits_rate: data.habits_rate || 0,
      focus_minutes: data.focus_minutes || 0,
      tasks_completed: data.tasks_completed || 0
    };
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...entry };
    } else {
      list.unshift(entry);
    }
    setStorage('weekly_reviews', list);
    return entry;
  },

  // Zerar todos os registros para começar 100% limpo para um novo usuário
  async resetAllToZero() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_PREFIX + 'is_empty_mode', 'true');
      const tables = [
        'tasks',
        'goals_2027',
        'transactions',
        'subscriptions',
        'media_catalog',
        'knowledge_hub',
        'password_vault',
        'daily_logs',
        'health_metrics',
        'weekly_reviews',
        'caixinhas'
      ];
      tables.forEach(t => {
        window.localStorage.setItem(STORAGE_PREFIX + t, JSON.stringify([]));
      });
      window.localStorage.setItem(STORAGE_PREFIX + 'custom_habits', JSON.stringify([]));
      window.localStorage.removeItem('projeto2027_scratchpad');
      window.localStorage.removeItem('nexus_jarvis_history');
      window.localStorage.removeItem('foco_pomodoro_cycles_count');
      window.localStorage.removeItem('nexus_user_custom_goals_v1');
      window.localStorage.removeItem('nexus_user_custom_goals');
      window.localStorage.removeItem('nexus_user_profile');
      window.localStorage.removeItem('projeto_onboarding_completed');
      window.localStorage.removeItem('projeto_ultra_clean');
    }

    try {
      if (typeof fetch !== 'undefined') {
        await fetch('http://localhost:3001/api/reset', { method: 'POST' });
      }
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nexus_data_updated'));
      window.dispatchEvent(new CustomEvent('nexus_xp_update'));
    }
    return true;
  },

  // Restaurar dados semente de exemplo/demonstração
  restoreDemoData() {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_PREFIX + 'is_empty_mode');
      const tables = [
        'tasks',
        'goals_2027',
        'transactions',
        'subscriptions',
        'media_catalog',
        'knowledge_hub',
        'password_vault',
        'daily_logs',
        'health_metrics',
        'weekly_reviews',
        'caixinhas'
      ];
      tables.forEach(t => {
        window.localStorage.setItem(STORAGE_PREFIX + t, JSON.stringify(INITIAL_DATA[t] || []));
      });
      window.localStorage.removeItem(STORAGE_PREFIX + 'custom_habits');
    }
  },

  // Exportação total do ecossistema para arquivo JSON snapshot
  async exportFullSystemSnapshot() {
    let serverBackup = null;
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('http://localhost:3001/api/backup');
        if (res.ok) serverBackup = await res.json();
      }
    } catch (_) {}

    const userGoals = typeof window !== 'undefined' && window.localStorage
      ? JSON.parse(window.localStorage.getItem('nexus_user_custom_goals') || '{}')
      : {};

    const snapshot = {
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      system: 'Projeto 2027 - Nexus Command Center',
      user_goals: userGoals,
      tasks: this.getTasks(),
      goals: this.getGoals(),
      daily_logs: this.getDailyLogs(),
      transactions: this.getTransactions(),
      subscriptions: this.getSubscriptions(),
      media: this.getMediaCatalog(),
      knowledge: this.getKnowledgeItems(),
      vault: this.getVaultItems(),
      health_metrics: this.getHealthMetrics(),
      caixinhas: this.getCaixinhas(),
      custom_habits: this.getCustomHabits(),
      server_snapshot: serverBackup
    };

    return snapshot;
  },

  // Restauração completa do ecossistema a partir de arquivo JSON snapshot
  async restoreFullSystemSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Formato de snapshot inválido.');
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      if (Array.isArray(snapshot.tasks)) setStorage('tasks', snapshot.tasks);
      if (Array.isArray(snapshot.goals)) setStorage('goals_2027', snapshot.goals);
      if (Array.isArray(snapshot.daily_logs)) setStorage('daily_logs', snapshot.daily_logs);
      if (Array.isArray(snapshot.transactions)) setStorage('transactions', snapshot.transactions);
      if (Array.isArray(snapshot.subscriptions)) setStorage('subscriptions', snapshot.subscriptions);
      if (Array.isArray(snapshot.media)) setStorage('media_catalog', snapshot.media);
      if (Array.isArray(snapshot.knowledge)) setStorage('knowledge_hub', snapshot.knowledge);
      if (Array.isArray(snapshot.vault)) setStorage('password_vault', snapshot.vault);
      if (Array.isArray(snapshot.health_metrics)) setStorage('health_metrics', snapshot.health_metrics);
      if (Array.isArray(snapshot.caixinhas)) setStorage('caixinhas', snapshot.caixinhas);
      if (Array.isArray(snapshot.custom_habits)) setStorage('custom_habits', snapshot.custom_habits);
      
      if (snapshot.user_goals && typeof snapshot.user_goals === 'object') {
        window.localStorage.setItem('nexus_user_custom_goals', JSON.stringify(snapshot.user_goals));
        window.dispatchEvent(new CustomEvent('nexus_user_goals_updated', { detail: snapshot.user_goals }));
      }
      window.dispatchEvent(new CustomEvent('nexus_data_updated'));
    }

    try {
      if (typeof fetch !== 'undefined') {
        await fetch('http://localhost:3001/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot)
        });
      }
    } catch (_) {}

    return true;
  }
};

// Suporte a CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { db, INITIAL_DATA };
}

