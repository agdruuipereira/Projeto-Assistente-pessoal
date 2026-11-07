-- =======================================================
-- PROJETO 2027 - POSTGRESQL SCHEMA (ORIGINAL)
-- =======================================================

-- 1. Tabela Central: Hábitos (item 2) e Diário/Reflexões (item 8)
CREATE TABLE IF NOT EXISTS daily_logs (
    log_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    h_sleep_8h BOOLEAN DEFAULT FALSE,
    h_morning_routine BOOLEAN DEFAULT FALSE,
    h_exercise_1h BOOLEAN DEFAULT FALSE,
    h_read_30m BOOLEAN DEFAULT FALSE,
    h_healthy_diet BOOLEAN DEFAULT FALSE,
    h_water_2l BOOLEAN DEFAULT FALSE,
    h_plan_tomorrow BOOLEAN DEFAULT FALSE,
    habits_score INT GENERATED ALWAYS AS (
        (CASE WHEN h_sleep_8h THEN 1 ELSE 0 END) +
        (CASE WHEN h_morning_routine THEN 1 ELSE 0 END) +
        (CASE WHEN h_exercise_1h THEN 1 ELSE 0 END) +
        (CASE WHEN h_read_30m THEN 1 ELSE 0 END) +
        (CASE WHEN h_healthy_diet THEN 1 ELSE 0 END) +
        (CASE WHEN h_water_2l THEN 1 ELSE 0 END) +
        (CASE WHEN h_plan_tomorrow THEN 1 ELSE 0 END)
    ) STORED,
    reflection_gratitude TEXT,
    reflection_better TEXT,
    reflection_learning TEXT,
    journal_richtext TEXT
);

-- 2. Metas e Objetivos 2027 (item 3)
CREATE TABLE IF NOT EXISTS goals_2027 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    theme VARCHAR(50) CHECK (theme IN ('Profissional', 'Financeiro', 'Intelectual', 'Saúde e Bem-estar', 'Relacionamentos')),
    target_month INT CHECK (target_month BETWEEN 1 AND 12),
    target_value INT DEFAULT 100,
    current_value INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE
);

-- 3. Planejamento Diário e Tarefas (item 1) conectadas às Metas
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES goals_2027(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    due_date DATE,
    status VARCHAR(30) DEFAULT 'Não iniciado' CHECK (status IN ('Não iniciado', 'Iniciado', 'Feito')),
    priority VARCHAR(30) DEFAULT 'Sem prioridade' CHECK (priority IN ('Alta', 'Média', 'Baixa', 'Sem prioridade')),
    category VARCHAR(40) DEFAULT 'Sem grupo' CHECK (category IN ('Pessoal', 'Trabalho', 'Saúde', 'Financeiro', 'Espiritual', 'Relacionamento', 'Sem grupo')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização de consultas e cruzamentos
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);

-- 4. Controle Financeiro e Assinaturas (item 4)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    tx_date DATE NOT NULL,
    tx_type VARCHAR(20) CHECK (tx_type IN ('Receita', 'Gasto')),
    category VARCHAR(50) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('Pago', 'Não Pago', 'Agendado', 'Futuro')),
    is_recurring BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('Mensal', 'Trimestral', 'Anual')),
    start_date DATE NOT NULL,
    next_payment_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Ativa', 'Cancelada'))
);

-- 5. Leitura e Cinema (item 5)
CREATE TABLE IF NOT EXISTS media_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    media_type VARCHAR(20) CHECK (media_type IN ('Livro', 'Filme', 'Série')),
    title VARCHAR(200) NOT NULL,
    creator VARCHAR(150),
    genre VARCHAR(50),
    cover_url TEXT,
    status VARCHAR(30) CHECK (status IN ('Lista de Desejos', 'Não assistido', 'Em leitura', 'Assistindo', 'Lido', 'Assistido')),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    current_page INT DEFAULT 0,
    total_pages INT DEFAULT 1,
    completed_at DATE,
    is_favorite BOOLEAN DEFAULT FALSE
);

-- 6. Cadernos, Links e Cofre Criptografado (item 6)
CREATE TABLE IF NOT EXISTS knowledge_hub (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(20) CHECK (item_type IN ('Caderno', 'Link')),
    category VARCHAR(50) CHECK (category IN ('Pessoal', 'Estudo', 'Resumos', 'Ideias', 'Negócios')),
    title VARCHAR(200) NOT NULL,
    content_or_url TEXT NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS password_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    login_identifier VARCHAR(150),
    encrypted_cipher TEXT NOT NULL,
    iv_vector TEXT NOT NULL,
    salt TEXT NOT NULL
);

