import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'projeto2027.db');
const schemaPath = path.join(__dirname, 'schema.sqlite.sql');

// Se o arquivo do banco já existir, remove para recriar a estrutura atualizada
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

console.log('Criando banco de dados SQLite em:', dbPath);
const db = new DatabaseSync(dbPath);

const sql = fs.readFileSync(schemaPath, 'utf8');
db.exec(sql);

console.log('Tabelas e índices criados com sucesso!');

// Listar todas as tabelas criadas
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
console.log('\nTabelas no banco de dados:');
tables.forEach((t, i) => {
  const count = db.prepare(`SELECT COUNT(*) as total FROM "${t.name}"`).get();
  console.log(`  ${i + 1}. ${t.name} (registros: ${count.total})`);
});

// Listar índices
const indexes = db.prepare("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name").all();
console.log('\nÍndices criados:');
indexes.forEach((idx) => {
  console.log(`  - ${idx.name} na tabela ${idx.tbl_name}`);
});

// Teste de integridade e inserção de tarefa futura (sem registro em daily_logs)
console.log('\nExecutando testes...');
db.exec(`
  -- 1. Inserir log diário e meta
  INSERT INTO daily_logs (log_date, h_sleep_8h, h_exercise_1h, h_read_30m, reflection_gratitude)
  VALUES ('2027-01-01', 1, 1, 1, 'Primeiro dia do Projeto 2027!');

  INSERT INTO goals_2027 (title, theme, target_month, target_value)
  VALUES ('Meta Exemplo 2027', 'Profissional', 12, 100);

  -- 2. Inserir tarefa para data FUTURA (2027-02-15) que NÃO existe em daily_logs
  INSERT INTO tasks (title, due_date, priority, category)
  VALUES ('Entrega do Módulo 1', '2027-02-15', 'Alta', 'Trabalho');
`);

const log = db.prepare("SELECT log_date, habits_score, reflection_gratitude FROM daily_logs WHERE log_date = '2027-01-01'").get();
const goal = db.prepare("SELECT id, title, theme, target_value FROM goals_2027 WHERE title = 'Meta Exemplo 2027'").get();
const task = db.prepare(`
  SELECT t.id, t.title, t.due_date, t.priority, dl.habits_score 
  FROM tasks t 
  LEFT JOIN daily_logs dl ON t.due_date = dl.log_date 
  WHERE t.due_date = '2027-02-15'
`).get();

console.log('Teste daily_logs (habits_score calculado):', log);
console.log('Teste goals_2027 (UUID gerado):', goal);
console.log('Teste task com data futura (sem FK bloqueante):', task);

// Limpar dados de teste
db.exec("DELETE FROM tasks WHERE due_date = '2027-02-15'");
db.exec("DELETE FROM goals_2027 WHERE title = 'Meta Exemplo 2027'");
db.exec("DELETE FROM daily_logs WHERE log_date = '2027-01-01'");
console.log('\nDados de teste limpos. Banco de dados pronto para uso!');

db.close();
