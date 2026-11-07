-- =======================================================
-- PROJETO 2027 - SQLITE COMPATIBLE SCHEMA
-- =======================================================

PRAGMA foreign_keys = ON;

-- 1. Tabela Central: Hábitos (item 2) e Diário/Reflexões (item 8)
CREATE TABLE IF NOT EXISTS daily_logs (
    log_date TEXT PRIMARY KEY DEFAULT (CURRENT_DATE),
    h_sleep_8h INTEGER DEFAULT 0 CHECK (h_sleep_8h IN (0, 1)),
    h_morning_routine INTEGER DEFAULT 0 CHECK (h_morning_routine IN (0, 1)),
    h_exercise_1h INTEGER DEFAULT 0 CHECK (h_exercise_1h IN (0, 1)),
    h_read_30m INTEGER DEFAULT 0 CHECK (h_read_30m IN (0, 1)),
    h_healthy_diet INTEGER DEFAULT 0 CHECK (h_healthy_diet IN (0, 1)),
    h_water_2l INTEGER DEFAULT 0 CHECK (h_water_2l IN (0, 1)),
    h_plan_tomorrow INTEGER DEFAULT 0 CHECK (h_plan_tomorrow IN (0, 1)),
    habits_score INTEGER GENERATED ALWAYS AS (
        (CASE WHEN h_sleep_8h = 1 THEN 1 ELSE 0 END) +
        (CASE WHEN h_morning_routine = 1 THEN 1 ELSE 0 END) +
        (CASE WHEN h_exercise_1h = 1 THEN 1 ELSE 0 END) +
        (CASE WHEN h_read_30m = 1 THEN 1 ELSE 0 END) +
        (CASE WHEN h_healthy_diet = 1 THEN 1 ELSE 0 END) +
        (CASE WHEN h_water_2l = 1 THEN 1 ELSE 0 END) +
        (CASE WHEN h_plan_tomorrow = 1 THEN 1 ELSE 0 END)
    ) STORED,
    reflection_gratitude TEXT,
    reflection_better TEXT,
    reflection_learning TEXT,
    journal_richtext TEXT,
    daily_photo TEXT
);

-- Macro/expressão para UUID v4 em SQLite
-- lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))

-- 2. Metas e Objetivos 2027 (item 3)
CREATE TABLE IF NOT EXISTS goals_2027 (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    title TEXT NOT NULL,
    theme TEXT CHECK (theme IN ('Profissional', 'Financeiro', 'Intelectual', 'Saúde e Bem-estar', 'Relacionamentos')),
    category TEXT DEFAULT 'Profissional',
    target_year INTEGER DEFAULT 2027,
    target_month INTEGER CHECK (target_month BETWEEN 1 AND 12),
    target_value INTEGER DEFAULT 100,
    current_value INTEGER DEFAULT 0,
    cover_image TEXT,
    is_completed INTEGER DEFAULT 0 CHECK (is_completed IN (0, 1))
);

-- 3. Planejamento Diário e Tarefas (item 1) conectadas às Metas
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    goal_id TEXT REFERENCES goals_2027(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    due_date TEXT,
    status TEXT DEFAULT 'Não iniciado' CHECK (status IN ('Não iniciado', 'Iniciado', 'Feito')),
    priority TEXT DEFAULT 'Sem prioridade' CHECK (priority IN ('Alta', 'Média', 'Baixa', 'Sem prioridade')),
    category TEXT DEFAULT 'Sem grupo' CHECK (category IN ('Pessoal', 'Trabalho', 'Saúde', 'Financeiro', 'Espiritual', 'Relacionamento', 'Sem grupo')),
    created_at TEXT DEFAULT (DATETIME('now', 'localtime'))
);

-- Índices para otimização de consultas e cruzamentos por data e meta
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);

-- 4. Controle Financeiro e Assinaturas (item 4)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    title TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    tx_date TEXT NOT NULL,
    tx_type TEXT CHECK (tx_type IN ('Receita', 'Gasto')),
    category TEXT NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('Pago', 'Não Pago', 'Agendado', 'Futuro')),
    is_recurring INTEGER DEFAULT 0 CHECK (is_recurring IN (0, 1))
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    service_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    billing_cycle TEXT CHECK (billing_cycle IN ('Mensal', 'Trimestral', 'Anual')),
    start_date TEXT NOT NULL,
    next_payment_date TEXT NOT NULL,
    status TEXT CHECK (status IN ('Ativa', 'Cancelada'))
);

-- 5. Leitura e Cinema (item 5)
CREATE TABLE IF NOT EXISTS media_catalog (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    media_type TEXT CHECK (media_type IN ('Livro', 'Filme', 'Série')),
    title TEXT NOT NULL,
    creator TEXT,
    genre TEXT,
    cover_url TEXT,
    cover_image TEXT,
    status TEXT CHECK (status IN ('Lista de Desejos', 'Não assistido', 'Em leitura', 'Assistindo', 'Lido', 'Assistido')),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    current_page INTEGER DEFAULT 0,
    total_pages INTEGER DEFAULT 1,
    completed_at TEXT,
    is_favorite INTEGER DEFAULT 0 CHECK (is_favorite IN (0, 1))
);

-- 6. Cadernos, Links e Cofre Criptografado (item 6)
CREATE TABLE IF NOT EXISTS knowledge_hub (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    item_type TEXT CHECK (item_type IN ('Caderno', 'Link')),
    category TEXT CHECK (category IN ('Pessoal', 'Estudo', 'Resumos', 'Ideias', 'Negócios')),
    title TEXT NOT NULL,
    content_or_url TEXT NOT NULL,
    is_favorite INTEGER DEFAULT 0 CHECK (is_favorite IN (0, 1))
);

CREATE TABLE IF NOT EXISTS password_vault (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    service_name TEXT NOT NULL,
    login_identifier TEXT,
    encrypted_cipher TEXT NOT NULL,
    iv_vector TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 7. Saúde Física e Bio-Métricas
CREATE TABLE IF NOT EXISTS health_metrics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    metric_date TEXT NOT NULL,
    weight_kg NUMERIC(5,2),
    sleep_hours NUMERIC(4,2),
    water_ml INTEGER,
    workout_type TEXT,
    workout_duration_min INTEGER,
    notes TEXT,
    created_at TEXT DEFAULT (DATETIME('now', 'localtime'))
);

-- 8. Retrospectivas Semanais
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    week_start TEXT NOT NULL,
    tasks_completed INTEGER DEFAULT 0,
    habit_consistency_pct INTEGER DEFAULT 0,
    wins_summary TEXT,
    learnings_summary TEXT,
    focus_next_week TEXT,
    created_at TEXT DEFAULT (DATETIME('now', 'localtime'))
);

