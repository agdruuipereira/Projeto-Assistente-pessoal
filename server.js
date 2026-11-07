import http from 'node:http';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'database', 'projeto2027.db');
const SCHEMA_PATH = path.join(__dirname, 'database', 'schema.sqlite.sql');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

// Auto-inicializa o schema caso o banco esteja novo/vazio
try {
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").all();
  if (tableCheck.length === 0 && fs.existsSync(SCHEMA_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);
    console.log('✅ Banco de dados inicializado com o schema padrão.');
  }
} catch (err) {
  console.error('Aviso ao checar inicialização do banco:', err.message);
}

const PORT = process.env.PORT || 3001;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // Health check
    if (pathname === '/api/health' && method === 'GET') {
      return sendJson(res, 200, {
        status: 'online',
        database: 'projeto2027.db',
        timestamp: new Date().toISOString()
      });
    }

    // Daily Logs
    if (pathname === '/api/daily-logs') {
      if (method === 'GET') {
        const date = parsedUrl.searchParams.get('date') || new Date().toISOString().split('T')[0];
        const row = db.prepare('SELECT * FROM daily_logs WHERE log_date = ?').get(date);
        return sendJson(res, 200, row || { log_date: date });
      }
      if (method === 'POST') {
        const body = await parseJsonBody(req);
        const date = body.log_date || new Date().toISOString().split('T')[0];
        
        db.prepare(`
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
            reflection_gratitude = excluded.reflection_gratitude,
            reflection_better = excluded.reflection_better,
            reflection_learning = excluded.reflection_learning,
            journal_richtext = excluded.journal_richtext
        `).run(
          date,
          body.h_sleep_8h ? 1 : 0,
          body.h_morning_routine ? 1 : 0,
          body.h_exercise_1h ? 1 : 0,
          body.h_read_30m ? 1 : 0,
          body.h_healthy_diet ? 1 : 0,
          body.h_water_2l ? 1 : 0,
          body.h_plan_tomorrow ? 1 : 0,
          body.reflection_gratitude || '',
          body.reflection_better || '',
          body.reflection_learning || '',
          body.journal_richtext || ''
        );

        const updated = db.prepare('SELECT * FROM daily_logs WHERE log_date = ?').get(date);
        return sendJson(res, 200, updated);
      }
    }

    // Tasks
    if (pathname === '/api/tasks') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO tasks (goal_id, title, due_date, status, priority, category)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING *
        `).get(
          b.goal_id || null,
          b.title,
          b.due_date || new Date().toISOString().split('T')[0],
          b.status || 'Não iniciado',
          b.priority || 'Sem prioridade',
          b.category || 'Sem grupo'
        );
        return sendJson(res, 201, result);
      }
    }

    if (pathname.startsWith('/api/tasks/')) {
      const id = pathname.split('/')[3];
      if (method === 'PATCH') {
        const b = await parseJsonBody(req);
        const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        if (!current) return sendJson(res, 404, { error: 'Task not found' });

        const updated = db.prepare(`
          UPDATE tasks SET
            status = COALESCE(?, status),
            priority = COALESCE(?, priority),
            title = COALESCE(?, title),
            category = COALESCE(?, category)
          WHERE id = ?
          RETURNING *
        `).get(b.status, b.priority, b.title, b.category, id);
        return sendJson(res, 200, updated);
      }
      if (method === 'DELETE') {
        db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
        return sendJson(res, 200, { success: true });
      }
    }

    // Goals
    if (pathname === '/api/goals') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT * FROM goals_2027').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO goals_2027 (title, theme, target_month, target_value, current_value, is_completed)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING *
        `).get(b.title, b.theme, b.target_month || 12, b.target_value || 100, b.current_value || 0, b.is_completed ? 1 : 0);
        return sendJson(res, 201, result);
      }
    }

    // Transactions
    if (pathname === '/api/transactions') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT * FROM transactions ORDER BY tx_date DESC').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO transactions (title, amount, tx_date, tx_type, category, payment_status, is_recurring)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `).get(b.title, b.amount, b.tx_date || new Date().toISOString().split('T')[0], b.tx_type || 'Gasto', b.category || 'Outros', b.payment_status || 'Pago', b.is_recurring ? 1 : 0);
        return sendJson(res, 201, result);
      }
    }

    if (pathname.startsWith('/api/transactions/')) {
      const id = pathname.split('/')[3];
      if (method === 'DELETE') {
        db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
        return sendJson(res, 200, { success: true });
      }
    }

    // Subscriptions
    if (pathname === '/api/subscriptions') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT * FROM subscriptions').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO subscriptions (service_name, price, billing_cycle, start_date, next_payment_date, status)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING *
        `).get(b.service_name, b.price, b.billing_cycle || 'Mensal', b.start_date, b.next_payment_date, b.status || 'Ativa');
        return sendJson(res, 201, result);
      }
    }

    if (pathname.startsWith('/api/subscriptions/')) {
      const id = pathname.split('/')[3];
      if (method === 'DELETE') {
        db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
        return sendJson(res, 200, { success: true });
      }
    }

    if (pathname.startsWith('/api/goals/')) {
      const id = pathname.split('/')[3];
      if (method === 'DELETE') {
        db.prepare('DELETE FROM goals_2027 WHERE id = ?').run(id);
        return sendJson(res, 200, { success: true });
      }
      if (method === 'PATCH') {
        const b = await parseJsonBody(req);
        db.prepare(`
          UPDATE goals_2027 SET
            title = COALESCE(?, title),
            current_value = COALESCE(?, current_value),
            target_value = COALESCE(?, target_value),
            is_completed = COALESCE(?, is_completed)
          WHERE id = ?
        `).run(b.title, b.current_value, b.target_value, b.is_completed !== undefined ? (b.is_completed ? 1 : 0) : null, id);
        return sendJson(res, 200, { success: true });
      }
    }

    // Media
    if (pathname === '/api/media') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT * FROM media_catalog').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO media_catalog (media_type, title, creator, genre, cover_url, status, rating, current_page, total_pages, is_favorite)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING *
        `).get(b.media_type, b.title, b.creator || '', b.genre || '', b.cover_url || '', b.status || 'Quero ler/ver', b.rating || 0, b.current_page || 0, b.total_pages || 0, b.is_favorite ? 1 : 0);
        return sendJson(res, 201, result);
      }
    }

    // Knowledge
    if (pathname === '/api/knowledge') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT * FROM knowledge_hub ORDER BY created_at DESC').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO knowledge_hub (item_type, category, title, content_or_url, is_favorite)
          VALUES (?, ?, ?, ?, ?)
          RETURNING *
        `).get(b.item_type || 'Caderno', b.category || 'Geral', b.title, b.content_or_url || '', b.is_favorite ? 1 : 0);
        return sendJson(res, 201, result);
      }
    }

    if (pathname.startsWith('/api/knowledge/')) {
      const id = pathname.split('/')[3];
      if (method === 'DELETE') {
        db.prepare('DELETE FROM knowledge_hub WHERE id = ?').run(id);
        return sendJson(res, 200, { success: true });
      }
    }

    // Vault
    if (pathname === '/api/vault') {
      if (method === 'GET') {
        const rows = db.prepare('SELECT id, service_name, login_identifier, encrypted_cipher, iv_vector, salt, created_at FROM password_vault ORDER BY created_at DESC').all();
        return sendJson(res, 200, rows);
      }
      if (method === 'POST') {
        const b = await parseJsonBody(req);
        const result = db.prepare(`
          INSERT INTO password_vault (service_name, login_identifier, encrypted_cipher, iv_vector, salt)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, service_name, login_identifier, encrypted_cipher, iv_vector, salt, created_at
        `).get(b.service_name, b.login_identifier, b.encrypted_cipher, b.iv_vector, b.salt);
        return sendJson(res, 201, result);
      }
    }

    if (pathname.startsWith('/api/vault/')) {
      const id = pathname.split('/')[3];
      if (method === 'DELETE') {
        db.prepare('DELETE FROM password_vault WHERE id = ?').run(id);
        return sendJson(res, 200, { success: true });
      }
    }

    // Full Database Backup Endpoint
    if (pathname === '/api/backup' && method === 'GET') {
      const backup = {
        timestamp: new Date().toISOString(),
        database: 'projeto2027.db',
        daily_logs: db.prepare('SELECT * FROM daily_logs').all(),
        goals: db.prepare('SELECT * FROM goals_2027').all(),
        tasks: db.prepare('SELECT * FROM tasks').all(),
        transactions: db.prepare('SELECT * FROM transactions').all(),
        subscriptions: db.prepare('SELECT * FROM subscriptions').all(),
        media: db.prepare('SELECT * FROM media_catalog').all(),
        knowledge: db.prepare('SELECT * FROM knowledge_hub').all(),
        vault: db.prepare('SELECT id, service_name, login_identifier, encrypted_cipher, iv_vector, salt, created_at FROM password_vault').all()
      };
      return sendJson(res, 200, backup);
    }

    // Full Database Restore Endpoint
    if (pathname === '/api/restore' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body || typeof body !== 'object') {
        return sendJson(res, 400, { error: 'Payload de restauração inválido.' });
      }

      if (Array.isArray(body.daily_logs)) {
        db.prepare('DELETE FROM daily_logs').run();
        const insertLog = db.prepare(`
          INSERT INTO daily_logs (log_date, h_sleep_8h, h_morning_routine, h_exercise_1h, h_read_30m, h_healthy_diet, h_water_2l, h_plan_tomorrow, sleep_hours, water_liters, workout_duration_min, workout_type, daily_weight_kg, reflection_gratitude, reflection_better, reflection_learning, journal_richtext)
          VALUES (@log_date, @h_sleep_8h, @h_morning_routine, @h_exercise_1h, @h_read_30m, @h_healthy_diet, @h_water_2l, @h_plan_tomorrow, @sleep_hours, @water_liters, @workout_duration_min, @workout_type, @daily_weight_kg, @reflection_gratitude, @reflection_better, @reflection_learning, @journal_richtext)
        `);
        for (const log of body.daily_logs) {
          insertLog.run({
            log_date: log.log_date,
            h_sleep_8h: log.h_sleep_8h ? 1 : 0,
            h_morning_routine: log.h_morning_routine ? 1 : 0,
            h_exercise_1h: log.h_exercise_1h ? 1 : 0,
            h_read_30m: log.h_read_30m ? 1 : 0,
            h_healthy_diet: log.h_healthy_diet ? 1 : 0,
            h_water_2l: log.h_water_2l ? 1 : 0,
            h_plan_tomorrow: log.h_plan_tomorrow ? 1 : 0,
            sleep_hours: log.sleep_hours || 0,
            water_liters: log.water_liters || 0,
            workout_duration_min: log.workout_duration_min || 0,
            workout_type: log.workout_type || '',
            daily_weight_kg: log.daily_weight_kg || 0,
            reflection_gratitude: log.reflection_gratitude || '',
            reflection_better: log.reflection_better || '',
            reflection_learning: log.reflection_learning || '',
            journal_richtext: log.journal_richtext || ''
          });
        }
      }

      if (Array.isArray(body.goals)) {
        db.prepare('DELETE FROM goals_2027').run();
        const insertGoal = db.prepare(`
          INSERT INTO goals_2027 (id, title, theme, target_month, target_value, current_value, is_completed)
          VALUES (@id, @title, @theme, @target_month, @target_value, @current_value, @is_completed)
        `);
        for (const g of body.goals) {
          insertGoal.run({
            id: g.id || 'g-' + Date.now() + Math.random(),
            title: g.title,
            theme: g.theme || 'Geral',
            target_month: g.target_month || 12,
            target_value: g.target_value || 100,
            current_value: g.current_value || 0,
            is_completed: g.is_completed ? 1 : 0
          });
        }
      }

      if (Array.isArray(body.tasks)) {
        db.prepare('DELETE FROM tasks').run();
        const insertTask = db.prepare(`
          INSERT INTO tasks (id, title, category, priority, status, due_date)
          VALUES (@id, @title, @category, @priority, @status, @due_date)
        `);
        for (const t of body.tasks) {
          insertTask.run({
            id: t.id || 't-' + Date.now() + Math.random(),
            title: t.title,
            category: t.category || 'Trabalho',
            priority: t.priority || 'Média',
            status: t.status || 'A Fazer',
            due_date: t.due_date || new Date().toISOString().split('T')[0]
          });
        }
      }

      if (Array.isArray(body.transactions)) {
        db.prepare('DELETE FROM transactions').run();
        const insertTx = db.prepare(`
          INSERT INTO transactions (id, title, amount, tx_type, category, tx_date, payment_status)
          VALUES (@id, @title, @amount, @tx_type, @category, @tx_date, @payment_status)
        `);
        for (const tx of body.transactions) {
          insertTx.run({
            id: tx.id || 'tx-' + Date.now() + Math.random(),
            title: tx.title,
            amount: Number(tx.amount) || 0,
            tx_type: tx.tx_type || 'Gasto',
            category: tx.category || 'Geral',
            tx_date: tx.tx_date || new Date().toISOString().split('T')[0],
            payment_status: tx.payment_status || 'Pago'
          });
        }
      }

      if (Array.isArray(body.subscriptions)) {
        db.prepare('DELETE FROM subscriptions').run();
        const insertSub = db.prepare(`
          INSERT INTO subscriptions (id, service_name, price, billing_cycle, start_date, next_payment_date, status)
          VALUES (@id, @service_name, @price, @billing_cycle, @start_date, @next_payment_date, @status)
        `);
        for (const s of body.subscriptions) {
          insertSub.run({
            id: s.id || 'sub-' + Date.now() + Math.random(),
            service_name: s.service_name,
            price: Number(s.price) || 0,
            billing_cycle: s.billing_cycle || 'Mensal',
            start_date: s.start_date || new Date().toISOString().split('T')[0],
            next_payment_date: s.next_payment_date || new Date().toISOString().split('T')[0],
            status: s.status || 'Ativa'
          });
        }
      }

      if (Array.isArray(body.media)) {
        db.prepare('DELETE FROM media_catalog').run();
        const insertMedia = db.prepare(`
          INSERT INTO media_catalog (id, title, media_type, status, rating, genre, notes)
          VALUES (@id, @title, @media_type, @status, @rating, @genre, @notes)
        `);
        for (const m of body.media) {
          insertMedia.run({
            id: m.id || 'm-' + Date.now() + Math.random(),
            title: m.title,
            media_type: m.media_type || 'Livro',
            status: m.status || 'Quero Ler',
            rating: Number(m.rating) || 0,
            genre: m.genre || '',
            notes: m.notes || ''
          });
        }
      }

      if (Array.isArray(body.knowledge)) {
        db.prepare('DELETE FROM knowledge_hub').run();
        const insertK = db.prepare(`
          INSERT INTO knowledge_hub (id, item_type, category, title, content_or_url, is_favorite)
          VALUES (@id, @item_type, @category, @title, @content_or_url, @is_favorite)
        `);
        for (const k of body.knowledge) {
          insertK.run({
            id: k.id || 'k-' + Date.now() + Math.random(),
            item_type: k.item_type || 'Caderno',
            category: k.category || 'Geral',
            title: k.title,
            content_or_url: k.content_or_url || '',
            is_favorite: k.is_favorite ? 1 : 0
          });
        }
      }

      if (Array.isArray(body.vault)) {
        db.prepare('DELETE FROM password_vault').run();
        const insertV = db.prepare(`
          INSERT INTO password_vault (id, service_name, login_identifier, encrypted_cipher, iv_vector, salt)
          VALUES (@id, @service_name, @login_identifier, @encrypted_cipher, @iv_vector, @salt)
        `);
        for (const v of body.vault) {
          insertV.run({
            id: v.id || 'v-' + Date.now() + Math.random(),
            service_name: v.service_name,
            login_identifier: v.login_identifier || '',
            encrypted_cipher: v.encrypted_cipher,
            iv_vector: v.iv_vector,
            salt: v.salt
          });
        }
      }

      return sendJson(res, 200, { success: true, message: 'Ecossistema restaurado com sucesso.' });
    }

    // Reset Database to Empty State (Novo Usuário)
    if (pathname === '/api/reset' && method === 'POST') {
      db.prepare('DELETE FROM daily_logs').run();
      db.prepare('DELETE FROM goals_2027').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM transactions').run();
      db.prepare('DELETE FROM subscriptions').run();
      db.prepare('DELETE FROM media_catalog').run();
      db.prepare('DELETE FROM knowledge_hub').run();
      db.prepare('DELETE FROM password_vault').run();
      return sendJson(res, 200, { success: true, message: 'Banco SQLite 100% zerado para novo usuário.' });
    }

    sendJson(res, 404, { error: 'Endpoint not found', path: pathname });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[Projeto 2027 API] Servidor rodando em http://localhost:${PORT}`);
  console.log(`[SQLite Database] Conectado a ${DB_PATH}`);
});

