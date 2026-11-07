/**
 * src/services/dbService.js
 * Camada de Acesso a Dados (DAO / Repository) para o Projeto 2027
 * Executa operações CRUD completas no banco de dados SQLite local (projeto2027.db)
 * Utiliza o módulo nativo node:sqlite do Node.js (sem dependências externas)
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const DB_PATH = path.resolve(__dirname, '../../projeto2027.db');

class DatabaseService {
  constructor(dbPath = DB_PATH) {
    this.db = new DatabaseSync(dbPath);
    // Habilita chaves estrangeiras
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  // ==========================================
  // 1. DAILY LOGS & HÁBITOS
  // ==========================================

  getDailyLog(logDate) {
    const stmt = this.db.prepare('SELECT * FROM daily_logs WHERE log_date = ?');
    return stmt.get(logDate);
  }

  getTodayLog() {
    const today = new Date().toISOString().split('T')[0];
    return this.getDailyLog(today);
  }

  getRecentLogs(limit = 30) {
    const stmt = this.db.prepare('SELECT * FROM daily_logs ORDER BY log_date DESC LIMIT ?');
    return stmt.all(limit);
  }

  upsertDailyLog(log) {
    const logDate = log.log_date || new Date().toISOString().split('T')[0];
    const stmt = this.db.prepare(`
      INSERT INTO daily_logs (
        log_date, h_sleep_8h, h_morning_routine, h_exercise_1h,
        h_read_30m, h_healthy_diet, h_water_2l, h_plan_tomorrow,
        reflection_gratitude, reflection_better, reflection_learning, journal_richtext
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(log_date) DO UPDATE SET
        h_sleep_8h = excluded.h_sleep_8h,
        h_morning_routine = excluded.h_morning_routine,
        h_exercise_1h = excluded.h_exercise_1h,
        h_read_30m = excluded.h_read_30m,
        h_healthy_diet = excluded.h_healthy_diet,
        h_water_2l = excluded.h_water_2l,
        h_plan_tomorrow = excluded.h_plan_tomorrow,
        reflection_gratitude = COALESCE(excluded.reflection_gratitude, daily_logs.reflection_gratitude),
        reflection_better = COALESCE(excluded.reflection_better, daily_logs.reflection_better),
        reflection_learning = COALESCE(excluded.reflection_learning, daily_logs.reflection_learning),
        journal_richtext = COALESCE(excluded.journal_richtext, daily_logs.journal_richtext)
    `);

    stmt.run(
      logDate,
      log.h_sleep_8h ? 1 : 0,
      log.h_morning_routine ? 1 : 0,
      log.h_exercise_1h ? 1 : 0,
      log.h_read_30m ? 1 : 0,
      log.h_healthy_diet ? 1 : 0,
      log.h_water_2l ? 1 : 0,
      log.h_plan_tomorrow ? 1 : 0,
      log.reflection_gratitude || null,
      log.reflection_better || null,
      log.reflection_learning || null,
      log.journal_richtext || null
    );

    return this.getDailyLog(logDate);
  }

  // ==========================================
  // 2. METAS 2027 (GOALS)
  // ==========================================

  getAllGoals() {
    const stmt = this.db.prepare('SELECT * FROM goals_2027 ORDER BY target_month ASC, title ASC');
    return stmt.all();
  }

  getGoalsByTheme(theme) {
    const stmt = this.db.prepare('SELECT * FROM goals_2027 WHERE theme = ? ORDER BY target_month ASC');
    return stmt.all(theme);
  }

  getGoalById(id) {
    const stmt = this.db.prepare('SELECT * FROM goals_2027 WHERE id = ?');
    return stmt.get(id);
  }

  createGoal(goal) {
    const stmt = this.db.prepare(`
      INSERT INTO goals_2027 (title, theme, target_month, target_value, current_value, is_completed)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      goal.title,
      goal.theme,
      goal.target_month || 12,
      goal.target_value || 100,
      goal.current_value || 0,
      goal.is_completed ? 1 : 0
    );
  }

  updateGoalProgress(id, currentValue, isCompleted = null) {
    const completedVal = isCompleted !== null ? (isCompleted ? 1 : 0) : null;
    let query, params;

    if (completedVal !== null) {
      query = 'UPDATE goals_2027 SET current_value = ?, is_completed = ? WHERE id = ? RETURNING *';
      params = [currentValue, completedVal, id];
    } else {
      query = 'UPDATE goals_2027 SET current_value = ? WHERE id = ? RETURNING *';
      params = [currentValue, id];
    }

    const stmt = this.db.prepare(query);
    return stmt.get(...params);
  }

  deleteGoal(id) {
    const stmt = this.db.prepare('DELETE FROM goals_2027 WHERE id = ?');
    stmt.run(id);
    return { success: true, deletedId: id };
  }

  // ==========================================
  // 3. TAREFAS (TASKS)
  // ==========================================

  getAllTasks() {
    const stmt = this.db.prepare(`
      SELECT t.*, g.title as goal_title, g.theme as goal_theme 
      FROM tasks t 
      LEFT JOIN goals_2027 g ON t.goal_id = g.id 
      ORDER BY t.due_date ASC, t.created_at DESC
    `);
    return stmt.all();
  }

  getTasksByDate(dueDate) {
    const stmt = this.db.prepare(`
      SELECT t.*, g.title as goal_title 
      FROM tasks t 
      LEFT JOIN goals_2027 g ON t.goal_id = g.id 
      WHERE t.due_date = ? 
      ORDER BY 
        CASE t.priority 
          WHEN 'Alta' THEN 1 
          WHEN 'Média' THEN 2 
          WHEN 'Baixa' THEN 3 
          ELSE 4 
        END
    `);
    return stmt.all(dueDate);
  }

  getTasksByGoal(goalId) {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE goal_id = ? ORDER BY due_date ASC');
    return stmt.all(goalId);
  }

  createTask(task) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (goal_id, title, due_date, status, priority, category)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      task.goal_id || null,
      task.title,
      task.due_date || null,
      task.status || 'Não iniciado',
      task.priority || 'Sem prioridade',
      task.category || 'Sem grupo'
    );
  }

  updateTaskStatus(id, status) {
    const stmt = this.db.prepare('UPDATE tasks SET status = ? WHERE id = ? RETURNING *');
    return stmt.get(status, id);
  }

  deleteTask(id) {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(id);
    return { success: true, deletedId: id };
  }

  // ==========================================
  // 4. TRANSAÇÕES FINANCEIRAS & ASSINATURAS
  // ==========================================

  getTransactions(limit = 100) {
    const stmt = this.db.prepare('SELECT * FROM transactions ORDER BY tx_date DESC LIMIT ?');
    return stmt.all(limit);
  }

  createTransaction(tx) {
    const stmt = this.db.prepare(`
      INSERT INTO transactions (title, amount, tx_date, tx_type, category, payment_status, is_recurring)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      tx.title,
      Number(tx.amount),
      tx.tx_date || new Date().toISOString().split('T')[0],
      tx.tx_type,
      tx.category,
      tx.payment_status || 'Pago',
      tx.is_recurring ? 1 : 0
    );
  }

  getAllSubscriptions() {
    const stmt = this.db.prepare('SELECT * FROM subscriptions ORDER BY status ASC, next_payment_date ASC');
    return stmt.all();
  }

  createSubscription(sub) {
    const stmt = this.db.prepare(`
      INSERT INTO subscriptions (service_name, price, billing_cycle, start_date, next_payment_date, status)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      sub.service_name,
      Number(sub.price),
      sub.billing_cycle || 'Mensal',
      sub.start_date || new Date().toISOString().split('T')[0],
      sub.next_payment_date,
      sub.status || 'Ativa'
    );
  }

  // ==========================================
  // 5. CATÁLOGO DE MÍDIA (LIVROS, FILMES, SÉRIES)
  // ==========================================

  getMediaCatalog(mediaType = null) {
    if (mediaType) {
      const stmt = this.db.prepare('SELECT * FROM media_catalog WHERE media_type = ? ORDER BY is_favorite DESC, title ASC');
      return stmt.all(mediaType);
    }
    const stmt = this.db.prepare('SELECT * FROM media_catalog ORDER BY media_type ASC, is_favorite DESC, title ASC');
    return stmt.all();
  }

  createMedia(item) {
    const stmt = this.db.prepare(`
      INSERT INTO media_catalog (media_type, title, creator, genre, cover_url, status, rating, current_page, total_pages, completed_at, is_favorite)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      item.media_type,
      item.title,
      item.creator || null,
      item.genre || null,
      item.cover_url || null,
      item.status || 'Lista de Desejos',
      item.rating || null,
      item.current_page || 0,
      item.total_pages || 1,
      item.completed_at || null,
      item.is_favorite ? 1 : 0
    );
  }

  updateMediaProgress(id, currentPage, status = null) {
    let stmt;
    if (status) {
      stmt = this.db.prepare('UPDATE media_catalog SET current_page = ?, status = ? WHERE id = ? RETURNING *');
      return stmt.get(currentPage, status, id);
    }
    stmt = this.db.prepare('UPDATE media_catalog SET current_page = ? WHERE id = ? RETURNING *');
    return stmt.get(currentPage, id);
  }

  // ==========================================
  // 6. KNOWLEDGE HUB & PASSWORD VAULT
  // ==========================================

  getKnowledgeItems(category = null) {
    if (category) {
      const stmt = this.db.prepare('SELECT * FROM knowledge_hub WHERE category = ? ORDER BY is_favorite DESC, title ASC');
      return stmt.all(category);
    }
    const stmt = this.db.prepare('SELECT * FROM knowledge_hub ORDER BY is_favorite DESC, title ASC');
    return stmt.all();
  }

  createKnowledgeItem(item) {
    const stmt = this.db.prepare(`
      INSERT INTO knowledge_hub (item_type, category, title, content_or_url, is_favorite)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      item.item_type || 'Caderno',
      item.category || 'Ideias',
      item.title,
      item.content_or_url,
      item.is_favorite ? 1 : 0
    );
  }

  getVaultItems() {
    const stmt = this.db.prepare('SELECT id, service_name, login_identifier, encrypted_cipher, iv_vector, salt FROM password_vault ORDER BY service_name ASC');
    return stmt.all();
  }

  createVaultItem(entry) {
    const stmt = this.db.prepare(`
      INSERT INTO password_vault (service_name, login_identifier, encrypted_cipher, iv_vector, salt)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `);
    return stmt.get(
      entry.service_name,
      entry.login_identifier || null,
      entry.encrypted_cipher,
      entry.iv_vector,
      entry.salt
    );
  }

  deleteVaultItem(id) {
    const stmt = this.db.prepare('DELETE FROM password_vault WHERE id = ?');
    stmt.run(id);
    return { success: true, deletedId: id };
  }

  close() {
    this.db.close();
  }
}

// Singleton para fácil importação no backend
const dbService = new DatabaseService();

module.exports = {
  DatabaseService,
  dbService
};

